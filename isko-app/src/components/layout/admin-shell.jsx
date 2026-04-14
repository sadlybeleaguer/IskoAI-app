import { useState } from "react"
import { Menu } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { supabase } from "@/services/supabase"
import { getErrorMessage } from "@/utils/errors"

export function AdminShell({
  alerts,
  children,
  headerActions,
  headerContent,
  userEmail,
}) {
  const navigate = useNavigate()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [signOutError, setSignOutError] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    setIsSigningOut(true)
    setSignOutError("")

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      navigate("/sign-in", { replace: true })
    } catch (error) {
      setSignOutError(getErrorMessage(error))
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        "--admin-sidebar-width": isSidebarCollapsed ? "4.5rem" : "15.5rem",
      }}
    >
      <div className="grid min-h-screen lg:grid-cols-[var(--admin-sidebar-width)_minmax(0,1fr)]">
        <aside className="hidden border-r lg:block">
          <AdminSidebar
            isCollapsed={isSidebarCollapsed}
            isSigningOut={isSigningOut}
            onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
            onSignOut={handleSignOut}
            userEmail={userEmail}
          />
        </aside>

        {isNavOpen ? (
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setIsNavOpen(false)}
          >
            <aside
              className="h-full w-[15.5rem] border-r"
              onClick={(event) => event.stopPropagation()}
            >
              <AdminSidebar
                isSigningOut={isSigningOut}
                isMobile
                onClose={() => setIsNavOpen(false)}
                onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
                onSignOut={handleSignOut}
                userEmail={userEmail}
              />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0">
          <header className="border-b">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setIsNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu data-icon="inline-start" />
              </Button>

              <div className="min-w-0 flex-1">{headerContent}</div>

              {headerActions ? <div className="hidden sm:block">{headerActions}</div> : null}
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
              {signOutError ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign-out failed</AlertTitle>
                  <AlertDescription>{signOutError}</AlertDescription>
                </Alert>
              ) : null}

              {alerts}

              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
