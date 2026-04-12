import { useEffect, useMemo, useRef, useState } from "react"
import {
  LogOut,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Sparkles,
  X,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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

const starterThreads = [
  {
    id: "thread-brief",
    title: "Client kickoff brief",
    updatedAt: "2026-04-12T08:20:00.000Z",
    messages: [
      {
        id: "message-brief-1",
        role: "user",
        content: "Outline a kickoff agenda for a small AI product sprint.",
        createdAt: "2026-04-12T08:18:00.000Z",
      },
      {
        id: "message-brief-2",
        role: "assistant",
        content:
          "Start with goals, constraints, data availability, and who owns the first shipping milestone. Close with a written decision log.",
        createdAt: "2026-04-12T08:20:00.000Z",
      },
    ],
  },
  {
    id: "thread-rollout",
    title: "Release note draft",
    updatedAt: "2026-04-11T16:45:00.000Z",
    messages: [
      {
        id: "message-rollout-1",
        role: "user",
        content: "Write a short release note for a chat workspace refresh.",
        createdAt: "2026-04-11T16:42:00.000Z",
      },
      {
        id: "message-rollout-2",
        role: "assistant",
        content:
          "The workspace now opens into a focused chat view with faster navigation, clearer thread history, and a simpler compose flow.",
        createdAt: "2026-04-11T16:45:00.000Z",
      },
    ],
  },
]

const starterPrompts = [
  "Draft an onboarding checklist for a new product hire.",
  "Summarize a meeting into decisions, risks, and next steps.",
  "Turn a rough idea into a one-page project brief.",
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
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

  const renderSidebar = (mobile = false) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-medium">IskoAI</span>
          <span className="truncate text-sm text-muted-foreground">Chat workspace</span>
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
          variant="outline"
          className="w-full justify-start"
          onClick={handleNewChat}
        >
          <MessageSquarePlus data-icon="inline-start" />
          New chat
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-3 py-3">
          {sortedThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={[
                "flex w-full flex-col items-start gap-1 rounded-md border px-3 py-3 text-left transition-colors",
                activeThreadId === thread.id
                  ? "border-border bg-muted text-foreground"
                  : "border-transparent bg-transparent text-foreground hover:bg-muted",
              ].join(" ")}
              onClick={() => handleSelectThread(thread.id)}
            >
              <span className="truncate text-sm font-medium">{thread.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(thread.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t px-3 py-3">
        {renderUserMenu("h-auto w-full justify-start px-2 py-2")}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={[
          "grid min-h-screen",
          isSidebarCollapsed
            ? "lg:grid-cols-[72px_minmax(0,1fr)]"
            : "lg:grid-cols-[256px_minmax(0,1fr)]",
        ].join(" ")}
      >
        <aside className="hidden border-r bg-sidebar lg:block">
          {isSidebarCollapsed ? (
            <div className="flex h-full flex-col items-center gap-3 border-r px-3 py-4">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsSidebarCollapsed(false)}
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen data-icon="inline-start" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handleNewChat}
                aria-label="Start a new chat"
              >
                <MessageSquarePlus data-icon="inline-start" />
              </Button>
            </div>
          ) : (
            renderSidebar()
          )}
        </aside>

        {isNavOpen ? (
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={closeMobileNav}
          >
            <aside
              className="h-full w-[256px] border-r bg-sidebar shadow-sm"
              onClick={(event) => event.stopPropagation()}
            >
              {renderSidebar(true)}
            </aside>
          </div>
        ) : null}

        <main className="flex min-h-screen min-w-0 flex-col">
          <header className="border-b bg-background">
            <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="hidden lg:inline-flex"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen data-icon="inline-start" />
                ) : (
                  <PanelLeftClose data-icon="inline-start" />
                )}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {activeThread?.title || "IskoAI"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {activeThread
                    ? `${activeThread.messages.length} messages`
                    : "Start a new conversation"}
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

          <ScrollArea className="min-h-0 flex-1">
            {activeThread ? (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
                {activeThread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={[
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "max-w-[42rem] rounded-lg px-4 py-3 text-sm leading-6",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border bg-card text-card-foreground",
                      ].join(" ")}
                    >
                      {message.content}
                    </div>
                  </article>
                ))}
                {isPendingThread ? (
                  <article className="flex justify-start">
                    <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
                      IskoAI is drafting a reply...
                    </div>
                  </article>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-4 py-8 sm:px-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-base font-medium">
                    <Sparkles className="size-4 text-muted-foreground" />
                    IskoAI
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start with a prompt or pick one of the drafts below.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded-lg border px-4 py-4 text-left text-sm leading-6 transition-colors hover:bg-muted"
                      onClick={() => handlePromptClick(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="border-t bg-background">
            <form
              className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:px-6"
              onSubmit={handleSend}
            >
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Message IskoAI"
                className="min-h-28 resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Press Enter to send. Use Shift+Enter for a new line.
                </p>
                <Button type="submit" disabled={!draft.trim() || isResponding}>
                  <Sparkles data-icon="inline-start" />
                  {isResponding ? "Thinking..." : "Send"}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
