import {
  Bot,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  Settings,
  Users,
  X,
} from "lucide-react"
import { Link, NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { SidebarLogo } from "@/components/ui/sidebar-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"

const adminNavItems = [
  { href: "/dashboard", icon: Users, label: "Users", end: true },
  { href: "/dashboard/models", icon: Bot, label: "Chat models", end: true },
]

const workspaceNavItems = [
  { href: "/chat", icon: MessageSquare, label: "Chat", end: false },
]

function getInitials(value) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function AdminLogoBrand({ collapsed = false, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex h-12 items-center rounded-xl text-left transition-all duration-300 ease-out hover:bg-primary/5 active:scale-95",
        collapsed && "w-full justify-center",
      )}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <SidebarLogo collapsed={collapsed} contextLabel="Admin" />
    </button>
  )
}

export function AdminSidebar({
  isCollapsed = false,
  isSigningOut,
  isMobile = false,
  onClose,
  onOpenSettings,
  onToggleCollapse,
  onSignOut,
  userEmail,
}) {
  const initials = getInitials(userEmail || "Admin")

  const renderNavSection = (items, collapsed = false) => (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <NavLink key={item.href} to={item.href} end={item.end}>
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
                        "border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5",
                        "font-medium text-primary shadow-sm shadow-primary/10",
                        "hover:from-primary/15 hover:to-primary/8",
                      ].join(" ")
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
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
      })}
    </div>
  )

  const renderUserMenu = ({
    compact = false,
    triggerClassName = "h-auto w-full justify-start px-2 py-2",
  } = {}) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className={triggerClassName}>
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background p-0.5">
            <span className="flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              {initials}
            </span>
          </span>
          {compact ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{userEmail}</span>
              <MoreHorizontal data-icon="inline-end" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/dashboard" onClick={onClose}>
              <Users data-icon="inline-start" />
              Users
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard/models" onClick={onClose}>
              <Bot data-icon="inline-start" />
              Chat models
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/chat" onClick={onClose}>
              <MessageSquare data-icon="inline-start" />
              Chat
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              onOpenSettings()
              onClose?.()
            }}
          >
            <Settings data-icon="inline-start" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              void onSignOut()
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

  if (isCollapsed && !isMobile) {
    return (
      <div className="flex h-full flex-col items-center border-r border-border/50 bg-gradient-to-b from-sidebar via-sidebar to-muted/20 px-2 py-3 text-sidebar-foreground">
        <div className="mb-2 py-1">
          <AdminLogoBrand collapsed onToggle={onToggleCollapse} />
        </div>

        <nav className="mt-3 flex flex-col items-center gap-1.5">
          {renderNavSection(adminNavItems, true)}
          <div className="my-2 h-px w-10 bg-border/70" />
          {renderNavSection(workspaceNavItems, true)}
        </nav>

        <div className="mt-auto border-t border-border/50 pt-3">
          {renderUserMenu({
            compact: true,
            triggerClassName: "size-10 justify-center px-0 hover:bg-muted/70",
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-muted/20 text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-4">
        <AdminLogoBrand
          collapsed={isCollapsed}
          onToggle={isMobile ? undefined : onToggleCollapse}
        />

        {isMobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X data-icon="inline-start" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeftClose data-icon="inline-start" />
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className={cn("flex flex-col gap-1 px-2 py-3", isCollapsed && "items-center")}>
          {renderNavSection(adminNavItems, isCollapsed)}
          <div className="my-3 h-px w-full bg-border/70" />
          {renderNavSection(workspaceNavItems, isCollapsed)}
        </nav>
      </ScrollArea>

      <div className={cn("border-t px-3 py-3", isCollapsed && "flex justify-center")}>
        {renderUserMenu({
          compact: isCollapsed,
          triggerClassName: isCollapsed ? "size-10 justify-center px-0" : "h-auto w-full justify-start px-2 py-2",
        })}
      </div>
    </div>
  )
}
