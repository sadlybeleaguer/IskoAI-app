import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidebarLogo } from "@/components/ui/sidebar-logo"

const sectionShellClassName = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
const navLinkClassName =
  "text-sm text-muted-foreground transition-colors hover:text-primary"
const activeNavLinkClassName = "text-sm font-medium text-primary"

export function MarketingNav({ activePage = "home" }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className={`${sectionShellClassName} flex items-center justify-between gap-4 py-4`}>
        <Link
          to="/"
          className="flex min-w-0 items-center rounded-xl transition-opacity duration-200 hover:opacity-85"
          aria-label="IskoAI home"
        >
          <SidebarLogo collapsed className="sm:hidden" contextLabel="Home" />
          <SidebarLogo className="hidden sm:flex" contextLabel="Home" />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <a
            href={activePage === "home" ? "#workspace" : "/#workspace"}
            className={navLinkClassName}
          >
            Workspace
          </a>
          <a
            href={activePage === "home" ? "#flow" : "/#flow"}
            className={navLinkClassName}
          >
            Study Flow
          </a>
          <a
            href={activePage === "home" ? "#control" : "/#control"}
            className={navLinkClassName}
          >
            Control
          </a>
          <Link
            to="/developers"
            className={
              activePage === "developers"
                ? activeNavLinkClassName
                : navLinkClassName
            }
          >
            Developers
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" className="hidden rounded-full px-4 hover:text-primary sm:inline-flex">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild className="rounded-full px-4 sm:px-5">
            <Link to="/sign-up">
              Create account
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
