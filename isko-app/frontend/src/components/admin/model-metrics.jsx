import { Bot, CheckCircle2, Ban, Layers3 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const items = [
  {
    key: "total",
    label: "Total models",
    description: "All registered chat models.",
    icon: Bot,
    iconClassName: "text-primary",
  },
  {
    key: "enabled",
    label: "Enabled models",
    description: "Visible in the chat model picker.",
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
  },
  {
    key: "disabled",
    label: "Disabled models",
    description: "Hidden until re-enabled.",
    icon: Ban,
    iconClassName: "text-amber-600",
  },
  {
    key: "providers",
    label: "Providers",
    description: "Unique model backends in use.",
    icon: Layers3,
    iconClassName: "text-sky-600",
  },
]

export function ModelMetrics({ isLoading = false, stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <Card key={item.key} className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
            <CardHeader className="gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                  <CardDescription className="text-sm">{item.description}</CardDescription>
                </div>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon className={`size-4 ${item.iconClassName}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight">{stats[item.key]}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
