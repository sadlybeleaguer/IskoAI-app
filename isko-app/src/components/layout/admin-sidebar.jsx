import {
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
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

const navItems = [
  { href: "/dashboard", icon: Users, label: "Users" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
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
  onToggleCollapse,
  onSignOut,
  userEmail,
}) {
  const initials = getInitials(userEmail || "Admin")

  const renderNavItem = (item, collapsed = false) => {
    const Icon = item.icon

    return (
      <NavLink key={item.href} to={item.href} end={item.href === "/dashboard"}>
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
            <Link to="/chat" onClick={onClose}>
              <MessageSquare data-icon="inline-start" />
              Chat
            </Link>
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

  if (!isMobile && isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center bg-sidebar px-2 py-3 text-sidebar-foreground">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label="Expand navigation"
        >
          <PanelLeftOpen data-icon="inline-start" />
        </Button>

        <div className="mt-4 flex flex-col gap-2">
          {navItems.map((item) => renderNavItem(item, true))}
        </div>

        <div className="mt-auto">
          {renderUserMenu({
            compact: true,
            triggerClassName: "size-10 justify-center px-0",
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-base font-medium">IskoAI</p>
          <p className="truncate text-sm text-muted-foreground">Admin</p>
        </div>

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
            aria-label="Collapse navigation"
          >
            <PanelLeftClose data-icon="inline-start" />
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-1 px-2 py-3">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>

      <div className="border-t px-3 py-3">{renderUserMenu()}</div>
    </div>
  )
}
