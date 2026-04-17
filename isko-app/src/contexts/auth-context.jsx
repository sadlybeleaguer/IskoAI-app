/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import { hasSupabaseEnv, supabase } from "@/services/supabase"

const AuthContext = createContext(null)
const profileSelect =
  "id, email, full_name, role, status, archived_at, created_at, updated_at"
const invalidRefreshTokenPattern =
  /invalid refresh token|refresh token not found/i

function isInvalidRefreshTokenError(message) {
  return invalidRefreshTokenPattern.test(message ?? "")
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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(hasSupabaseEnv)
  const [sessionError, setSessionError] = useState("")
  const [profileError, setProfileError] = useState("")
  const [authNotice, setAuthNotice] = useState("")
  const sessionUserIdRef = useRef(null)

  useEffect(() => {
    sessionUserIdRef.current = session?.user?.id ?? null
  }, [session?.user?.id])

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let isMounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (isInvalidRefreshTokenError(error?.message)) {
        await clearLocalSupabaseSession()

        if (!isMounted) {
          return
        }

        setSession(null)
        setProfile(null)
        setProfileError("")
        setSessionError("Your session expired. Please sign in again.")
        setAuthNotice("")
        setIsLoading(false)
        return
      }

      setSession(data.session ?? null)
      setSessionError(error?.message ?? "")
      setIsLoading(Boolean(data.session))
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      const nextUserId = nextSession?.user?.id ?? null
      const currentUserId = sessionUserIdRef.current
      const didUserChange = nextUserId !== currentUserId

      if (nextSession) {
        setAuthNotice("")
      }

      setSession(nextSession ?? null)
      setSessionError("")

      if (!nextSession) {
        setProfile(null)
        setProfileError("")
        setIsLoading(false)
        return
      }

      if (didUserChange) {
        setProfile(null)
        setProfileError("")
        setIsLoading(true)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      return undefined
    }

    let isMounted = true

    const loadProfile = async () => {
      setIsLoading(true)

      const { data, error } = await supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", session.user.id)
        .maybeSingle()

      if (!isMounted) {
        return
      }

      if (error) {
        setProfile(null)
        setProfileError(error.message)
        setIsLoading(false)
        return
      }

      if (!data) {
        setProfile(null)
        setProfileError("Your user profile could not be found.")
        setIsLoading(false)
        return
      }

      if (data.status === "archived") {
        await supabase.auth.signOut()

        if (!isMounted) {
          return
        }

        setSession(null)
        setProfile(null)
        setProfileError("")
        setAuthNotice("Your account has been archived and can no longer sign in.")
        setIsLoading(false)
        return
      }

      setProfile(data)
      setProfileError("")
      setIsLoading(false)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [session?.user?.id])

  const refreshProfile = async () => {
    if (!supabase || !session?.user?.id) {
      return null
    }

    setIsLoading(true)

    const { data, error } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("id", session.user.id)
      .maybeSingle()

    if (error) {
      setProfileError(error.message)
      setIsLoading(false)
      return null
    }

    if (!data) {
      setProfile(null)
      setProfileError("Your user profile could not be found.")
      setIsLoading(false)
      return null
    }

    setProfile(data)
    setProfileError("")
    setIsLoading(false)

    return data
  }

  const value = {
    authNotice,
    isConfigured: hasSupabaseEnv,
    isLoading,
    isSuperadmin:
      profile?.role === "superadmin" && profile?.status === "active",
    profile,
    profileError,
    refreshProfile,
    session,
    sessionError,
    user: session?.user ?? null,
    userEmail: profile?.email || session?.user?.email || "",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
