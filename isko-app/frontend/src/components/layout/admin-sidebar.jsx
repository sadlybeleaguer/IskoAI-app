import {
  Bot,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
} from "lucide-react"
import { Link, NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
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
                  collapsed
                    ? "size-10 justify-center"
                    : "h-9 w-full justify-start px-3",
                  isActive ? "bg-background text-foreground" : "text-muted-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
              >
                <Icon data-icon="inline-start" />
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
          <span className="flex size-8 items-center justify-center rounded-md border bg-background text-xs font-medium">
            {initials}
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

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex items-center justify-between px-4 py-4", isCollapsed && "justify-center")}>
        <button
          type="button"
          onClick={isMobile ? undefined : onToggleCollapse}
          className={cn(
            "flex items-center gap-2 text-left transition-all duration-200 hover:opacity-80 active:scale-95",
            isCollapsed && "justify-center w-full",
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/20">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-base font-medium">IskoAI</p>
              <p className="truncate text-sm text-muted-foreground">Admin</p>
            </div>
          )}
        </button>

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
            {isCollapsed ? (
              <PanelLeftOpen data-icon="inline-start" />
            ) : (
              <PanelLeftClose data-icon="inline-start" />
            )}
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
