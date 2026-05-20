import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, Eye, EyeOff } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LightRays } from "@/components/ui/light-rays"
import { SidebarLogo } from "@/components/ui/sidebar-logo"
import { useAuth } from "@/context/auth-context"
import { envVariableHints, supabase } from "@/lib/supabaseClient"
import { cn } from "@/utils/cn"

const authCopy = {
  "sign-in": {
    eyebrow: "Welcome back",
    title: "Sign in to your account",
    description:
      "Use your email and password to access.",
    cta: "Sign in",
    alternateLabel: "Need an account?",
    alternateHref: "/sign-up",
    alternateText: "Create one",
  },
  "sign-up": {
    eyebrow: "Start focused",
    title: "Create account",
    description:
      "Create an account with your name, email, and a strong password.",
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
    <div className="relative isolate min-h-screen overflow-hidden bg-background">
      <main className="flex min-h-screen w-full bg-[radial-gradient(circle_at_18%_12%,rgba(96,165,250,0.24),transparent_30%),radial-gradient(circle_at_72%_10%,rgba(147,197,253,0.32),transparent_28%),radial-gradient(circle_at_88%_82%,rgba(59,130,246,0.16),transparent_34%),linear-gradient(135deg,#f8fbff_0%,#eff6ff_42%,#dbeafe_100%)] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(96,165,250,0.3),transparent_32%),radial-gradient(circle_at_72%_10%,rgba(147,197,253,0.24),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(59,130,246,0.3),transparent_36%),linear-gradient(135deg,#020617_0%,#0b1b3a_46%,#1e3a8a_100%)]">
        <div className="grid min-h-screen w-full overflow-hidden lg:grid-cols-[minmax(0,0.95fr)_minmax(34rem,1.05fr)]">
          <section className="relative isolate flex min-h-[22rem] overflow-hidden border-b border-white/20 bg-[linear-gradient(145deg,#0b1b3a_0%,#1e40af_42%,#60a5fa_100%)] p-6 text-white sm:p-8 lg:min-h-screen lg:border-b-0 lg:border-r lg:border-white/12 lg:p-10 dark:bg-[linear-gradient(145deg,#020617_0%,#123a72_46%,#3b82f6_100%)]">
            <LightRays
              className="opacity-95"
              count={15}
              color="rgba(96, 165, 250, 0.48)"
              blur={42}
              speed={12}
              length="92vh"
            />
            <LightRays
              className="opacity-70 mix-blend-screen"
              count={10}
              color="rgba(191, 219, 254, 0.42)"
              blur={68}
              speed={18}
              length="78vh"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_16%,rgba(191,219,254,0.42),transparent_27%),radial-gradient(circle_at_72%_20%,rgba(96,165,250,0.42),transparent_36%),radial-gradient(circle_at_50%_84%,rgba(59,130,246,0.28),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(2,6,23,0.24))]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22),transparent_32%,rgba(255,255,255,0.12)_58%,transparent_78%)] opacity-80"
            />

            <div className="relative z-10 flex min-h-full w-full flex-col justify-between">
              <Link to="/" aria-label="IskoAI home" className="inline-flex w-fit">
                <SidebarLogo className="w-40 brightness-0 invert" contextLabel="Auth" />
              </Link>

              <div className="mt-16 max-w-xl lg:mt-0">
                <p className="text-sm font-medium text-white/78">You can easily</p>
                <h1 className="mt-3 max-w-lg text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Get access to your personal study hub.
                </h1>
                <p className="mt-5 max-w-md text-base leading-7 text-white/76 sm:text-lg">
                  Bring clarity, productivity, notes, planning, and AI assistance into one focused workspace.
                </p>
              </div>

              <div aria-hidden="true" className="mt-12 h-px w-32 bg-white/30" />
            </div>
          </section>

          <section className="flex min-h-full items-center justify-center bg-white/42 px-5 py-8 backdrop-blur-sm sm:px-8 lg:min-h-screen lg:px-10 dark:bg-slate-950/28">
            <div className="w-full max-w-[34rem]">
              <div className="mb-8 flex justify-center lg:hidden">
                <Link to="/" aria-label="IskoAI home">
                  <SidebarLogo className="w-40" contextLabel="Auth" />
                </Link>
              </div>

              <Card className="w-full border-white/70 bg-card/84 py-0 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.62)] backdrop-blur-xl dark:border-white/10 dark:bg-card/76">
                <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
                  <div className="border-b border-border/60 pb-6">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {copy.eyebrow}
                      </p>
                      <h2 className="font-heading text-2xl font-medium tracking-tight sm:text-3xl">
                        {copy.title}
                      </h2>
                      <p className="max-w-md text-sm leading-6 text-muted-foreground">
                        {copy.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5 pt-6">
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

                    <p className="text-sm text-muted-foreground">
                      {copy.alternateLabel}{" "}
                      <Link
                        className="font-medium text-foreground underline underline-offset-4"
                        to={copy.alternateHref}
                      >
                        {copy.alternateText}
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
