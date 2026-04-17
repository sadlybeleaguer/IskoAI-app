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

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError"
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
    throw new Error("You must be signed in to use chat.")
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
    throw new Error("You must be signed in to use chat.")
  }

  return nextSession
}

async function invokeChatCompletionsRequest(accessToken, payload, signal) {
  return fetch(`${supabaseUrl}/functions/v1/chat-completions`, {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson",
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
    signal,
  })
}

function getStreamErrorMessage(result, status) {
  return result && typeof result === "object" && "error" in result
    ? result.error
    : `Unable to complete the chat request. (${status})`
}

async function readNdjsonStream(response, onEvent) {
  if (!response.body) {
    throw new Error("The chat function did not return a readable stream.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine) {
        continue
      }

      let event

      try {
        event = JSON.parse(trimmedLine)
      } catch {
        throw new Error("The chat stream returned an invalid event payload.")
      }

      await onEvent?.(event)
    }
  }

  const trailingLine = buffer.trim()

  if (trailingLine) {
    let event

    try {
      event = JSON.parse(trailingLine)
    } catch {
      throw new Error("The chat stream returned an invalid final event payload.")
    }

    await onEvent?.(event)
  }
}

export async function streamAssistantReply(payload, { onEvent, signal } = {}) {
  if (!supabaseUrl || !supabaseKey || !supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const currentSession = await getCurrentSession()

  if (!currentSession?.access_token) {
    throw new Error("You must be signed in to use chat.")
  }

  let response

  try {
    response = await invokeChatCompletionsRequest(
      currentSession.access_token,
      payload,
      signal,
    )
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    throw error
  }

  if (response.status === 401 && currentSession.refresh_token) {
    const refreshedSession = await refreshAccessToken(currentSession.refresh_token)
    response = await invokeChatCompletionsRequest(
      refreshedSession.access_token,
      payload,
      signal,
    )
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(getStreamErrorMessage(result, response.status))
  }

  await readNdjsonStream(response, async (event) => {
    if (!event || typeof event !== "object") {
      return
    }

    if (event.type === "error") {
      throw new Error(
        typeof event.error === "string"
          ? event.error
          : "The chat stream ended with an error.",
      )
    }

    await onEvent?.(event)
  })
}
