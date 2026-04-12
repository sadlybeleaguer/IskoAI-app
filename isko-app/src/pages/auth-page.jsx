import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, KeyRound } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { envVariableHints, supabase } from "@/lib/supabase"

const authCopy = {
  "sign-in": {
    eyebrow: "Welcome back",
    title: "Sign in to your control room",
    description:
      "Use your Supabase email and password to access the protected app shell.",
    cta: "Sign in",
    alternateLabel: "Need an account?",
    alternateHref: "/sign-up",
    alternateText: "Create one",
  },
  "sign-up": {
    eyebrow: "Start fresh",
    title: "Create your starter account",
    description:
      "Spin up a first user so you can verify auth, routing, and session persistence end to end.",
    cta: "Create account",
    alternateLabel: "Already have an account?",
    alternateHref: "/sign-in",
    alternateText: "Sign in",
  },
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong. Please try again."
}

async function clearLocalSupabaseSession() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut({ scope: "local" })

  if (error) {
    await supabase.auth.signOut().catch(() => undefined)
  }
}

export function AuthPage({ mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { authNotice, isConfigured, sessionError } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const copy = authCopy[mode]
  const redirectTo = location.state?.from?.pathname || "/"

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!supabase) {
      setFeedback({
        type: "error",
        message: "Add your Supabase URL and publishable key before using the auth flow.",
      })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    try {
      if (mode === "sign-in") {
        await clearLocalSupabaseSession()

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        navigate(redirectTo, { replace: true })
      } else {
        const emailRedirectTo = `${window.location.origin}/`
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo },
        })

        if (error) {
          throw error
        }

        if (data.session) {
          navigate("/", { replace: true })
          return
        }

        setFeedback({
          type: "success",
          message:
            "Account created. Check your inbox to confirm your email before signing in.",
        })
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(251,146,60,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.98))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.24),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(251,146,60,0.16),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,1))]" />

      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
        <div className="w-full">
          <Card className="border-white/60 bg-white/82 py-0 shadow-[0_30px_120px_-44px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-black/40">
            <CardHeader className="gap-3 border-b border-border/70 px-6 py-6">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <KeyRound className="size-5" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {copy.eyebrow}
                </p>
                <CardTitle className="text-2xl tracking-tight sm:text-3xl">
                  {copy.title}
                </CardTitle>
                <CardDescription className="max-w-md text-sm leading-6">
                  {copy.description}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 py-6">
              {!isConfigured ? (
                <Alert variant="destructive">
                  <AlertTitle>Supabase keys are missing</AlertTitle>
                  <AlertDescription>
                    Add <code className="font-medium">{envVariableHints[0]}</code>{" "}
                    and one of{" "}
                    <code className="font-medium">{envVariableHints[1]}</code>,{" "}
                    <code className="font-medium">{envVariableHints[2]}</code>, or{" "}
                    <code className="font-medium">{envVariableHints[3]}</code> in
                    your <code className="font-medium">.env.local</code> file.
                  </AlertDescription>
                </Alert>
              ) : null}

              {sessionError ? (
                <Alert variant="destructive">
                  <AlertTitle>Session check failed</AlertTitle>
                  <AlertDescription>{sessionError}</AlertDescription>
                </Alert>
              ) : null}

              {authNotice ? (
                <Alert variant="destructive">
                  <AlertTitle>Access restricted</AlertTitle>
                  <AlertDescription>{authNotice}</AlertDescription>
                </Alert>
              ) : null}

              {feedback.message ? (
                <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
                  <AlertTitle>
                    {feedback.type === "error" ? "Auth request failed" : "Next step"}
                  </AlertTitle>
                  <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting || !isConfigured}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting || !isConfigured}
                    minLength={8}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full justify-between rounded-2xl px-4 text-sm"
                  disabled={isSubmitting || !isConfigured}
                >
                  <span>{isSubmitting ? "Working..." : copy.cta}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </form>

              <Separator />

              <p className="text-sm text-muted-foreground">
                {copy.alternateLabel}{" "}
                <Link
                  className="font-medium text-foreground underline underline-offset-4"
                  to={copy.alternateHref}
                >
                  {copy.alternateText}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
