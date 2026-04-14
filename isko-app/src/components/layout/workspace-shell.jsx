import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  FileText,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shield,
  X,
} from "lucide-react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/services/supabase"
import { cn } from "@/utils/cn"

const workspaceCollapseStorageKey = "isko-workspace-sidebar-collapsed"

const navigationItems = [
  { key: "chat", label: "Chat", to: "/chat", icon: MessageSquare },
  { key: "notes", label: "Notes", to: "/notes", icon: FileText },
  { key: "calendar", label: "Calendar", to: "/calendar", icon: CalendarDays },
]

function getInitials(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return "Unable to complete the request."
}

function getStoredCollapseState() {
  if (typeof window === "undefined") {
    return false
  }

  return window.localStorage.getItem(workspaceCollapseStorageKey) === "true"
}

export function WorkspaceShell({
  alerts,
  children,
  headerContent,
  onSearchPlaceholder,
  pageKey,
  primaryAction,
  sidebarContent,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSuperadmin, profile, userEmail } = useAuth()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getStoredCollapseState)
  const [shellNotice, setShellNotice] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")

  const displayName = profile?.full_name?.trim() || userEmail || "IskoAI user"
  const initials = useMemo(() => getInitials(displayName), [displayName])

  useEffect(() => {
    window.localStorage.setItem(
      workspaceCollapseStorageKey,
      String(isSidebarCollapsed),
    )
  }, [isSidebarCollapsed])

  useEffect(() => {
    setIsNavOpen(false)
    setShellNotice("")
  }, [location.pathname])

  const handleSearchPlaceholder = () => {
    setShellNotice("Search is not connected yet.")
    onSearchPlaceholder?.()
  }

  const handleSignOut = async () => {
    if (!supabase) {
      navigate("/sign-in", { replace: true })
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

  const renderUserMenu = ({
    compact = false,
    triggerClassName = "h-auto w-full justify-start px-2 py-2",
  } = {}) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className={triggerClassName}>
          <span className="flex size-8 items-center justify-center rounded-md border bg-background text-xs font-medium">
            {initials}
          </span>
          {compact ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{displayName}</span>
              <MoreHorizontal data-icon="inline-end" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isSuperadmin ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/dashboard">
                  <Shield data-icon="inline-start" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              void handleSignOut()
            }}
            disabled={isSigningOut}
          >
            <LogOut data-icon="inline-start" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderNavItem = (item, collapsed = false) => {
    const Icon = item.icon

    return (
      <NavLink key={item.key} to={item.to}>
        {({ isActive }) => (
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
              collapsed
                ? "size-10 justify-center"
                : "h-9 w-full justify-start px-3",
              isActive ? "bg-background text-foreground" : "text-muted-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon data-icon="inline-start" />
            {collapsed ? null : item.label}
          </Button>
        )}
      </NavLink>
    )
  }

  const renderPrimaryAction = (collapsed = false) => {
    if (!primaryAction) {
      return null
    }

    const PrimaryActionIcon = primaryAction.icon

    return collapsed ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={primaryAction.onClick}
        aria-label={primaryAction.ariaLabel || primaryAction.label}
      >
        <PrimaryActionIcon data-icon="inline-start" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-full justify-start rounded-lg border bg-background"
        onClick={primaryAction.onClick}
      >
        <PrimaryActionIcon data-icon="inline-start" />
        {primaryAction.label}
      </Button>
    )
  }

  const renderCollapsedSidebar = () => (
    <div className="flex h-full flex-col items-center bg-sidebar px-2 py-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsSidebarCollapsed(false)}
        aria-label="Expand sidebar"
      >
        <PanelLeftOpen data-icon="inline-start" />
      </Button>

      {primaryAction ? <div className="mt-4">{renderPrimaryAction(true)}</div> : null}

      <div className="mt-4 flex flex-col gap-2">
        {navigationItems.map((item) => renderNavItem(item, true))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleSearchPlaceholder}
          aria-label="Search"
        >
          <Search data-icon="inline-start" />
        </Button>
      </div>

      <div className="mt-auto">
        {renderUserMenu({
          compact: true,
          triggerClassName: "size-10 justify-center px-0",
        })}
      </div>
    </div>
  )

  const renderExpandedSidebar = (mobile = false) => (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-base font-medium">IskoAI</p>
          <p className="truncate text-sm text-muted-foreground">Workspace</p>
        </div>
        {mobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsNavOpen(false)}
            aria-label="Close navigation"
          >
            <X data-icon="inline-start" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsSidebarCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose data-icon="inline-start" />
          </Button>
        )}
      </div>

      {primaryAction ? <div className="px-4 pb-2">{renderPrimaryAction()}</div> : null}

      <div className="px-2 pb-3">
        {navigationItems.map((item) => renderNavItem(item))}
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full justify-start px-3 text-muted-foreground"
          onClick={handleSearchPlaceholder}
        >
          <Search data-icon="inline-start" />
          Search
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-3">{sidebarContent}</div>
      </ScrollArea>

      <div className="border-t px-3 py-3">{renderUserMenu()}</div>
    </div>
  )

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        "--workspace-sidebar-width": isSidebarCollapsed ? "4.5rem" : "15.5rem",
      }}
    >
      <div className="grid min-h-screen lg:grid-cols-[var(--workspace-sidebar-width)_minmax(0,1fr)]">
        <aside className="hidden border-r lg:block">
          {isSidebarCollapsed ? renderCollapsedSidebar() : renderExpandedSidebar()}
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
              {renderExpandedSidebar(true)}
            </aside>
          </div>
        ) : null}

        <main className="flex min-h-screen min-w-0 flex-col">
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

              <div className="ml-auto">
                {renderUserMenu({
                  triggerClassName: "h-8 justify-start border bg-background px-2.5 shadow-none",
                })}
              </div>
            </div>
          </header>

          {shellNotice ? (
            <div className="border-b px-4 py-4 sm:px-6">
              <Alert>
                <Search className="size-4" />
                <AlertTitle>Search</AlertTitle>
                <AlertDescription>{shellNotice}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {signOutError ? (
            <div className="border-b px-4 py-4 sm:px-6">
              <Alert variant="destructive">
                <AlertTitle>Sign-out failed</AlertTitle>
                <AlertDescription>{signOutError}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {alerts ? <div className="border-b px-4 py-4 sm:px-6">{alerts}</div> : null}

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              pageKey === "chat" ? "" : "overflow-hidden",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
