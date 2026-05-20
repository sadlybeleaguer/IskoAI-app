import fullLogoSrc from "@/components/ui/iskologo.png"
import compactLogoSrc from "@/components/ui/ologo.png"
import { cn } from "@/lib/utils"

export function SidebarLogo({
  collapsed = false,
  contextLabel = "Workspace",
  className,
}) {
  return (
    <span
      className={cn(
        "relative flex h-11 shrink-0 items-center overflow-hidden transition-[width,transform] duration-300 ease-out",
        collapsed ? "w-11 justify-center" : "w-36 justify-start",
        className,
      )}
      aria-hidden="true"
    >
      <img
        src={fullLogoSrc}
        alt=""
        className={cn(
          "absolute left-0 h-11 w-36 object-contain object-left transition-all duration-300 ease-out",
          collapsed
            ? "translate-x-1 scale-95 opacity-0 blur-[1px]"
            : "translate-x-0 scale-100 opacity-100 blur-0",
        )}
        draggable="false"
      />
      <img
        src={compactLogoSrc}
        alt=""
        className={cn(
          "absolute left-1/2 size-9 -translate-x-1/2 object-contain transition-all duration-300 ease-out",
          collapsed
            ? "scale-100 opacity-100 blur-0"
            : "scale-75 opacity-0 blur-[1px]",
        )}
        draggable="false"
      />
      <span className="sr-only">IskoAI {contextLabel}</span>
    </span>
  )
}
