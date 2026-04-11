import { LoaderCircle } from "lucide-react"

export function LoadingScreen({
  title = "Loading workspace",
  description = "Checking your current Supabase session.",
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[28px] border border-white/60 bg-white/75 p-8 text-center shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LoaderCircle className="size-6 animate-spin" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}
