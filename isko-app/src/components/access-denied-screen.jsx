import { useState } from "react"
import { ShieldAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { supabase } from "@/services/supabase"

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return "Unable to complete the request."
}

export function AccessDeniedScreen({
  title = "Restricted area",
  description = "Your account does not currently have permission to view this area.",
}) {
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (!supabase) {
      navigate("/sign-in", { replace: true })
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
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(248,113,113,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,252,1))]" />

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center">
        <Card className="w-full border-white/60 bg-white/84 py-0 shadow-[0_30px_120px_-44px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardHeader className="gap-3 border-b border-border/70 px-6 py-6">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
              <CardDescription className="text-sm leading-6">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-6 py-6">
            {signOutError ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-out failed</AlertTitle>
                <AlertDescription>{signOutError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="button"
              className="h-11 w-full rounded-2xl"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Return to sign in"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
