import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react"

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
import { envVariableHints, supabase } from "@/services/supabase"
import { cn } from "@/utils/cn"

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
      "Create an account with your name, email, and a strong password so the auth flow is ready for real users.",
    cta: "Create account",
    alternateLabel: "Already have an account?",
    alternateHref: "/sign-in",
    alternateText: "Sign in",
  },
}

const passwordRequirementText =
  "Use at least 8 characters with uppercase, lowercase, a number, and a symbol."
const duplicateEmailErrorMessage = "Email is already in use."

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function normalizeFullName(value) {
  return value.trim().replace(/\s+/g, " ")
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getPasswordIssues(value) {
  const issues = []

  if (value.length < 8) {
    issues.push("at least 8 characters")
  }

  if (!/[A-Z]/.test(value)) {
    issues.push("an uppercase letter")
  }

  if (!/[a-z]/.test(value)) {
    issues.push("a lowercase letter")
  }

  if (!/\d/.test(value)) {
    issues.push("a number")
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    issues.push("a symbol")
  }

  return issues
}

function validateAuthFields({ confirmPassword, email, fullName, mode, password }) {
  const errors = {}
  const normalizedEmail = normalizeEmail(email)
  const normalizedFullName = normalizeFullName(fullName)

  if (mode === "sign-up") {
    if (!normalizedFullName) {
      errors.fullName = "Full name is required."
    } else if (normalizedFullName.length > 120) {
      errors.fullName = "Full name must be 120 characters or fewer."
    }
  }

  if (!normalizedEmail) {
    errors.email = "Email is required."
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = "Enter a valid email address."
  }

  if (!password) {
    errors.password = "Password is required."
  } else if (mode === "sign-up") {
    const passwordIssues = getPasswordIssues(password)

    if (passwordIssues.length > 0) {
      errors.password = `Password must include ${passwordIssues.join(", ")}.`
    }
  }

  if (mode === "sign-up") {
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password."
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match."
    }
  }

  return {
    errors,
    values: {
      email: normalizedEmail,
      fullName: normalizedFullName,
      password,
    },
  }
}

