import { Navigate, Outlet, useLocation } from "react-router-dom"

import { LoadingScreen } from "@/components/loading-screen"
import { useAuth } from "@/contexts/auth-context"

export function GuestOnlyRoute() {
  const location = useLocation()
  const { isLoading, session } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (session) {
    const destination = location.state?.from?.pathname || "/dashboard"
    return <Navigate to={destination} replace />
  }

  return <Outlet />
}
