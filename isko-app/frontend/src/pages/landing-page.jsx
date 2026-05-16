import { Link } from "react-router-dom"
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle,
  Flame,
  Star,
  Target,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const features = [
  {
    icon: Flame,
    title: "Build Streaks",
    description: "Stay motivated with daily streaks and achievement milestones.",
    colorClass: "from-secondary",
  },
  {
    icon: CheckCircle,
    title: "Progress Dashboard",
    description: "Visualize your learning journey with detailed analytics.",
    colorClass: "from-accent",
  },
  {
    icon: Star,
    title: "Premium Content",
    description: "Access curated lessons from expert educators worldwide.",
    colorClass: "from-primary",
  },
  {
    icon: Zap,
    title: "Quick Review",
    description: "Master topics fast with intelligent micro-learning sessions.",
    colorClass: "from-secondary",
  },
  {
    icon: Brain,
    title: "Spaced Repetition",
    description: "Scientifically-proven algorithm for long-term memory.",
    colorClass: "from-accent",
  },
  {
    icon: Target,
    title: "Custom Paths",
    description: "Personalized learning pathways tailored to your pace.",
    colorClass: "from-primary",
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">IskoAI</span>
          </div>

          <div className="hidden gap-6 md:flex">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#cta"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Get Started
            </a>
          </div>

          <Button asChild variant="default" className="rounded-full px-6">
            <Link to="/sign-in">Sign In</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col justify-center gap-6">
            <Badge variant="outline" className="w-fit">
              <Zap data-icon="inline-start" />
              Interactive Learning
            </Badge>
            <h1 className="text-balance text-5xl font-bold leading-tight text-foreground">
              Learn Smarter, Not Harder
            </h1>
            <p className="text-balance text-lg text-muted-foreground">
              Transform your study sessions with AI-powered tools, spaced
              repetition, and interactive lessons designed for deep learning.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/sign-up">
                  Get Started Free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <a href="#features">View Features</a>
              </Button>
            </div>
            <div className="flex gap-8 pt-6">
              <div>
                <div className="text-2xl font-bold text-primary">10K+</div>
                <div className="text-sm text-muted-foreground">
                  Active Learners
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">4.9/5</div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Smart Flashcards</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                AI-generated cards with intelligent spacing for optimal retention.
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/10 p-2">
                    <Brain className="h-5 w-5 text-secondary" />
                  </div>
                  <CardTitle className="text-lg">Progress Tracking</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Real-time insights into your learning patterns and strengths.
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-lg">Goal Setting</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Set, track, and achieve your learning goals with guided pathways.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">
            Platform Features
          </Badge>
          <h2 className="text-balance text-4xl font-bold text-foreground">
            Everything you need to succeed
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <Card
                key={feature.title}
                className="group border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <CardHeader>
                  <div
                    className={`mb-4 w-fit rounded-lg bg-gradient-to-br ${feature.colorClass} to-muted/20 p-3 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-4xl px-6 py-20">
        <Card className="overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-accent/5">
          <CardHeader className="pb-8">
            <CardTitle className="text-3xl text-balance">
              Ready to transform your learning?
            </CardTitle>
            <CardDescription className="text-base">
              Join thousands of students studying smarter with IskoAI.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Input
              type="email"
              placeholder="Enter your email"
              className="rounded-full border-border bg-background/50"
            />
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/sign-up">Get Started</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">IskoAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The intelligent study platform for modern learners.
              </p>
            </div>

            {[
              { title: "Product", links: ["Features", "Study Tools", "Workspace"] },
              { title: "Company", links: ["About", "Careers", "Contact"] },
              { title: "Resources", links: ["Docs", "Help Center", "Community"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 font-semibold text-foreground">
                  {col.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <span className="text-sm text-muted-foreground">
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-border/50 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Copyright 2026 IskoAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