function PasswordField({
  autoComplete,
  disabled,
  error,
  helperText,
  id,
  label,
  onChange,
  placeholder,
  type,
  value,
  visible,
  onToggleVisibility,
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="pr-10"
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
      {helperText ? (
        <p
          className={cn(
            "text-xs leading-5",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error || helperText}
        </p>
      ) : error ? (
        <p className="text-xs leading-5 text-destructive">{error}</p>
      ) : null}
    </div>
  )
}

function GoogleMark(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M21.64 12.2c0-.68-.06-1.33-.17-1.95H12v3.69h5.41a4.63 4.63 0 0 1-2.01 3.04v2.53h3.25c1.9-1.75 2.99-4.31 2.99-7.31Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.62-2.41l-3.25-2.53c-.89.6-2.03.96-3.37.96-2.59 0-4.79-1.75-5.57-4.1H3.09v2.61A9.98 9.98 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.43 13.92a5.94 5.94 0 0 1 0-3.82V7.49H3.09a9.98 9.98 0 0 0 0 8.94l3.34-2.51Z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.98c1.47 0 2.79.51 3.84 1.49l2.87-2.87C16.95 2.98 14.69 2 12 2a9.98 9.98 0 0 0-8.91 5.49l3.34 2.61c.78-2.35 2.98-4.12 5.57-4.12Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong. Please try again."
}

function isDuplicateEmailError(error) {
  if (!(error instanceof Error)) {
    return false
  }

  const status =
    typeof error.status === "number"
      ? error.status
      : typeof error.code === "number"
        ? error.code
        : null

  return (
    status === 409 ||
    error.message.trim().toLowerCase() === duplicateEmailErrorMessage.toLowerCase()
  )
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
  const isSignUp = mode === "sign-up"
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)

  const copy = authCopy[mode]
  const redirectTo = location.state?.from?.pathname || "/"
  const formPasswordHelper = useMemo(
    () => (isSignUp ? passwordRequirementText : ""),
    [isSignUp],
  )

  const updateFieldError = (field, message = "") => {
    setFieldErrors((current) => {
      if (!current[field] && !message) {
        return current
      }

      if (!message) {
        const nextErrors = { ...current }
        delete nextErrors[field]
        return nextErrors
      }

      return {
        ...current,
        [field]: message,
      }
    })
  }

  const handleGoogleSignIn = async () => {
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error),
      })
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!supabase) {
      setFeedback({
        type: "error",
        message: "Add your Supabase URL and publishable key before using the auth flow.",
      })
      return
    }

    const { errors, values } = validateAuthFields({
      confirmPassword,
      email,
      fullName,
      mode,
      password,
    })

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFeedback({
        type: "error",
        message: "Review the highlighted fields and try again.",
      })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })
    setFieldErrors({})

    try {
      if (mode === "sign-in") {
        await clearLocalSupabaseSession()

        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })

        if (error) {
          throw error
        }

        navigate(redirectTo, { replace: true })
      } else {
        const emailRedirectTo = `${window.location.origin}/`
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { full_name: values.fullName },
            emailRedirectTo,
          },
        })

        if (error) {
          throw error
        }

        if (data.session) {
          navigate("/", { replace: true })
          return
        }

        setPassword("")
        setConfirmPassword("")
        setFeedback({
          type: "success",
          message:
            "Account created. Check your inbox to confirm your email before signing in.",
        })
      }
    } catch (error) {
      const message =
        isSignUp && isDuplicateEmailError(error)
          ? duplicateEmailErrorMessage
          : getErrorMessage(error)

      if (isSignUp && message === duplicateEmailErrorMessage) {
        setFieldErrors({ email: duplicateEmailErrorMessage })
      }

      setFeedback({
        type: "error",
        message,
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
                {isSignUp ? (
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input
                      id="full-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(event) => {
                        setFullName(event.target.value)
                        updateFieldError("fullName")
                      }}
                      disabled={isSubmitting || !isConfigured}
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      maxLength={120}
                      required
                    />
                    {fieldErrors.fullName ? (
                      <p className="text-xs leading-5 text-destructive">
                        {fieldErrors.fullName}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      updateFieldError("email")
                    }}
                    disabled={isSubmitting || !isConfigured}
                    aria-invalid={Boolean(fieldErrors.email)}
                    required
                  />
                  {fieldErrors.email ? (
                    <p className="text-xs leading-5 text-destructive">
                      {fieldErrors.email}
                    </p>
                  ) : null}
                </div>

                <PasswordField
                  id="password"
                  label="Password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    updateFieldError("password")

                    if (isSignUp && fieldErrors.confirmPassword) {
                      updateFieldError("confirmPassword")
                    }
                  }}
                  disabled={isSubmitting || !isConfigured}
                  error={fieldErrors.password}
                  helperText={formPasswordHelper}
                  visible={isPasswordVisible}
                  onToggleVisibility={() =>
                    setIsPasswordVisible((current) => !current)
                  }
                />

                {isSignUp ? (
                  <PasswordField
                    id="confirm-password"
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      updateFieldError("confirmPassword")
                    }}
                    disabled={isSubmitting || !isConfigured}
                    error={fieldErrors.confirmPassword}
                    visible={isConfirmPasswordVisible}
                    onToggleVisibility={() =>
                      setIsConfirmPasswordVisible((current) => !current)
                    }
                  />
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full justify-between rounded-2xl px-4 text-sm"
                  disabled={isSubmitting || !isConfigured}
                >
                  <span>{isSubmitting ? "Working..." : copy.cta}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </form>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Or continue with
                  </span>
                  <Separator className="flex-1" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-border/70 bg-background/80"
                  disabled={isSubmitting || !isConfigured}
                  onClick={() => void handleGoogleSignIn()}
                >
                  <GoogleMark className="size-4" />
                  Continue with Google
                </Button>
              </div>

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
