import { cn } from "@/utils/cn"

function Skeleton({ className, showImmediately = false, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-surface relative overflow-hidden rounded-md",
        showImmediately && "show-immediately",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
