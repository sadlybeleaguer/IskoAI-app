import { Link } from "react-router-dom"
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AuroraText } from "@/components/ui/aurora-text"
import { SidebarLogo } from "@/components/ui/sidebar-logo"

const featureGroups = [
  {
    icon: MessageSquare,
    eyebrow: "Ask with context",
    title: "Chat that stays useful",
    description:
      "Choose the right model, switch tools, and keep each thread focused.",
    bullets: [
      "Model selection in the workspace",
      "Tool modes for focused work",
      "Temporary chats for quick starts",
    ],
  },
  {
    icon: FileText,
    eyebrow: "Keep your material connected",
    title: "Context stays attached",
    description:
      "Bring notes and files into the assistant without rebuilding context.",
    bullets: [
      "Attach notes to a thread",
      "Upload supporting files",
      "Organize with folders and archives",
    ],
  },
  {
    icon: CalendarDays,
    eyebrow: "Plan the work",
    title: "Plans stay close",
    description:
      "Turn useful output into notes, deadlines, and next study blocks.",
    bullets: [
      "Notes library and editor",
      "Calendar with upcoming events",
      "One shell for study work",
    ],
  },
  {
    icon: ListChecks,
    eyebrow: "Check understanding",
    title: "Review while it is fresh",
    description:
      "Generate a quiz from the active thread and review feedback immediately.",
    bullets: [
      "Thread-based quiz generation",
      "Format and difficulty controls",
      "Saved attempts with feedback",
    ],
  },
]

const studyFlow = [
  {
    step: "01",
    title: "Ask the assistant",
    description:
      "Choose a model and tool for the problem in front of you.",
  },
  {
    step: "02",
    title: "Attach the right context",
    description:
      "Add notes or files when the topic needs more than a blank prompt.",
  },
  {
    step: "03",
    title: "Save the output",
    description:
      "Keep the useful parts in notes or turn them into a calendar step.",
  },
  {
    step: "04",
    title: "Generate a quiz",
    description:
      "Use recent context to test recall and review graded feedback.",
  },
]

const trustCards = [
  {
    icon: Search,
    title: "Search across your workspace",
    description:
      "Find chats, notes, and calendar records from one search surface.",
  },
  {
    icon: Shield,
    title: "Managed model availability",
    description:
      "Keep the assistant surface manageable for classes or teams.",
  },
  {
    icon: Clock3,
    title: "Temporary when useful",
    description:
      "Explore quick questions without turning every prompt into a saved thread.",
  },
]

const sectionShellClassName = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
const auroraTextColors = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"]
const premiumCardClassName =
  "group relative h-full overflow-hidden rounded-xl border border-white/70 bg-white/80 shadow-[0_18px_70px_-48px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-all duration-300 ease-out before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent hover:-translate-y-1 hover:border-primary/30 hover:bg-white/90 hover:shadow-[0_28px_90px_-48px_rgba(59,130,246,0.55)] dark:border-white/10 dark:bg-background/70 dark:hover:bg-background/80"
const iconTileClassName =
  "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-accent/15 to-secondary/20 text-primary shadow-sm ring-1 ring-primary/10 transition-transform duration-300 group-hover:scale-105"

function NotesBentoBackground() {
  return (
    <div className="absolute inset-x-4 top-4 rounded-xl border bg-background/70 p-3 opacity-80 transition-transform duration-300 group-hover:-translate-y-1">
      <div className="h-2.5 w-2/3 rounded-full bg-primary/20" />
      <div className="mt-3 h-2.5 w-full rounded-full bg-muted" />
      <div className="mt-2 h-2.5 w-5/6 rounded-full bg-muted" />
      <div className="mt-3 h-9 rounded-lg border bg-background/80" />
    </div>
  )
}

