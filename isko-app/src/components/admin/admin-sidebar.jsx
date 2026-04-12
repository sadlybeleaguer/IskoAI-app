import { LogOut, MessageSquare, Shield, Users, X } from "lucide-react"
import { Link, NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/dashboard",
    icon: Users,
    label: "Users",
  },
  {
    href: "/chat",
    icon: MessageSquare,
    label: "Chat",
  },
]

export function AdminSidebar({
  isSigningOut,
  isMobile = false,
  onClose,
  onSignOut,
  userEmail,
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-4">
        <Link
          to="/dashboard"
          className="flex min-w-0 items-center gap-3"
          onClick={onClose}
        >
          <span className="flex size-9 items-center justify-center rounded-md border bg-background">
            <Shield />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Admin</p>
            <p className="truncate text-sm text-muted-foreground">IskoAI</p>
          </div>
        </Link>

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
        ) : null}
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/dashboard"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )
                }
                onClick={onClose}
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="flex flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{userEmail}</p>
          <p className="text-sm text-muted-foreground">Superadmin</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={onSignOut}
          disabled={isSigningOut}
        >
          <LogOut data-icon="inline-start" />
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  )
}
