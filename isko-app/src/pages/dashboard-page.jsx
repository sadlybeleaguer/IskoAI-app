import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  LogOut,
  Route,
  Shield,
  Sparkles,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { envVariableHints, supabase } from "@/lib/supabase"

const checklist = [
  "Create a `.env.local` file from `.env.example` and add your Supabase project credentials.",
  "Enable Email auth in your Supabase dashboard and create your first account from the sign-up screen.",
  "Replace the dashboard cards with product routes, queries, and mutations for your domain.",
]

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return "Unable to complete the request."
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [signOutError, setSignOutError] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    setIsSigningOut(true)
    setSignOutError("")

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      navigate("/sign-in", { replace: true })
    } catch (error) {
      setSignOutError(getErrorMessage(error))
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(251,146,60,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,250,252,1))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(251,146,60,0.16),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,1))]" />

      <header className="border-b border-border/70 bg-background/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Protected route
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Supabase auth starter
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {user?.email || "unknown user"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <LogOut className="size-4" />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-white/60 bg-white/80 py-0 shadow-[0_30px_120px_-44px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-black/30">
            <CardHeader className="space-y-4 border-b border-border/70 px-6 py-6">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-3">
                <CardTitle className="text-3xl tracking-tight">
                  The starter is wired and ready to extend.
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  This page proves the auth gate works. The router redirected you
                  here only after Supabase restored or created a valid session.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 px-6 py-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Shield className="size-5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  Guarded routes
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Unauthenticated users are redirected to sign in before they can reach the dashboard.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <DatabaseZap className="size-5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  Supabase client
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The browser client handles session persistence, auto refresh, and redirect token parsing.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Route className="size-5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  Router baseline
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Public auth screens and the protected app area are separated, so feature routes can slot in cleanly.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Replace this shell with product pages once your domain model is ready.
              </p>
              <Button asChild className="rounded-full px-4">
                <Link to="/sign-in">
                  Review auth entry points
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <div className="grid gap-6">
            {signOutError ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-out failed</AlertTitle>
                <AlertDescription>{signOutError}</AlertDescription>
              </Alert>
            ) : null}

            <Card className="border-white/60 bg-white/80 py-0 dark:border-white/10 dark:bg-black/30">
              <CardHeader className="space-y-2 border-b border-border/70 px-6 py-5">
                <CardTitle className="text-lg">Setup checklist</CardTitle>
                <CardDescription>
                  The scaffold is intentionally narrow. Keep the auth foundation and replace the rest quickly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 py-5">
                {checklist.map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="text-xs font-semibold">{index + 1}</span>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/80 py-0 dark:border-white/10 dark:bg-black/30">
              <CardHeader className="space-y-2 px-6 py-5">
                <CardTitle className="text-lg">Environment keys</CardTitle>
                <CardDescription>
                  The frontend looks for the URL plus one publishable or anon key variable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-6 py-5">
                {envVariableHints.map((hint, index) => (
                  <div key={hint}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/75 px-4 py-3">
                      <code className="text-xs font-medium sm:text-sm">{hint}</code>
                      {index === 0 ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Supported
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>Session persistence is enabled</AlertTitle>
              <AlertDescription>
                Refresh the page after signing in. You should remain authenticated until the session is revoked or expires.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </main>
    </div>
  )
}
