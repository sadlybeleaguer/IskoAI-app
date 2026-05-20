import { Link } from "react-router-dom"
import {
  ArrowRight,
  Braces,
  Code2,
  Cpu,
  Layers3,
  Sparkles,
  Terminal,
} from "lucide-react"

import { MarketingNav } from "@/components/marketing/marketing-nav"
import { AuroraText } from "@/components/ui/aurora-text"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarLogo } from "@/components/ui/sidebar-logo"
import img1 from "@/components/ui/img1.png"
import img2 from "@/components/ui/img2.png"
import img3 from "@/components/ui/img3.png"
import img4 from "@/components/ui/img4.png"

const sectionShellClassName = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
const auroraTextColors = ["#2563eb", "#10b981", "#f59e0b", "#60a5fa"]

const developers = [
  {
    accent: "from-blue-500/30 via-cyan-400/20 to-emerald-300/20",
    image: img1,
    metric: "01",
    name: "Johann Agpasa",
  },
  {
    accent: "from-emerald-400/30 via-blue-400/20 to-orange-300/20",
    image: img2,
    metric: "02",
    name: "Gabriel Uy",
    
  },
  {
    accent: "from-orange-300/35 via-blue-400/20 to-emerald-300/20",
    image: img3,
    metric: "03",
    name: "Hazeline Sarmiento",
    
    
  },
  {
    accent: "from-sky-400/30 via-indigo-400/20 to-emerald-300/20",
    image: img4,
    metric: "04",
    name: "Dominic Espiritu",
    
  },
]

const capabilityPills = [
  { icon: Terminal, label: "Frontend" },
  { icon: Cpu, label: "AI logic" },
  { icon: Braces, label: "Backend" },
  { icon: Layers3, label: "Product design" },
]

function DeveloperPortrait({ developer, index }) {
  const isRaised = index === 1 || index === 2

  return (
    <figure
      className={`group relative isolate min-h-[28rem] overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/55 p-3 shadow-[0_36px_120px_-66px_rgba(15,23,42,0.62)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-primary/35 hover:bg-white/70 hover:shadow-[0_46px_140px_-62px_rgba(37,99,235,0.58)] dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/10 lg:min-h-[32rem] ${
        isRaised ? "lg:translate-y-10" : ""
      }`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${developer.accent} opacity-80 transition-opacity duration-500 group-hover:opacity-100`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-primary/20 to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-80"
      />

      <div className="relative h-full overflow-hidden rounded-[1.35rem] border border-white/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(248,250,252,0.34))] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.55),rgba(2,6,23,0.28))]">
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <span className="rounded-full border border-white/60 bg-background/70 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-xl dark:border-white/10">
            {developer.metric}
          </span>
          <span className="rounded-full border border-white/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-xl dark:border-white/10">
            {developer.signal}
          </span>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(2,6,23,0.74))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.32),transparent_42%)] opacity-80" />

        <img
          src={developer.image}
          alt={developer.name}
          className="h-full w-full object-cover object-center saturate-[1.04] transition duration-700 group-hover:scale-105 group-hover:saturate-[1.15]"
          onError={(event) => {
            event.currentTarget.style.display = "none"
          }}
        />

        <figcaption className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-6">
          <div className="rounded-[1.1rem] border border-white/25 bg-slate-950/48 p-4 text-white shadow-[0_20px_80px_-44px_rgba(15,23,42,0.9)] backdrop-blur-xl transition-all duration-500 group-hover:-translate-y-1 group-hover:bg-slate-950/58">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold">
                  {developer.name}
                </h2>
                <p className="mt-1 text-sm text-white/72">{developer.role}</p>
              </div>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                <Code2 className="size-5" />
              </div>
            </div>
          </div>
        </figcaption>
      </div>
    </figure>
  )
}

export function DevelopersPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(255,255,255,0.72)_30%,rgba(16,185,129,0.1)_61%,rgba(251,146,60,0.13)),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.98))] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.2),rgba(15,23,42,0.86)_30%,rgba(16,185,129,0.1)_61%,rgba(251,146,60,0.14)),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,1))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.08)_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-45"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.35),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]"
      />

      <MarketingNav activePage="developers" />

      <section className={`${sectionShellClassName} pb-14 pt-10 sm:pt-14 lg:pb-20`}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.55fr)] lg:items-end">
          <div className="max-w-4xl">
            <Badge className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary" variant="outline">
              The team behind IskoAI
            </Badge>
            <h1 className="mt-5 max-w-5xl text-balance text-5xl font-semibold text-foreground sm:text-6xl lg:text-7xl">
              Meet the{" "}
              <AuroraText colors={auroraTextColors} speed={0.75}>
                developers
              </AuroraText>{" "}
              building the study workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              A focused team shaping the product, interface, AI workflows, and
              platform foundation behind IskoAI.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-4 shadow-[0_30px_100px_-70px_rgba(15,23,42,0.62)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/8">
            <div className="grid grid-cols-2 gap-3">
              {capabilityPills.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.label}
                    className="group rounded-2xl border border-border/60 bg-background/60 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-background/80"
                  >
                    <Icon className="size-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                    <p className="mt-3 text-sm font-medium">{item.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={`${sectionShellClassName} pb-20`}>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {developers.map((developer, index) => (
            <DeveloperPortrait
              key={`${developer.name}-${developer.metric}`}
              developer={developer}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="border-y border-border/40 bg-background/45 py-16 backdrop-blur-sm">
        <div className={sectionShellClassName}>
          <div className="grid gap-8 rounded-[1.75rem] border border-white/60 bg-white/55 p-6 shadow-[0_36px_120px_-76px_rgba(15,23,42,0.65)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/8 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15">
                  <Sparkles className="size-5" />
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Built with intent
                </Badge>
              </div>
              <h2 className="mt-5 text-balance text-3xl font-semibold sm:text-4xl">
                Product thinking, engineering, and visual systems in one team.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                The developers page is designed as a dedicated brand moment for
                the people moving IskoAI from idea to working product.
              </p>
            </div>

            <Button asChild size="lg" className="h-11 rounded-full px-6 lg:justify-self-end">
              <Link to="/sign-up">
                Start using IskoAI
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 bg-background/70">
        <div className={`${sectionShellClassName} flex flex-col gap-5 py-8 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex items-center gap-3">
            <SidebarLogo className="w-32" contextLabel="Footer" />
            <p className="text-xs text-muted-foreground">
              Designed and built by the IskoAI developers
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-primary">
              Home
            </Link>
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
