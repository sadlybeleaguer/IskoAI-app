import { supabase } from "@/lib/supabaseClient"

const profileSelect =
  "id, email, full_name, role, status, archived_at, created_at, updated_at"
const invalidRefreshTokenPattern =
  /invalid refresh token|refresh token not found/i

export function isInvalidRefreshTokenError(message) {
  return invalidRefreshTokenPattern.test(message ?? "")
}

export async function clearLocalSupabaseSession() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut({ scope: "local" })

  if (error) {
    await supabase.auth.signOut().catch(() => undefined)
  }
}

export async function getSession() {
  if (!supabase) return { data: { session: null }, error: null }
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }
  return supabase.auth.onAuthStateChange(callback)
}

export async function signOut() {
  if (!supabase) return
  return supabase.auth.signOut()
}

export async function getProfile(userId) {
  if (!supabase || !userId) return { data: null, error: null }

  return supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", userId)
    .maybeSingle()
}

export async function refreshProfile(userId) {
  return getProfile(userId)
}
