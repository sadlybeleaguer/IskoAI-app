import { Archive, CheckCircle2, Shield, Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const items = [
  {
    key: "total",
    label: "Total users",
    description: "All managed accounts in the project.",
    icon: Users,
    iconClassName: "text-primary",
  },
  {
    key: "active",
    label: "Active users",
    description: "Accounts that can currently sign in.",
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
  },
  {
    key: "archived",
    label: "Archived users",
    description: "Accounts blocked from signing in.",
    icon: Archive,
    iconClassName: "text-amber-600",
  },
  {
    key: "superadmins",
    label: "Superadmins",
    description: "Accounts with dashboard access.",
    icon: Shield,
    iconClassName: "text-sky-600",
  },
]

export function DashboardMetrics({ stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <Card
            key={item.key}
            className="border-white/60 bg-white/82 py-0 backdrop-blur"
          >
            <CardHeader className="border-b border-border/70 px-5 py-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className={`size-4 ${item.iconClassName}`} />
                {item.label}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-5">
              <p className="text-3xl font-semibold tracking-tight">
                {stats[item.key]}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
