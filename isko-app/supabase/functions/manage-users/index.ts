import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

import { corsHeaders } from "../_shared/cors.ts"

const ACTIVE_STATUS = "active"
const ARCHIVED_STATUS = "archived"
const DEFAULT_ROLE = "user"
const SUPERADMIN_ROLE = "superadmin"
const ARCHIVE_BAN_DURATION = "876000h"
const PROFILE_FIELDS =
  "id, email, full_name, role, status, archived_at, created_at, updated_at"

type Role = typeof DEFAULT_ROLE | typeof SUPERADMIN_ROLE
type Status = typeof ACTIVE_STATUS | typeof ARCHIVED_STATUS

type CreatePayload = {
  email?: string
  fullName?: string
  password?: string
  role?: Role
  status?: Status
}

type UpdatePayload = {
  userId?: string
  email?: string
  fullName?: string
  role?: Role
  status?: Status
}

type UserMutationPayload = {
  userId?: string
}

type ActionRequest =
  | ({ action?: "create" } & CreatePayload)
  | ({ action?: "update" } & UpdatePayload)
  | ({ action?: "archive" | "restore" | "delete" } & UserMutationPayload)

type ProfileRecord = {
  id: string
  email: string
  full_name: string
  role: Role
  status: Status
  archived_at: string | null
  created_at: string
  updated_at: string
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function trimEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function trimName(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function validateRole(value: unknown): Role {
  if (value === DEFAULT_ROLE || value === SUPERADMIN_ROLE) {
    return value
  }

  throw new HttpError(400, "Role must be either `user` or `superadmin`.")
}

function validateStatus(value: unknown): Status {
  if (value === ACTIVE_STATUS || value === ARCHIVED_STATUS) {
    return value
  }

  throw new HttpError(400, "Status must be either `active` or `archived`.")
}

function requireUuid(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${fieldName} is required.`)
  }

  return value.trim()
}

function requireEmail(value: unknown) {
  const email = trimEmail(value)

  if (!email) {
    throw new HttpError(400, "Email is required.")
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Email address is invalid.")
  }

  if (email.length > 320) {
    throw new HttpError(400, "Email must be 320 characters or fewer.")
  }

  return email
}

function validateFullName(value: unknown) {
  const fullName = trimName(value)

  if (fullName.length > 120) {
    throw new HttpError(400, "Full name must be 120 characters or fewer.")
  }

  return fullName
}

function requirePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 8) {
    throw new HttpError(
      400,
      "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
    )
  }

  if (
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/\d/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    throw new HttpError(
      400,
      "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
    )
  }

  return value
}

function ensureArchivedUsersAreNotSuperadmins(role: Role, status: Status) {
  if (status === ARCHIVED_STATUS && role === SUPERADMIN_ROLE) {
    throw new HttpError(
      400,
      "Archived users cannot keep the superadmin role. Restore the user first or choose the `user` role.",
    )
  }
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(500, "Supabase service role credentials are missing.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

function getAccessToken(authHeader: string) {
  const [scheme, token] = authHeader.trim().split(/\s+/, 2)

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "Authorization header must be a Bearer token.")
  }

  return token
}

async function getCallerProfile(
  serviceClient: SupabaseClient,
  authHeader: string,
) {
  const token = getAccessToken(authHeader)
  const {
    data: { user },
    error: userError,
  } = await serviceClient.auth.getUser(token)

  if (userError) {
    throw new HttpError(401, userError.message)
  }

  const userId = user?.id?.trim()

  if (!userId) {
    throw new HttpError(401, "Authorization token is invalid.")
  }

  const { data: callerProfile, error: profileError } = await serviceClient
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle<ProfileRecord>()

  if (profileError) {
    throw new HttpError(500, profileError.message)
  }

  if (
    !callerProfile ||
    callerProfile.role !== SUPERADMIN_ROLE ||
    callerProfile.status !== ACTIVE_STATUS
  ) {
    throw new HttpError(403, "Only active superadmins can manage users.")
  }

  return callerProfile
}

async function getProfileById(serviceClient: SupabaseClient, userId: string) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle<ProfileRecord>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  if (!data) {
    throw new HttpError(404, "User profile was not found.")
  }

  return data
}

async function ensureNotLastActiveSuperadmin(
  serviceClient: SupabaseClient,
  targetProfile: ProfileRecord,
  nextRole: Role,
  nextStatus: Status,
) {
  const removesLastSuperadmin =
    targetProfile.role === SUPERADMIN_ROLE &&
    targetProfile.status === ACTIVE_STATUS &&
    !(nextRole === SUPERADMIN_ROLE && nextStatus === ACTIVE_STATUS)

  if (!removesLastSuperadmin) {
    return
  }

  const { count, error } = await serviceClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", SUPERADMIN_ROLE)
    .eq("status", ACTIVE_STATUS)

  if (error) {
    throw new HttpError(500, error.message)
  }

  if ((count ?? 0) <= 1) {
    throw new HttpError(
      400,
      "You cannot remove the last active superadmin from the system.",
    )
  }
}

async function updateProfileRecord(
  serviceClient: SupabaseClient,
  userId: string,
  input: {
    email: string
    fullName: string
    role: Role
    status: Status
  },
) {
  const archivedAt =
    input.status === ARCHIVED_STATUS ? new Date().toISOString() : null

  const { data, error } = await serviceClient
    .from("profiles")
    .upsert({
      id: userId,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      status: input.status,
      archived_at: archivedAt,
    }, {
      onConflict: "id",
    })
    .select(PROFILE_FIELDS)
    .single<ProfileRecord>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  return data
}

async function handleCreate(
  serviceClient: SupabaseClient,
  payload: CreatePayload,
) {
  const email = requireEmail(payload.email)
  const fullName = validateFullName(payload.fullName)
  const password = requirePassword(payload.password)
  const role = validateRole(payload.role ?? DEFAULT_ROLE)
  const status = validateStatus(payload.status ?? ACTIVE_STATUS)

  ensureArchivedUsersAreNotSuperadmins(role, status)

  const { data: createdUser, error: createError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ban_duration: status === ARCHIVED_STATUS ? ARCHIVE_BAN_DURATION : "none",
      user_metadata: fullName ? { full_name: fullName } : {},
    })

  if (createError || !createdUser.user) {
    throw new HttpError(400, createError?.message ?? "Unable to create user.")
  }

  try {
    const profile = await updateProfileRecord(serviceClient, createdUser.user.id, {
      email,
      fullName,
      role,
      status,
    })

    return jsonResponse(201, { profile })
  } catch (error) {
    await serviceClient.auth.admin.deleteUser(createdUser.user.id)
    throw error
  }
}

async function handleUpdate(
  serviceClient: SupabaseClient,
  callerProfile: ProfileRecord,
  payload: UpdatePayload,
) {
  const userId = requireUuid(payload.userId, "userId")
  const email = requireEmail(payload.email)
  const fullName = validateFullName(payload.fullName)
  const role = validateRole(payload.role)
  const status = validateStatus(payload.status)

  ensureArchivedUsersAreNotSuperadmins(role, status)

  const targetProfile = await getProfileById(serviceClient, userId)

  if (
    callerProfile.id === userId &&
    (role !== SUPERADMIN_ROLE || status !== ACTIVE_STATUS)
  ) {
    throw new HttpError(
      400,
      "You cannot demote or archive your own superadmin account.",
    )
  }

  await ensureNotLastActiveSuperadmin(serviceClient, targetProfile, role, status)

  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    userId,
    {
      email,
      ban_duration: status === ARCHIVED_STATUS ? ARCHIVE_BAN_DURATION : "none",
      user_metadata: fullName ? { full_name: fullName } : {},
    },
  )

  if (authError) {
    throw new HttpError(400, authError.message)
  }

  const profile = await updateProfileRecord(serviceClient, userId, {
    email,
    fullName,
    role,
    status,
  })

  return jsonResponse(200, { profile })
}

async function handleArchive(
  serviceClient: SupabaseClient,
  callerProfile: ProfileRecord,
  payload: UserMutationPayload,
) {
  const userId = requireUuid(payload.userId, "userId")

  if (callerProfile.id === userId) {
    throw new HttpError(400, "You cannot archive your own account.")
  }

  const targetProfile = await getProfileById(serviceClient, userId)

  await ensureNotLastActiveSuperadmin(
    serviceClient,
    targetProfile,
    DEFAULT_ROLE,
    ARCHIVED_STATUS,
  )

  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    userId,
    {
      ban_duration: ARCHIVE_BAN_DURATION,
    },
  )

  if (authError) {
    throw new HttpError(400, authError.message)
  }

  const profile = await updateProfileRecord(serviceClient, userId, {
    email: targetProfile.email,
    fullName: targetProfile.full_name,
    role: DEFAULT_ROLE,
    status: ARCHIVED_STATUS,
  })

  return jsonResponse(200, { profile })
}

async function handleRestore(
  serviceClient: SupabaseClient,
  payload: UserMutationPayload,
) {
  const userId = requireUuid(payload.userId, "userId")
  const targetProfile = await getProfileById(serviceClient, userId)
  const restoredRole = targetProfile.role === SUPERADMIN_ROLE ? DEFAULT_ROLE : targetProfile.role

  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    userId,
    {
      ban_duration: "none",
    },
  )

  if (authError) {
    throw new HttpError(400, authError.message)
  }

  const profile = await updateProfileRecord(serviceClient, userId, {
    email: targetProfile.email,
    fullName: targetProfile.full_name,
    role: restoredRole,
    status: ACTIVE_STATUS,
  })

  return jsonResponse(200, { profile })
}

async function handleDelete(
  serviceClient: SupabaseClient,
  callerProfile: ProfileRecord,
  payload: UserMutationPayload,
) {
  const userId = requireUuid(payload.userId, "userId")

  if (callerProfile.id === userId) {
    throw new HttpError(400, "You cannot permanently delete your own account.")
  }

  const targetProfile = await getProfileById(serviceClient, userId)

  await ensureNotLastActiveSuperadmin(
    serviceClient,
    targetProfile,
    DEFAULT_ROLE,
    ARCHIVED_STATUS,
  )

  const { error } = await serviceClient.auth.admin.deleteUser(userId)

  if (error) {
    throw new HttpError(400, error.message)
  }

  return jsonResponse(200, {
    deletedUserId: userId,
    deletedEmail: targetProfile.email,
  })
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." })
  }

  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      throw new HttpError(401, "Authorization header is required.")
    }

    const payload = (await request.json()) as ActionRequest
    const serviceClient = createServiceClient()
    const callerProfile = await getCallerProfile(serviceClient, authHeader)

    switch (payload.action) {
      case "create":
        return await handleCreate(serviceClient, payload)
      case "update":
        return await handleUpdate(serviceClient, callerProfile, payload)
      case "archive":
        return await handleArchive(serviceClient, callerProfile, payload)
      case "restore":
        return await handleRestore(serviceClient, payload)
      case "delete":
        return await handleDelete(serviceClient, callerProfile, payload)
      default:
        throw new HttpError(400, "Action must be one of create, update, archive, restore, or delete.")
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message })
    }

    const message = error instanceof Error ? error.message : "Unexpected server error."
    return jsonResponse(500, { error: message })
  }
})