function CalendarBentoBackground() {
  return (
    <div className="absolute inset-x-4 top-4 rounded-xl border bg-background/70 p-3 opacity-80 transition-transform duration-300 group-hover:-translate-y-1">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 14 }).map((_, index) => (
          <div
            key={index}
            className={`h-5 rounded-md ${
              index === 4 || index === 8 ? "bg-primary/45" : "bg-muted/70"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function QuizBentoBackground() {
  return (
    <div className="absolute inset-x-4 top-4 rounded-xl border bg-background/70 px-3 py-3 opacity-80 transition-transform duration-300 group-hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-2/3 rounded-full bg-muted" />
        <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted">
        <div className="h-2 w-3/4 rounded-full bg-primary" />
      </div>
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[44rem] lg:ml-auto lg:max-w-none">
      <div className="relative rounded-2xl border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(248,250,252,0.78))] p-3 shadow-[0_36px_110px_-58px_rgba(15,23,42,0.58)] backdrop-blur-xl sm:p-4 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.64))]">
        <BentoGrid className="auto-rows-[minmax(13.25rem,auto)] grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-6 xl:auto-rows-[13.25rem]">
          <Card className={`${premiumCardClassName} py-0 shadow-[0_22px_72px_-48px_rgba(15,23,42,0.42)] sm:col-span-2 xl:col-span-4 xl:row-span-3`}>
            <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-b border-border/50 px-5 py-5">
              <CardAction>
                <Badge className="rounded-full border-primary/20 bg-primary/10 px-3 py-1" variant="outline">
                  
                  Active model
                </Badge>
              </CardAction>
              <CardTitle className="min-w-0 pr-2 text-lg">AI workspace</CardTitle>
              <CardDescription className="max-w-md pr-2">
                Chat with the right model and keep the thread on task.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 py-5">
              <div className="rounded-xl border border-primary/15 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(147,197,253,0.1))] p-4 transition-transform duration-300 group-hover/card:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      Explain photosynthesis for a quiz.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tool: Quiz preparation
                    </div>
                  </div>
                  <Badge className="rounded-full border-primary/20 bg-primary/10 text-primary" variant="outline">
                    Quiz
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Brain className="size-4 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-foreground">
                      Chlorophyll captures light, then the plant turns water and
                      carbon dioxide into glucose and oxygen.
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

          <BentoCard
            name="Notes"
            description="Save explanations and references."
            Icon={FileText}
            href="#workspace"
            cta="View more"
            background={<NotesBentoBackground />}
            className="xl:col-span-2 xl:row-span-1"
          />

          <BentoCard
            name="Calendar"
            description="Plan deadlines and review blocks."
            Icon={CalendarDays}
            href="#workspace"
            cta="View more"
            background={<CalendarBentoBackground />}
            className="xl:col-span-2 xl:row-span-1"
          />

          <BentoCard
            name="Quiz"
            description="Generate and grade in the same flow."
            Icon={ListChecks}
            href="#workspace"
            cta="View more"
            background={<QuizBentoBackground />}
            className="xl:col-span-2 xl:row-span-1"
          />
        </BentoGrid>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(255,255,255,0.7)_32%,rgba(16,185,129,0.1)_64%,rgba(251,146,60,0.1)),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,250,252,0.98))] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(15,23,42,0.8)_32%,rgba(16,185,129,0.1)_64%,rgba(251,146,60,0.12)),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,1))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.26),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]"
      />

      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className={`${sectionShellClassName} flex items-center justify-between gap-4 py-4`}>
          <Link
            to="/"
            className="flex min-w-0 items-center rounded-xl transition-opacity duration-200 hover:opacity-85"
            aria-label="IskoAI home"
          >
            <SidebarLogo collapsed className="sm:hidden" contextLabel="Home" />
            <SidebarLogo className="hidden sm:flex" contextLabel="Home" />
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#workspace"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Workspace
            </a>
            <a
              href="#flow"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Study Flow
            </a>
            <a
              href="#control"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Control
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full px-4 hover:text-primary sm:inline-flex">
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

      <section className={`${sectionShellClassName} min-h-[calc(100svh-4.5rem)] pb-10 pt-8 sm:pt-10 lg:pb-12 lg:pt-10`}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-14 xl:gap-16">
          <div className="max-w-2xl lg:-translate-y-12 lg:pr-4 xl:-translate-y-16">
            <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Ask, organize, plan, and quiz in one{" "}
              <AuroraText
                colors={auroraTextColors}
                speed={0.75}
              >
                study
              </AuroraText>{" "}
              flow.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              IskoAI brings chat, notes, planning, and quiz review into one
              focused workspace for students.
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

          </div>

          <div>
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
              A focused{" "}
              <AuroraText colors={auroraTextColors} speed={0.75}>
                workspace
              </AuroraText>{" "}
              for real study tasks.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Ask a question, keep the useful context, plan the next move, and
              turn understanding into review.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:auto-rows-fr">
            {featureGroups.map((feature) => {
              const Icon = feature.icon

              return (
                <Card
                  key={feature.title}
                  className={`${premiumCardClassName} gap-0 py-0`}
                >
                  <CardHeader className="grid-cols-[auto_minmax(0,1fr)] content-start gap-x-4 gap-y-3 px-6 pb-4 pt-6">
                    <div className={`row-span-3 ${iconTileClassName}`}>
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
                  <CardContent className="px-6 pb-6 pt-2">
                    <ul className="grid gap-2.5 rounded-xl border border-border/50 bg-background/50 p-3.5">
                      {feature.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span className="text-sm leading-6 text-muted-foreground">
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
                From question to review, without breaking{" "}
                <AuroraText colors={auroraTextColors} speed={0.75}>
                  focus.
                </AuroraText>
                
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                Each step is designed to feed the next: ask, attach, save, and
                test.
              </p>

              <div className="mt-8 rounded-xl border border-primary/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.1),rgba(16,185,129,0.06))] p-5 shadow-[0_20px_70px_-46px_rgba(59,130,246,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
                <div className="flex items-start gap-3">
                  <div>
                    <h3 className="text-lg font-medium tracking-tight">
                      Built for continuity
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Chat, notes, planning, and review stay close enough that
                      progress does not get lost between tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {studyFlow.map((item) => (
                <Card
                  key={item.step}
                  className={`${premiumCardClassName} py-0`}
                >
                  <CardContent className="grid gap-4 px-6 py-6 sm:grid-cols-[4rem_minmax(0,1fr)] sm:items-center">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(251,146,60,0.12))] text-lg font-semibold tracking-tight text-foreground ring-1 ring-border/70 transition-transform duration-300 group-hover:scale-105">
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
              Clean for students, manageable for teams.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Helpful study workflows stay easy to use, while search and model
              controls keep the workspace organized as it grows.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {trustCards.map((card) => {
              const Icon = card.icon

              return (
                <Card
                  key={card.title}
                  className={`${premiumCardClassName} gap-0 py-0`}
                >
                  <CardHeader className="content-start gap-3 px-6 py-6">
                    <div className={iconTileClassName}>
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
          <Card className="overflow-hidden rounded-xl border-primary/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(16,185,129,0.07),rgba(251,146,60,0.13))] py-0 shadow-[0_36px_120px_-60px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
            <CardContent className="px-6 py-8 sm:px-8 sm:py-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="max-w-2xl">
                  <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                    Turn your next study session into something you can keep.
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                    Start with chat, save what matters, and end with a quiz.
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
            <SidebarLogo className="w-32" contextLabel="Footer" />
            <p className="text-xs text-muted-foreground">
              Chat, notes, calendar, and quiz in one workspace
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <a href="#workspace" className="transition-colors hover:text-primary">
              Workspace
            </a>
            <a href="#flow" className="transition-colors hover:text-primary">
              Study Flow
            </a>
            <a href="#control" className="transition-colors hover:text-primary">
              Control
            </a>
            <Link to="/sign-in" className="transition-colors hover:text-primary">
              Sign in
            </Link>
            <Link to="/sign-up" className="transition-colors hover:text-primary">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
