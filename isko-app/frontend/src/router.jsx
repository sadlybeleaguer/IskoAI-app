import { BrowserRouter, Navigate, Route, Routes, useLocation, Outlet } from "react-router-dom"

import { AuthPage } from "@/pages/auth-page"
import { CalendarPage } from "@/pages/calendar-page"
import { ChatModelsPage } from "@/pages/chat-models-page"
import { ChatWorkspaceShellPage } from "@/pages/chat-workspace-shell-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { NotesLibraryPage } from "@/pages/notes-library-page"
import { NotesEditorPage } from "@/pages/notes-page"
import { QuizPage } from "@/pages/quiz-page"
import { AccessDeniedScreen } from "@/components/access-denied-screen"
import { LoadingScreen } from "@/components/loading-screen"
import { useAuth } from "@/context/auth-context"
import LandingPage from "@/pages/landing-page"

// --- Route Components (Guards) ---

function AuthenticatedRoute() {
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

function GuestOnlyRoute() {
  const location = useLocation()
  const { isLoading, session } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (session) {
    const destination = location.state?.from?.pathname || "/"
    return <Navigate to={destination} replace />
  }

  return <Outlet />
}

function ProtectedRoute() {
  const location = useLocation()
  const { isConfigured, isLoading, isSuperadmin, profileError, session } =
    useAuth()

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

  if (!isSuperadmin) {
    return <Navigate to="/chat" replace />
  }

  return <Outlet />
}

function HomeRedirect() {
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
    return <LandingPage />
  }

  return <Navigate to={isSuperadmin ? "/dashboard" : "/chat"} replace />
}

// --- Main Router ---

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        {/* Guest Routes */}
        <Route element={<GuestOnlyRoute />}>
          <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
          <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
        </Route>

        {/* Authenticated User Routes */}
        <Route element={<AuthenticatedRoute />}>
          <Route path="/chat" element={<ChatWorkspaceShellPage />} />
          <Route path="/notes" element={<NotesLibraryPage />} />
          <Route path="/notes/:noteId" element={<NotesEditorPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/quiz" element={<QuizPage />} />
        </Route>

        {/* Admin Only Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/models" element={<ChatModelsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
