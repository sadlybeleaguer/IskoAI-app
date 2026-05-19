import { Bot, RefreshCcw } from "lucide-react"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function ModelStatusBadge({ enabled }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex items-center rounded-md border border-amber-500/20 bg-amber-500/8 px-2 py-1 text-xs font-medium text-amber-700"
      }
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  )
}

function formatProvider(provider) {
  switch (provider) {
    case "openrouter":
      return "OpenRouter"
    case "huggingface-router":
      return "Hugging Face Router"
    default:
      return provider || "Provider unavailable"
  }
}

function FilterSelect({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      value={value}
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function formatUpdatedAt(value) {
  if (!value) {
    return "Updated time unavailable"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function ModelListEmptyState({ message }) {
  return (
    <div className="px-4 py-8 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function ModelListSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-lg border bg-background"
      role="status"
      aria-label="Loading models"
    >
      <div className="divide-y">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_10rem_8rem_7rem] lg:items-center"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <div className="grid min-w-0 flex-1 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
                <Skeleton className="h-3 w-44 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <div className="flex justify-start lg:justify-end">
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModelRow({ model, onToggleAvailability, updatingModelKey }) {
  const isUpdating = updatingModelKey === model.key

  return (
    <div
      className={cn(
        "grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_10rem_8rem_7rem] lg:items-center",
        isUpdating && "bg-muted/40",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <Bot className="size-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">
                {model.label}
              </p>
              <ModelStatusBadge enabled={model.enabled} />
            </div>

            <p className="truncate text-sm text-muted-foreground">{model.key}</p>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground lg:text-foreground">
        {formatProvider(model.provider)}
      </div>

      <div className="text-sm text-muted-foreground">
        {model.enabled ? "Enabled" : "Disabled"}
      </div>

      <div className="text-sm text-muted-foreground">
        {formatUpdatedAt(model.updated_at)}
      </div>

      <div className="flex justify-start lg:justify-end">
        <Button
          type="button"
          variant={model.enabled ? "outline" : "default"}
          size="sm"
          onClick={() => onToggleAvailability(model)}
          disabled={Boolean(updatingModelKey)}
        >
          {isUpdating ? "Saving..." : model.enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  )
}

export function ModelManagementCard({
  filteredModels,
  isLoadingModels,
  modelsError,
  onRefresh,
  onToggleAvailability,
  providerFilter,
  providerOptions,
  searchTerm,
  setProviderFilter,
  setSearchTerm,
  setStatusFilter,
  statusFilter,
  updatingModelKey,
}) {
  const sortedModels = [...filteredModels].sort((left, right) => {
    if (left.enabled !== right.enabled) {
      return left.enabled ? -1 : 1
    }

    return left.label.localeCompare(right.label)
  })

  const listContent = (
    <>
      {isLoadingModels ? <ModelListSkeleton /> : null}

      {!isLoadingModels && !sortedModels.length ? (
        <section className="overflow-hidden rounded-lg border border-dashed bg-background">
          <ModelListEmptyState message="No models matched the current filters." />
        </section>
      ) : null}

      {!isLoadingModels && sortedModels.length ? (
        <section className="overflow-hidden rounded-lg border bg-background">
          <div className="hidden border-b px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_10rem_8rem_7rem] lg:gap-3">
            <div>Model</div>
            <div>Provider</div>
            <div>Status</div>
            <div>Updated</div>
            <div className="text-right">Action</div>
          </div>
          <div className="divide-y">
            {sortedModels.map((model) => (
              <ModelRow
                key={model.key}
                model={model}
                onToggleAvailability={onToggleAvailability}
                updatingModelKey={updatingModelKey}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  )

  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.08)] xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <CardHeader className="gap-4 border-b px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <CardTitle className="text-base font-medium">Model availability</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Review model availability and control what users can select in chat.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center px-1 text-sm text-muted-foreground">
              {isLoadingModels ? <Skeleton className="h-4 w-16" /> : `${sortedModels.length} shown`}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoadingModels}
            >
              <RefreshCcw data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search-models">Search models</Label>
            <Input
              id="search-models"
              placeholder="Search by label, key, provider, or status"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="provider-filter">Provider</Label>
            <FilterSelect
              id="provider-filter"
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              options={[{ value: "all", label: "All providers" }, ...providerOptions]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="model-status-filter">Status</Label>
            <FilterSelect
              id="model-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "enabled", label: "Enabled" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-5 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
        {modelsError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load models</AlertTitle>
            <AlertDescription>{modelsError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-4 xl:hidden">
          {listContent}
        </div>

        <ScrollArea className="hidden xl:block xl:min-h-0 xl:flex-1">
          <div className="flex flex-col gap-4 pr-4">
            {listContent}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
