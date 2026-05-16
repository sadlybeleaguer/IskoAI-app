import { Skeleton } from "@/components/ui/skeleton"

export function LoadingScreen({
  title = "Loading workspace",
  description = "Checking your current Supabase session.",
}) {
  return (
    <div
      className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">
        {title}. {description}
      </span>
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] w-full max-w-7xl gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="hidden overflow-hidden rounded-xl border border-border/60 bg-sidebar/80 p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="mt-6 h-10 w-full rounded-lg" />
          <div className="mt-5 grid gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-6 grid gap-2">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-auto flex items-center gap-3 border-t border-border/50 pt-4">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/80">
          <header className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 sm:px-6">
            <div className="grid min-w-0 gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </header>

          <main className="grid flex-1 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="grid content-start gap-4">
              <Skeleton className="h-10 w-44 rounded-lg" />
              <div className="grid gap-3">
                <Skeleton className="h-20 w-4/5 rounded-xl" />
                <Skeleton className="ml-auto h-16 w-3/5 rounded-xl" />
                <Skeleton className="h-24 w-5/6 rounded-xl" />
              </div>
            </section>
            <aside className="hidden rounded-xl border border-border/60 p-4 lg:grid lg:content-start lg:gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </aside>
          </main>
        </div>
      </div>
    </div>
  )
}
