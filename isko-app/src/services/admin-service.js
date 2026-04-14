import { supabase, supabaseKey, supabaseUrl } from "@/services/supabase"

const invalidRefreshTokenPattern =
  /invalid refresh token|refresh token not found/i

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

export async function invokeManageUsers(_session, payload) {
  if (!supabaseUrl || !supabaseKey || !supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const {
    data: { session: currentSession },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    if (isAuthRetryError(sessionError.message)) {
      await clearLocalSupabaseSession()
      throw new Error("Your session expired. Please sign in again.")
    }

    throw new Error(sessionError.message)
  }

  if (!currentSession?.refresh_token) {
    throw new Error("You must be signed in to manage users.")
  }

  const {
    data: refreshedAuth,
    error: refreshError,
  } = await supabase.auth.refreshSession({
    refresh_token: currentSession.refresh_token,
  })

  if (refreshError) {
    if (isAuthRetryError(refreshError.message)) {
      await clearLocalSupabaseSession()
      throw new Error("Your session expired. Please sign in again.")
    }

    throw new Error(refreshError.message)
  }

  const activeSession = refreshedAuth.session ?? currentSession

  if (!activeSession?.access_token) {
    throw new Error("You must be signed in to manage users.")
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${activeSession.access_token}`,
    },
    body: JSON.stringify(payload),
  })

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
