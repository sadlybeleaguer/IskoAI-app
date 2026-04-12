import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/contexts/auth-context"
import { AuthPage } from "@/pages/auth-page"
import { ChatPage } from "@/pages/chat-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { AuthenticatedRoute } from "@/routes/authenticated-route"
import { GuestOnlyRoute } from "@/routes/guest-only-route"
import { HomeRedirect } from "@/routes/home-redirect"
import { ProtectedRoute } from "@/routes/protected-route"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route element={<GuestOnlyRoute />}>
            <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
          </Route>
          <Route element={<AuthenticatedRoute />}>
            <Route path="/chat" element={<ChatPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
