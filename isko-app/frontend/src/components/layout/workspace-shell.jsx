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
  Brain,
} from "lucide-react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WorkspaceSearch } from "@/components/layout/workspace-search"
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
import { useAuth } from "@/context/auth-context"
import { useWorkspaceSearch } from "@/hooks/use-workspace-search"
import { supabase } from "@/lib/supabaseClient"
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
  pageKey,
  primaryAction,
  sidebarContent,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSuperadmin, profile, user, userEmail } = useAuth()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getStoredCollapseState)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")
  const isChatPage = pageKey === "chat"
  const {
    errorMessage: searchErrorMessage,
    flatResults,
    groupedResults,
    isLoading: isLoadingSearch,
    query: searchQuery,
    setQuery: setSearchQuery,
  } = useWorkspaceSearch(user?.id, isSearchOpen)

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
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setIsSearchOpen(true)
        return
      }
      if (event.key === "Escape") {
        setIsSearchOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const handleOpenSearch = () => setIsSearchOpen(true)
  const handleCloseSearch = () => setIsSearchOpen(false)

  const handleSelectSearchResult = (result) => {
    setIsSearchOpen(false)
    navigate(result.href)
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
      if (error) throw error
      navigate("/sign-in", { replace: true })
    } catch (error) {
      setSignOutError(getErrorMessage(error))
    } finally {
      setIsSigningOut(false)
    }
  }

  /* ─── Logo mark — matches landing page brand identity ─── */
  const LogoBrand = ({ collapsed = false }) => (
    <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
      {/* Gradient pill identical to landing page nav */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/20">
        <Brain className="h-5 w-5 text-primary-foreground" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight text-foreground">IskoAI</p>
          <p className="truncate text-xs text-muted-foreground">Workspace</p>
        </div>
      )}
    </div>
  )

  /* ─── User avatar chip — mirrors landing page CTA pill aesthetic ─── */
  const UserAvatar = () => (
    <span className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-gradient-to-br from-primary/10 to-muted/40 text-xs font-semibold text-primary shadow-sm transition-all duration-200 group-hover:shadow-primary/10">
      {initials}
    </span>
  )

  const renderUserMenu = ({
    compact = false,
    triggerClassName = "group h-auto w-full justify-start px-2 py-2",
  } = {}) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "transition-all duration-200 hover:bg-primary/5",
            triggerClassName,
          )}
        >
          <UserAvatar />
          {compact ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                {displayName}
              </span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border border-border/50 bg-background/95 shadow-lg shadow-black/10 backdrop-blur-md"
      >
        {isSuperadmin ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="rounded-lg">
                  <Shield data-icon="inline-start" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/50" />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              void handleSignOut()
            }}
            disabled={isSigningOut}
            className="rounded-lg text-muted-foreground focus:text-foreground"
          >
            <LogOut data-icon="inline-start" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  /* ─── Nav item — landing-page-consistent active state ─── */
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
              "transition-all duration-200",
              collapsed
                ? "size-10 justify-center"
                : "h-9 w-full justify-start px-3",
              isActive
                ? [
                    "bg-gradient-to-r from-primary/10 to-primary/5",
                    "text-primary font-medium",
                    "border border-primary/20 shadow-sm shadow-primary/10",
                    "hover:from-primary/15 hover:to-primary/8",
                  ].join(" ")
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                collapsed ? "mx-auto" : "mr-2",
              )}
              data-icon="inline-start"
            />
            {collapsed ? null : item.label}
          </Button>
        )}
      </NavLink>
    )
  }

  /* ─── Primary action button ─── */
  const renderPrimaryAction = (collapsed = false) => {
    if (!primaryAction) return null
    const PrimaryActionIcon = primaryAction.icon
    return collapsed ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={primaryAction.onClick}
        aria-label={primaryAction.ariaLabel || primaryAction.label}
        className="size-10 transition-all duration-200 hover:bg-primary/10 hover:text-primary"
      >
        <PrimaryActionIcon className="h-4 w-4" data-icon="inline-start" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-full justify-start rounded-lg border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 text-sm font-medium shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
        onClick={primaryAction.onClick}
      >
        <PrimaryActionIcon className="mr-2 h-4 w-4" data-icon="inline-start" />
        {primaryAction.label}
      </Button>
    )
  }

  /* ─── Search button — landing page rounded-full pill style ─── */
  const renderSearchButton = (collapsed = false) =>
    collapsed ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleOpenSearch}
        aria-label="Search"
        className="size-10 transition-all duration-200 hover:bg-primary/5 hover:text-primary"
      >
        <Search className="h-4 w-4" data-icon="inline-start" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        className="h-9 w-full justify-start px-3 text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground"
        onClick={handleOpenSearch}
      >
        <Search className="mr-2 h-4 w-4" data-icon="inline-start" />
        Search
        <kbd className="ml-auto hidden rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </Button>
    )

  /* ─── Collapsed sidebar ─── */
  const renderCollapsedSidebar = () => (
    <div className="flex h-full flex-col items-center border-r border-border/50 bg-gradient-to-b from-sidebar via-sidebar to-muted/20 px-2 py-3">
      {/* Logo */}
      <div className="mb-2 flex items-center justify-center py-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/20">
          <Brain className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsSidebarCollapsed(false)}
        aria-label="Expand sidebar"
        className="size-10 transition-all duration-200 hover:bg-primary/5 hover:text-primary"
      >
        <PanelLeftOpen className="h-4 w-4" data-icon="inline-start" />
      </Button>

      {primaryAction ? (
        <div className="mt-3">{renderPrimaryAction(true)}</div>
      ) : null}

      <div className="mt-3 flex flex-col gap-1.5">
        {navigationItems.map((item) => renderNavItem(item, true))}
        {renderSearchButton(true)}
      </div>

      <div className="mt-auto border-t border-border/50 pt-3">
        {renderUserMenu({
          compact: true,
          triggerClassName: "group size-10 justify-center px-0 hover:bg-primary/5",
        })}
      </div>
    </div>
  )

  /* ─── Expanded sidebar ─── */
  const renderExpandedSidebar = (mobile = false) => (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-muted/20">
      {/* Header / Logo area */}
      <div className="flex items-center justify-between px-4 py-4">
        <LogoBrand />
        {mobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsNavOpen(false)}
            aria-label="Close navigation"
            className="transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-4 w-4" data-icon="inline-start" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsSidebarCollapsed(true)}
            aria-label="Collapse sidebar"
            className="transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
          >
            <PanelLeftClose className="h-4 w-4" data-icon="inline-start" />
          </Button>
        )}
      </div>

      {/* Primary action */}
      {primaryAction ? (
        <div className="px-4 pb-2">{renderPrimaryAction()}</div>
      ) : null}

      {/* Navigation */}
      <div className="space-y-0.5 px-2 pb-3">
        {navigationItems.map((item) => renderNavItem(item))}
        {renderSearchButton(false)}
      </div>

      {/* Sidebar extra content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-3">{sidebarContent}</div>
      </ScrollArea>

      {/* User menu — subtle separator matching landing page card borders */}
      <div className="border-t border-border/50 px-3 py-3">
        {renderUserMenu()}
      </div>
    </div>
  )

  /* ─── Banners ─── */
  const shellBanners = (
    <>
      {signOutError ? (
        <div className="border-b border-border/50 px-4 py-4 sm:px-6">
          <Alert variant="destructive" className="rounded-xl border-border/50">
            <AlertTitle>Sign-out failed</AlertTitle>
            <AlertDescription>{signOutError}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      {alerts ? (
        <div className="border-b border-border/50 px-4 py-4 sm:px-6">{alerts}</div>
      ) : null}
    </>
  )

  /* ─── Shared header bar — matches landing page nav backdrop ─── */
  const renderHeader = () => (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
          onClick={() => setIsNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" data-icon="inline-start" />
        </Button>

        <div className="min-w-0 flex-1">{headerContent}</div>

        <div className="ml-auto">
          {renderUserMenu({
            triggerClassName:
              "group h-8 justify-start rounded-full border border-border/50 bg-background/60 px-2.5 shadow-none transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10",
          })}
        </div>
      </div>
    </header>
  )

  /* ─── Mobile overlay ─── */
  const renderMobileOverlay = () =>
    isNavOpen ? (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsNavOpen(false)}
        />
        <aside
          className="fixed inset-y-0 left-0 z-50 w-[var(--workspace-sidebar-drawer-width)] border-r border-border/50 bg-sidebar shadow-xl shadow-black/10 lg:hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="h-svh">{renderExpandedSidebar(true)}</div>
        </aside>
      </>
    ) : null

  /* ─── Root ─── */
  return (
    <div
      className={cn(
        "bg-background text-foreground",
        isChatPage ? "h-svh overflow-hidden" : "min-h-screen",
      )}
      style={{
        "--workspace-sidebar-width": isSidebarCollapsed ? "4.5rem" : "15.5rem",
        "--workspace-sidebar-drawer-width": "clamp(15rem, 82vw, 16rem)",
      }}
    >
      {isChatPage ? (
        <>
          {/* Fixed desktop sidebar */}
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--workspace-sidebar-width)] lg:block">
            <div className="h-svh">
              {isSidebarCollapsed ? renderCollapsedSidebar() : renderExpandedSidebar()}
            </div>
          </aside>

          {renderMobileOverlay()}

          {/* Main content area */}
          <div className="flex h-svh min-w-0 flex-col lg:pl-[var(--workspace-sidebar-width)]">
            {renderHeader()}
            {shellBanners}
            <main className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden">
              {children}
            </main>
          </div>
        </>
      ) : (
        <div className="grid min-h-screen lg:grid-cols-[var(--workspace-sidebar-width)_minmax(0,1fr)]">
          {/* Static desktop sidebar */}
          <aside className="hidden border-r border-border/50 lg:block">
            {isSidebarCollapsed ? renderCollapsedSidebar() : renderExpandedSidebar()}
          </aside>

          {/* Mobile overlay */}
          {isNavOpen ? (
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setIsNavOpen(false)}
            >
              <aside
                className="h-full w-[15.5rem] border-r border-border/50 shadow-xl shadow-black/10"
                onClick={(event) => event.stopPropagation()}
              >
                {renderExpandedSidebar(true)}
              </aside>
            </div>
          ) : null}

          {/* Page content */}
          <main className="flex min-h-screen min-w-0 flex-col">
            {renderHeader()}
            {shellBanners}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
          </main>
        </div>
      )}

      <WorkspaceSearch
        errorMessage={searchErrorMessage}
        flatResults={flatResults}
        groupedResults={groupedResults}
        isLoading={isLoadingSearch}
        onClose={handleCloseSearch}
        onSelectResult={handleSelectSearchResult}
        open={isSearchOpen}
        query={searchQuery}
        setQuery={setSearchQuery}
      />
    </div>
  )
}