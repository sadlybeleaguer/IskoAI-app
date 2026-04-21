import { supabase, supabaseKey, supabaseUrl } from "@/services/supabase"

export const chatFileSizeLimitBytes = 10 * 1024 * 1024
export const acceptedChatFileExtensions = [
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".html",
  ".htm",
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
]
export const acceptedChatFileInputAccept = acceptedChatFileExtensions.join(",")

const invalidRefreshTokenPattern =
  /invalid refresh token|refresh token not found/i
const chatFileSelect =
  "id, thread_id, user_id, original_name, mime_type, size_bytes, status, error_message, created_at, updated_at"
let refreshSessionPromise = null

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }

  return supabase
}

function isAuthRetryError(message) {
  return invalidRefreshTokenPattern.test(message ?? "")
}

function isMissingRelationError(error) {
  return (
    error?.code === "PGRST205" ||
    /could not find the table|relation .* does not exist/i.test(error?.message ?? "")
  )
}

async function clearLocalSupabaseSession() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut({ scope: "local" })

  if (error) {
    await supabase.auth.signOut().catch(() => undefined)
  }
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
    throw new Error("You must be signed in to manage chat files.")
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
    throw new Error("You must be signed in to manage chat files.")
  }

  return nextSession
}

async function invokeChatFileRequest(accessToken, body) {
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
  }

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  return fetch(`${supabaseUrl}/functions/v1/chat-file-attachments`, {
    method: "POST",
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

async function invokeChatFileMutation(body) {
  if (!supabaseUrl || !supabaseKey || !supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const currentSession = await getCurrentSession()

  if (!currentSession?.access_token) {
    throw new Error("You must be signed in to manage chat files.")
  }

  let response = await invokeChatFileRequest(currentSession.access_token, body)

  if (response.status === 401 && currentSession.refresh_token) {
    const refreshedSession = await refreshAccessToken(currentSession.refresh_token)
    response = await invokeChatFileRequest(refreshedSession.access_token, body)
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

function normalizeExtension(fileName) {
  const match = /\.([^.]+)$/.exec(fileName ?? "")

  return match ? `.${match[1].toLowerCase()}` : ""
}

export function validateChatFiles(files) {
  if (!Array.isArray(files) || !files.length) {
    throw new Error("Choose at least one file to upload.")
  }

  for (const file of files) {
    const extension = normalizeExtension(file?.name ?? "")

    if (!acceptedChatFileExtensions.includes(extension)) {
      throw new Error(
        `Unsupported file type for ${file?.name || "this file"}. Upload txt, md, csv, json, html, pdf, docx, xlsx, or pptx.`,
      )
    }

    if ((file?.size ?? 0) <= 0) {
      throw new Error(`${file?.name || "This file"} is empty.`)
    }

    if ((file?.size ?? 0) > chatFileSizeLimitBytes) {
      throw new Error(`${file.name} is larger than the 10 MB limit.`)
    }
  }

  return files
}

export async function listChatThreadFiles(userId, threadId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_thread_files")
    .select(chatFileSelect)
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (isMissingRelationError(error)) {
    return []
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function uploadChatFileAttachment({ file, threadId }) {
  const formData = new FormData()
  formData.append("action", "upload")
  formData.append("threadId", threadId)
  formData.append("file", file)

  const result = await invokeChatFileMutation(formData)

  if (!result?.file) {
    throw new Error("The upload response was missing the file record.")
  }

  return result.file
}

export async function removeChatFileAttachment({ fileId }) {
  const result = await invokeChatFileMutation({
    action: "delete",
    fileId,
  })

  return result?.fileId ?? fileId
}
