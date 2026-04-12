import { Navigate, Outlet, useLocation } from "react-router-dom"

import { AccessDeniedScreen } from "@/components/access-denied-screen"
import { LoadingScreen } from "@/components/loading-screen"
import { useAuth } from "@/contexts/auth-context"

export function AuthenticatedRoute() {
  const location = useLocation()
  const { isConfigured, isLoading, profileError, session } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isConfigured || !session) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }

  if (profileError) {
    return (
      <AccessDeniedScreen
        title="Profile unavailable"
        description={profileError}
      />
    )
  }

  return <Outlet />
}
