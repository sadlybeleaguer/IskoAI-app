import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  CircleHelp,
  FileText,
  LogOut,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  PenSquare,
  Shield,
  X,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const starterThreads = []

const starterPrompts = [
  "Draft an onboarding checklist for a new product hire.",
  "Summarize a meeting into decisions, risks, and next steps.",
  "Turn a rough idea into a one-page project brief.",
]

const landingActions = [
  {
    title: "Summarize notes",
    description: "Placeholder tile for your frontend team to wire into summaries.",
    icon: FileText,
    prompt: "Summarize these notes into key points and next steps.",
  },
  {
    title: "Draft content",
    description: "Placeholder tile for writing flows, briefs, and rough drafts.",
    icon: PenSquare,
    prompt: "Create a first draft from this rough idea.",
  },
  {
    title: "Answer questions",
    description: "Placeholder tile for research, Q&A, and lightweight support flows.",
    icon: CircleHelp,
    prompt: "Answer this clearly and keep it concise.",
  },
]

const cannedReplies = [
  "I can turn that into a tighter draft, a checklist, or a handoff note. Pick the format and I will keep it concise.",
  "Here is the cleanest next move: define the outcome, list the hard constraints, and cut anything that does not affect the first release.",
  "If you want a usable answer quickly, I would structure it around decisions, risks, owners, and the immediate next action.",
]

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createMessage(role, content) {
  return {
    id: createId("message"),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

function getThreadTitle(content) {
  return content.trim().replace(/\s+/g, " ").slice(0, 40) || "Untitled chat"
}

function formatRelativeTime(value) {
  const date = new Date(value)

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function buildReply(content) {
  const prompt = content.trim()
  const fallback = cannedReplies[prompt.length % cannedReplies.length]

  if (prompt.length < 80) {
    return `${fallback} If you want, I can expand this into a working draft next.`
  }

  return `${fallback} I would keep the first pass short, then iterate once the structure is locked.`
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return "Unable to complete the request."
}

function getInitials(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function ChatPage() {
  const navigate = useNavigate()
  const { isSuperadmin, profile, userEmail } = useAuth()
  const [threads, setThreads] = useState(starterThreads)
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [draft, setDraft] = useState("")
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [responseThreadId, setResponseThreadId] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")
  const responseTimeoutRef = useRef(null)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  )

  const sortedThreads = useMemo(
    () =>
      [...threads].sort(
        (left, right) =>
          new Date(right.updatedAt).valueOf() - new Date(left.updatedAt).valueOf(),
      ),
    [threads],
  )

  const displayName = profile?.full_name?.trim() || userEmail || "IskoAI user"
  const initials = getInitials(displayName)
  const isPendingThread = responseThreadId && responseThreadId === activeThreadId

  useEffect(() => {
    return () => {
      if (responseTimeoutRef.current) {
        window.clearTimeout(responseTimeoutRef.current)
      }
    }
  }, [])

  const closeMobileNav = () => {
    setIsNavOpen(false)
  }

  const handleNewChat = () => {
    if (responseTimeoutRef.current) {
      window.clearTimeout(responseTimeoutRef.current)
      responseTimeoutRef.current = null
    }

    setActiveThreadId(null)
    setDraft("")
    setIsResponding(false)
    setResponseThreadId("")
    closeMobileNav()
  }

  const handleSelectThread = (threadId) => {
    setActiveThreadId(threadId)
    closeMobileNav()
  }

  const handlePromptClick = (prompt) => {
    setDraft(prompt)
  }

  const handleSend = (event) => {
    event.preventDefault()

    const content = draft.trim()

    if (!content || isResponding) {
      return
    }

    const userMessage = createMessage("user", content)
    const nextThreadId = activeThreadId || createId("thread")
    const nextUpdatedAt = userMessage.createdAt
    const nextTitle = activeThread?.title || getThreadTitle(content)

    setThreads((currentThreads) => {
      const threadExists = currentThreads.some((thread) => thread.id === nextThreadId)

      if (!threadExists) {
        return [
          {
            id: nextThreadId,
            title: nextTitle,
            updatedAt: nextUpdatedAt,
            messages: [userMessage],
          },
          ...currentThreads,
        ]
      }

      return currentThreads.map((thread) =>
        thread.id === nextThreadId
          ? {
              ...thread,
              title: thread.title || nextTitle,
              updatedAt: nextUpdatedAt,
              messages: [...thread.messages, userMessage],
            }
          : thread,
      )
    })

    setActiveThreadId(nextThreadId)
    setDraft("")
    setIsResponding(true)
    setResponseThreadId(nextThreadId)

    responseTimeoutRef.current = window.setTimeout(() => {
      const assistantMessage = createMessage("assistant", buildReply(content))

      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === nextThreadId
            ? {
                ...thread,
                updatedAt: assistantMessage.createdAt,
                messages: [...thread.messages, assistantMessage],
              }
            : thread,
        ),
      )
      setIsResponding(false)
      setResponseThreadId("")
      responseTimeoutRef.current = null
    }, 480)
  }

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      handleSend(event)
    }
  }

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

  const renderUserMenu = (triggerClassName = "h-auto px-2 py-2") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={triggerClassName}
        >
          <span className="flex size-8 items-center justify-center rounded-md border bg-background text-xs font-medium">
            {initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{displayName}</span>
          <MoreHorizontal data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={handleNewChat}>
            <MessageSquarePlus data-icon="inline-start" />
            New chat
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {isSuperadmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/dashboard">
                  <Shield data-icon="inline-start" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              void handleSignOut()
            }}
            disabled={isSigningOut}
          >
            <LogOut data-icon="inline-start" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderLandingComposer = () => (
    <form className="flex flex-col gap-4" onSubmit={handleSend}>
      <div className="rounded-xl border bg-card">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Ask IskoAI anything..."
          className="min-h-36 resize-none border-0 px-5 py-5 shadow-none focus-visible:ring-0"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => handlePromptClick(prompt)}
              >
                {getThreadTitle(prompt)}
              </button>
            ))}
          </div>

          <Button type="submit" disabled={!draft.trim() || isResponding}>
            <ArrowUpRight data-icon="inline-start" />
            {isResponding ? "Thinking..." : "Send"}
          </Button>
        </div>
      </div>
    </form>
  )

  const renderThreadComposer = () => (
    <div className="border-t bg-background">
      <form
        className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8"
        onSubmit={handleSend}
      >
        <div className="rounded-xl border bg-card">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Message IskoAI"
            className="min-h-28 resize-none border-0 px-5 py-5 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-sm text-muted-foreground">
              Press Enter to send. Use Shift+Enter for a new line.
            </p>
            <Button type="submit" disabled={!draft.trim() || isResponding}>
              <ArrowUpRight data-icon="inline-start" />
              {isResponding ? "Thinking..." : "Send"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )

  const renderSidebar = (mobile = false) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">IskoAI</p>
          <p className="truncate text-sm text-muted-foreground">Workspace</p>
        </div>
        {mobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={closeMobileNav}
            aria-label="Close navigation"
          >
            <X data-icon="inline-start" />
          </Button>
        ) : null}
      </div>

      <div className="border-b px-4 py-4">
        <Button
          type="button"
          className="w-full justify-start"
          onClick={handleNewChat}
        >
          <MessageSquarePlus data-icon="inline-start" />
          New chat
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">History</p>
            <div className="rounded-lg border bg-background/60 p-3 text-sm text-muted-foreground">
              {sortedThreads.length
                ? "Recent chats"
                : "Chats will appear here once real conversations are created."}
            </div>
          </div>

          {sortedThreads.length ? (
            <div className="flex flex-col gap-2">
              {sortedThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left transition-colors",
                    activeThreadId === thread.id
                      ? "bg-muted text-foreground"
                      : "bg-background text-foreground hover:bg-muted",
                  )}
                  onClick={() => handleSelectThread(thread.id)}
                >
                  <span className="truncate text-sm font-medium">{thread.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(thread.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="border-t px-3 py-3">
        {renderUserMenu("h-auto w-full justify-start px-2 py-2")}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-sidebar lg:block">
          {renderSidebar()}
        </aside>

        {isNavOpen ? (
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={closeMobileNav}
          >
            <aside
              className="h-full w-[250px] border-r bg-sidebar"
              onClick={(event) => event.stopPropagation()}
            >
              {renderSidebar(true)}
            </aside>
          </div>
        ) : null}

        <main className="flex min-h-screen min-w-0 flex-col bg-background">
          <header className="border-b bg-background">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setIsNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu data-icon="inline-start" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {activeThread?.title || "IskoAI"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="hidden sm:inline-flex"
                onClick={handleNewChat}
              >
                <MessageSquarePlus data-icon="inline-start" />
                New chat
              </Button>
              <div className="w-[13rem] max-w-[45vw]">
                {renderUserMenu("h-auto w-full justify-start px-2 py-1.5")}
              </div>
            </div>
          </header>

          {signOutError ? (
            <div className="border-b px-4 py-4 sm:px-6">
              <Alert variant="destructive">
                <AlertTitle>Sign-out failed</AlertTitle>
                <AlertDescription>{signOutError}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              {activeThread ? (
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                {activeThread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[44rem] rounded-xl px-4 py-3 text-sm leading-6",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border bg-card text-card-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  </article>
                ))}
                {isPendingThread ? (
                  <article className="flex justify-start">
                    <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                      IskoAI is drafting a reply...
                    </div>
                  </article>
                ) : null}
                </div>
              ) : (
                <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
                  <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="rounded-lg border bg-card px-4 py-2 text-sm font-medium">
                        IskoAI
                      </div>
                      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                        Start a smart conversation
                      </h1>
                    </div>

                    {renderLandingComposer()}

                    <div className="grid gap-3 md:grid-cols-3">
                      {landingActions.map((action) => {
                        const Icon = action.icon

                        return (
                          <button
                            key={action.title}
                            type="button"
                            className="text-left"
                            onClick={() => handlePromptClick(action.prompt)}
                          >
                            <Card className="h-full shadow-none transition-colors hover:bg-muted/60">
                              <CardHeader className="flex flex-col gap-3">
                                <div className="flex size-9 items-center justify-center rounded-md border bg-background">
                                  <Icon className="size-4" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <CardTitle className="text-base">
                                    {action.title}
                                  </CardTitle>
                                  <CardDescription className="text-sm leading-6">
                                    {action.description}
                                  </CardDescription>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-sm text-muted-foreground">
                                  IskoAI placeholder
                                </p>
                              </CardContent>
                            </Card>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            {activeThread ? renderThreadComposer() : null}
          </div>
        </main>
      </div>
    </div>
  )
}
