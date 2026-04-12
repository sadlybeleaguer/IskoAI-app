import { Navigate } from "react-router-dom"

import { LoadingScreen } from "@/components/loading-screen"
import { useAuth } from "@/contexts/auth-context"

export function HomeRedirect() {
  const { isConfigured, isLoading, isSuperadmin, session } = useAuth()

  if (isLoading) {
    return (
      <LoadingScreen
        title="Loading workspace"
        description="Preparing your IskoAI session."
      />
    )
  }

  if (!isConfigured || !session) {
    return <Navigate to="/sign-in" replace />
  }

  return <Navigate to={isSuperadmin ? "/dashboard" : "/chat"} replace />
}
