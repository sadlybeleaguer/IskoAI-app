import { Navigate, Outlet, useLocation } from "react-router-dom"

import { LoadingScreen } from "@/components/loading-screen"
import { useAuth } from "@/contexts/auth-context"

export function ProtectedRoute() {
  const location = useLocation()
  const { isConfigured, isLoading, session } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isConfigured || !session) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }

  return <Outlet />
}
