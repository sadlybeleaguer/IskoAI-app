import { supabase, supabaseKey, supabaseUrl } from "@/services/supabase"

const invalidRefreshTokenPattern =
  /invalid refresh token|refresh token not found/i
let refreshSessionPromise = null

async function clearLocalSupabaseSession() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut({ scope: "local" })

  if (error) {
    await supabase.auth.signOut().catch(() => undefined)
  }
}

function isAuthRetryError(message) {
  return invalidRefreshTokenPattern.test(message ?? "")
}

async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    if (isAuthRetryError(error.message)) {
      await clearLocalSupabaseSession()
      throw new Error("Your session expired. Please sign in again.")
    }

    throw new Error(error.message)
  }

  return session
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new Error("You must be signed in to manage users.")
  }

  if (!refreshSessionPromise) {
    refreshSessionPromise = supabase.auth
      .refreshSession({ refresh_token: refreshToken })
      .finally(() => {
        refreshSessionPromise = null
      })
  }

  const { data, error } = await refreshSessionPromise

  if (error) {
    if (isAuthRetryError(error.message)) {
      await clearLocalSupabaseSession()
      throw new Error("Your session expired. Please sign in again.")
    }

    throw new Error(error.message)
  }

  const nextSession = data.session

  if (!nextSession?.access_token) {
    throw new Error("You must be signed in to manage users.")
  }

  return nextSession
}

async function invokeManageUsersRequest(accessToken, payload) {
  return fetch(`${supabaseUrl}/functions/v1/manage-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function invokeManageUsers(_session, payload) {
  if (!supabaseUrl || !supabaseKey || !supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const currentSession = await getCurrentSession()

  if (!currentSession?.access_token) {
    throw new Error("You must be signed in to manage users.")
  }

  let response = await invokeManageUsersRequest(currentSession.access_token, payload)

  if (response.status === 401 && currentSession.refresh_token) {
    const refreshedSession = await refreshAccessToken(currentSession.refresh_token)
    response = await invokeManageUsersRequest(refreshedSession.access_token, payload)
  }

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? result.error
        : `Unable to complete the request. (${response.status})`

    throw new Error(message)
  }

  return result ?? {}
}
