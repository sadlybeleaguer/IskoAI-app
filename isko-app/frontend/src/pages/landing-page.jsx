import { Link } from "react-router-dom"
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  FileText,
  Ghost,
  ListChecks,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const featureGroups = [
  {
    icon: MessageSquare,
    eyebrow: "Ask with context",
    title: "Start in chat and keep the thread useful.",
    description:
      "Pick from enabled models, switch tools for the task at hand, and work inside a thread built for real study sessions.",
    bullets: [
      "Model selection directly in the workspace",
      "Tool modes for math, programming, complex problems, and quiz work",
      "Temporary chats for one-off prompts and fresh starts",
    ],
  },
  {
    icon: FileText,
    eyebrow: "Keep your material connected",
    title: "Attach notes and files instead of copying context around.",
    description:
      "Bring note context into the assistant, upload supporting files, and keep related threads organized with folders and archives.",
    bullets: [
      "Attach a note to keep reference material active in a thread",
      "Upload files inside chat when you need extra context",
      "Organize conversations with folders, archives, and saved threads",
    ],
  },
  {
    icon: CalendarDays,
    eyebrow: "Plan the work",
    title: "Move from conversation to schedule without leaving the workspace.",
    description:
      "Use the notes library for long-form work and the calendar view for upcoming deadlines, study blocks, and event planning.",
    bullets: [
      "Dedicated notes library and editor",
      "Calendar month view with upcoming event sidebar",
      "One workspace shell across chat, notes, and planning",
    ],
  },
  {
    icon: ListChecks,
    eyebrow: "Check understanding",
    title: "Turn a good explanation into a quiz while the topic is still fresh.",
    description:
      "Generate quizzes from an active chat thread, refine the focus, submit answers, and review graded feedback in the same flow.",
    bullets: [
      "Quiz generation from saved thread context",
      "Multiple formats with difficulty and question count controls",
      "Saved attempts with grading and feedback",
    ],
  },
]

const studyFlow = [
  {
    step: "01",
    title: "Ask the assistant",
    description:
      "Start with a real question, choose the right model, and steer the thread with the tool that matches the problem.",
  },
  {
    step: "02",
    title: "Attach the right context",
    description:
      "Bring in notes or files when the topic needs more than a blank prompt and keep everything inside the same workspace.",
  },
  {
    step: "03",
    title: "Save the output",
    description:
      "Move the useful parts into notes or plan the next step on the calendar instead of losing them in scattered tabs.",
  },
  {
    step: "04",
    title: "Generate a quiz",
    description:
      "Use the recent thread as quiz context, answer inside the app, and review the graded result immediately.",
  },
]

const trustCards = [
  {
    icon: Search,
    title: "Search across your workspace",
    description:
      "Workspace search already spans chats, notes, and calendar records, so past context is still reachable when you need it.",
  },
  {
    icon: Shield,
    title: "Managed model availability",
    description:
      "Admins can control which models are available to users, keeping the assistant surface easier to manage for classes or teams.",
  },
  {
    icon: Ghost,
    title: "Temporary when you need it",
    description:
      "Start a temporary chat for quick exploration or one-off questions without turning every prompt into a long-running thread.",
  },
]

