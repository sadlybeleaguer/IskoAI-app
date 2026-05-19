import { Skeleton } from "@/components/ui/skeleton"

export function LoadingScreen({
  title = "Loading workspace",
  description = "Checking your current Supabase session.",
}) {
  return (
    <div
      className="h-svh overflow-hidden bg-background text-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">
        {title}. {description}
      </span>
      <div
        className="h-svh bg-background text-foreground"
        style={{
          "--workspace-sidebar-width": "15.5rem",
        }}
      >
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--workspace-sidebar-width)] border-r border-border/50 lg:block">
          <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-muted/20">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm shadow-primary/10">
                  <Skeleton className="size-4 rounded-sm bg-primary/20" showImmediately />
                </div>
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-20" showImmediately />
                  <Skeleton className="h-3 w-14" showImmediately />
                </div>
              </div>
              <Skeleton className="size-8 rounded-md" showImmediately />
            </div>

            <div className="px-4 pb-2">
              <Skeleton className="h-10 w-full rounded-lg" showImmediately />
            </div>

            <div className="flex flex-col gap-1 px-2 pb-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-9 w-full rounded-lg"
                  showImmediately
                />
              ))}
            </div>

            <div className="min-h-0 flex-1 px-2">
              <div className="space-y-3">
                <Skeleton className="h-3 w-20" showImmediately />
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-lg px-2 py-2">
                    <Skeleton className="h-4 w-4/5" showImmediately />
                    <Skeleton className="mt-2 h-3 w-2/5" showImmediately />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/50 px-3 py-3">
              <div className="flex h-9 items-center gap-2 rounded-full border border-border/60 bg-background/70 py-0 pl-1 pr-2">
                <Skeleton className="size-7 rounded-full" showImmediately />
                <Skeleton className="h-4 flex-1" showImmediately />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex h-svh min-w-0 flex-col lg:pl-[var(--workspace-sidebar-width)]">
          <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Skeleton className="size-8 rounded-md lg:hidden" showImmediately />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" showImmediately />
                    <Skeleton className="h-3 w-24" showImmediately />
                  </div>
                  <div className="ml-auto">
                    <div className="flex h-9 w-[12.5rem] max-w-[45vw] items-center gap-2 rounded-full border border-border/60 bg-background/70 py-0 pl-1 pr-2">
                      <Skeleton className="size-7 rounded-full" showImmediately />
                      <Skeleton className="h-4 flex-1" showImmediately />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.035),_transparent_52%)]">
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="mx-auto flex w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
                  <Skeleton className="h-9 w-28 rounded-md" showImmediately />
                </div>
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-4 w-36" showImmediately />
                      <Skeleton className="h-3 w-52" showImmediately />
                    </div>
                    <Skeleton className="hidden h-10 w-28 rounded-md sm:block" showImmediately />
                  </div>

                  <div className="grid gap-5">
                    <div className="flex justify-start">
                      <div className="grid w-full max-w-3xl gap-2">
                        <Skeleton className="h-3 w-20" showImmediately />
                        <Skeleton className="h-4 w-11/12" showImmediately />
                        <Skeleton className="h-4 w-8/12" showImmediately />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-14 w-3/5 max-w-2xl rounded-[1.35rem]" showImmediately />
                    </div>
                    <div className="flex justify-start">
                      <div className="grid w-full max-w-3xl gap-2">
                        <Skeleton className="h-4 w-10/12" showImmediately />
                        <Skeleton className="h-4 w-9/12" showImmediately />
                        <Skeleton className="h-4 w-6/12" showImmediately />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/70 bg-background/88 shadow-[0_-18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/76">
                <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
                  <div className="rounded-3xl border border-border/60 bg-background/95 p-3 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.6)] backdrop-blur">
                    <Skeleton className="h-28 w-full rounded-2xl" showImmediately />
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 px-2 pt-3">
                      <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-9 w-24 rounded-full" showImmediately />
                        <Skeleton className="h-9 w-28 rounded-full" showImmediately />
                        <Skeleton className="h-9 w-32 rounded-full" showImmediately />
                      </div>
                      <Skeleton className="h-10 w-24 rounded-full" showImmediately />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