const sectionShellClassName = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[44rem] lg:ml-auto lg:max-w-none">
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-6 h-40 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-8 bottom-8 h-36 w-36 rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-[0_40px_120px_-52px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-5 dark:border-white/10 dark:bg-black/35">
        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.08fr)_15.5rem]">
          <Card className="h-full border-white/60 bg-white/90 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-background/80">
            <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 border-b border-border/60 pb-4">
              <CardAction>
                <Badge className="rounded-full px-3 py-1" variant="outline">
                  <Sparkles className="size-3.5" />
                  Active model
                </Badge>
              </CardAction>
              <CardTitle className="min-w-0 pr-2 text-lg">AI workspace</CardTitle>
              <CardDescription className="max-w-md pr-2">
                Chat with the right model and keep the thread on task.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-4">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      Explain photosynthesis like I&apos;m reviewing for a quiz.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tool: Quiz preparation
                    </div>
                  </div>
                  <Badge className="rounded-full" variant="secondary">
                    Quiz
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
                    <Brain className="size-4 text-accent-foreground dark:text-background" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-foreground">
                      Chlorophyll captures light energy, then the plant converts
                      water and carbon dioxide into glucose and oxygen. Let&apos;s
                      turn that into a short review quiz next.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border bg-background px-2.5 py-1">
                        Note attached
                      </span>
                      <span className="rounded-full border bg-background px-2.5 py-1">
                        2 files added
                      </span>
                      <span className="rounded-full border bg-background px-2.5 py-1">
                        Foldered thread
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full px-3 py-1" variant="outline">
                  Math
                </Badge>
                <Badge className="rounded-full px-3 py-1" variant="outline">
                  Programming
                </Badge>
                <Badge className="rounded-full px-3 py-1" variant="outline">
                  Complex Problems
                </Badge>
                <Badge className="rounded-full px-3 py-1" variant="outline">
                  Quiz
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid auto-rows-fr gap-4">
            <Card size="sm" className="h-full border-white/60 bg-white/85 py-0 dark:border-white/10 dark:bg-background/80">
              <CardHeader className="border-b border-border/60 pb-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <CardTitle className="min-w-0 text-base">Notes</CardTitle>
                  <FileText className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="flex h-full flex-col gap-3 py-4">
                <div className="h-2.5 w-2/3 rounded-full bg-primary/20" />
                <div className="h-2.5 w-full rounded-full bg-muted" />
                <div className="h-2.5 w-5/6 rounded-full bg-muted" />
                <div className="mt-auto rounded-xl border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                  Save explanations, summaries, and references in one place.
                </div>
              </CardContent>
            </Card>

            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card size="sm" className="h-full border-white/60 bg-white/85 py-0 dark:border-white/10 dark:bg-background/80">
                <CardHeader className="border-b border-border/60 pb-3">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <CardTitle className="min-w-0 text-base">Calendar</CardTitle>
                    <CalendarDays className="size-4 text-secondary" />
                  </div>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-3 py-4">
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }).map((_, index) => (
                      <div
                        key={index}
                        className={`h-7 rounded-md ${
                          index === 4 || index === 8
                            ? "bg-secondary/50"
                            : "bg-muted/70"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Plan deadlines, review blocks, and upcoming sessions.
                  </p>
                </CardContent>
              </Card>

              <Card size="sm" className="h-full border-white/60 bg-white/85 py-0 dark:border-white/10 dark:bg-background/80">
                <CardHeader className="border-b border-border/60 pb-3">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <CardTitle className="min-w-0 text-base">Quiz</CardTitle>
                    <ListChecks className="size-4 text-accent-foreground dark:text-accent" />
                  </div>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-3 py-4">
                  <div className="rounded-xl border bg-background/80 px-3 py-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Thread context ready</span>
                      <CheckCircle2 className="size-4 text-primary" />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div className="h-2 w-3/4 rounded-full bg-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generate, answer, and grade without leaving the study flow.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(251,146,60,0.16),transparent_24%),radial-gradient(circle_at_70%_78%,rgba(16,185,129,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.76),rgba(248,250,252,0.98))] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(251,146,60,0.16),transparent_24%),radial-gradient(circle_at_70%_78%,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,1))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.26),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]"
      />

      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className={`${sectionShellClassName} flex items-center justify-between gap-4 py-4`}>
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
              <Brain className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">IskoAI</div>
              <div className="text-xs text-muted-foreground">Student workspace</div>
            </div>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#workspace"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Workspace
            </a>
            <a
              href="#flow"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Study Flow
            </a>
            <a
              href="#control"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Control
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full px-4 sm:inline-flex">
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full px-4 sm:px-5">
              <Link to="/sign-up">
                Create account
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className={`${sectionShellClassName} pb-16 pt-14 lg:pb-24 lg:pt-20`}>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-16 xl:items-center">
          <div className="max-w-2xl lg:pr-4">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Zap className="size-3.5" />
              AI study workspace for students
            </Badge>

            <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Ask, organize, plan, and quiz in one study flow.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              IskoAI brings your assistant chat, notes, calendar, and quiz
              generation into one workspace so useful study sessions turn into
              saved output instead of scattered tabs.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 rounded-full px-6 text-sm sm:w-auto">
                <Link to="/sign-up">
                  Start your workspace
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 rounded-full border-border/70 bg-background/70 px-6 text-sm sm:w-auto"
              >
                <a href="#workspace">See how it works</a>
              </Button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3 sm:auto-rows-fr">
              <div className="h-full rounded-2xl border border-border/60 bg-background/70 px-4 py-4 backdrop-blur-sm">
                <div className="text-sm font-medium">4 core workspaces</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Chat, Notes, Calendar, and Quiz
                </div>
              </div>
              <div className="h-full rounded-2xl border border-border/60 bg-background/70 px-4 py-4 backdrop-blur-sm">
                <div className="text-sm font-medium">Connected context</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Notes, files, folders, and thread history
                </div>
              </div>
              <div className="h-full rounded-2xl border border-border/60 bg-background/70 px-4 py-4 backdrop-blur-sm">
                <div className="text-sm font-medium">Review built in</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Generate and grade quizzes from discussion
                </div>
              </div>
            </div>
          </div>

          <div className="lg:pt-2 xl:pt-0">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section
        id="workspace"
        className="scroll-mt-24 border-y border-border/40 bg-background/40 py-20"
      >
        <div className={sectionShellClassName}>
          <div className="max-w-3xl">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Workspace
            </Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Built around the features the system already gives students.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              The point is not just getting an answer. The workspace helps you
              keep the answer, connect it to your materials, schedule the next
              step, and turn it into review.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:auto-rows-fr">
            {featureGroups.map((feature) => {
              const Icon = feature.icon

              return (
                <Card
                  key={feature.title}
                  className="h-full gap-0 border-white/60 bg-white/75 py-0 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.36)] backdrop-blur-sm dark:border-white/10 dark:bg-background/70"
                >
                  <CardHeader className="grid-cols-[auto_minmax(0,1fr)] content-start gap-x-4 gap-y-3 border-b border-border/60 pb-5 sm:min-h-[12rem]">
                    <div className="row-span-3 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/10">
                      <Icon className="size-5" />
                    </div>
                    <Badge variant="outline" className="w-fit rounded-full px-2.5 py-0.5">
                      {feature.eyebrow}
                    </Badge>
                    <CardTitle className="min-w-0 text-xl tracking-tight">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="max-w-xl text-sm leading-6 sm:text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-5">
                    <ul className="grid gap-3">
                      {feature.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span className="text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                            {bullet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section id="flow" className="scroll-mt-24 py-20">
        <div className={sectionShellClassName}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="max-w-xl lg:pr-4">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Study Flow
              </Badge>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                One study session can move from question to review without
                switching systems.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                The landing page should reflect the real path through the app:
                ask in chat, bring in context, save what matters, then test what
                you understood.
              </p>

              <div className="mt-8 rounded-[1.75rem] border border-primary/20 bg-primary/5 p-5 shadow-[0_20px_70px_-46px_rgba(59,130,246,0.45)]">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium tracking-tight">
                      The value is continuity.
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Instead of treating chat, notes, planning, and review as
                      separate tools, IskoAI keeps them close enough that each
                      action can feed the next one.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {studyFlow.map((item) => (
                <Card
                  key={item.step}
                  className="h-full border-white/60 bg-white/70 py-0 backdrop-blur-sm dark:border-white/10 dark:bg-background/70"
                >
                  <CardContent className="grid gap-4 px-5 py-5 sm:grid-cols-[4rem_minmax(0,1fr)] sm:items-start">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-lg font-semibold tracking-tight text-foreground">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium tracking-tight">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="control"
        className="scroll-mt-24 border-y border-border/40 bg-muted/20 py-20"
      >
        <div className={sectionShellClassName}>
          <div className="max-w-3xl">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Control
            </Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Student-first on the surface, with enough control behind it.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              The product leads with student workflows, but the system also
              includes search, temporary chats, and admin-controlled model
              availability so the workspace stays manageable as it grows.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {trustCards.map((card) => {
              const Icon = card.icon

              return (
                <Card
                  key={card.title}
                  className="h-full gap-0 border-white/60 bg-white/80 py-0 shadow-[0_20px_70px_-46px_rgba(15,23,42,0.3)] backdrop-blur-sm dark:border-white/10 dark:bg-background/70"
                >
                  <CardHeader className="content-start gap-3 border-b border-border/60 pb-5 sm:min-h-[10.5rem]">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/15">
                      <Icon className="size-5 text-foreground" />
                    </div>
                    <CardTitle className="text-xl tracking-tight">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 sm:text-base">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className={sectionShellClassName}>
          <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.11),rgba(16,185,129,0.06),rgba(251,146,60,0.12))] py-0 shadow-[0_36px_120px_-60px_rgba(15,23,42,0.55)]">
            <CardContent className="px-6 py-8 sm:px-8 sm:py-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="max-w-2xl">
                  <Badge variant="outline" className="rounded-full border-white/40 bg-background/60 px-3 py-1">
                    Ready to start
                  </Badge>
                  <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                    Turn your next study session into something you can keep.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                    Start with chat, attach context when you need it, save the
                    useful parts, and end with a quiz instead of another lost tab.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:justify-self-end">
                  <Button asChild size="lg" className="h-11 rounded-full px-6 sm:w-auto">
                    <Link to="/sign-up">
                      Create account
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 rounded-full border-border/70 bg-background/70 px-6 sm:w-auto"
                  >
                    <Link to="/sign-in">Sign in</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/50 bg-background/70">
        <div className={`${sectionShellClassName} flex flex-col gap-5 py-8 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <Brain className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">IskoAI</div>
              <div className="text-xs text-muted-foreground">
                Chat, notes, calendar, and quiz in one workspace
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <a href="#workspace" className="transition-colors hover:text-foreground">
              Workspace
            </a>
            <a href="#flow" className="transition-colors hover:text-foreground">
              Study Flow
            </a>
            <a href="#control" className="transition-colors hover:text-foreground">
              Control
            </a>
            <Link to="/sign-in" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link to="/sign-up" className="transition-colors hover:text-foreground">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
