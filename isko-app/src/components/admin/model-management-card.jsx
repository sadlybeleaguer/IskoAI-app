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

function formatUpdatedAt(value) {
  if (!value) {
    return "Updated time unavailable"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function ModelSectionEmptyState({ message }) {
  return (
    <div className="px-4 py-8 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function ModelRow({ model, onToggleAvailability, updatingModelKey }) {
  const isUpdating = updatingModelKey === model.key

  return (
    <div
      className={cn(
        "grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
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
              <span className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                {formatProvider(model.provider)}
              </span>
            </div>

            <p className="truncate text-sm text-muted-foreground">{model.key}</p>
            <p className="text-xs text-muted-foreground">
              {formatUpdatedAt(model.updated_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-start sm:justify-end">
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

function ModelSection({
  description,
  emptyMessage,
  models,
  onToggleAvailability,
  title,
  updatingModelKey,
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-background">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="text-sm text-muted-foreground">{models.length}</div>
        </div>
      </header>

      <div className="divide-y">
        {models.length ? (
          models.map((model) => (
            <ModelRow
              key={model.key}
              model={model}
              onToggleAvailability={onToggleAvailability}
              updatingModelKey={updatingModelKey}
            />
          ))
        ) : (
          <ModelSectionEmptyState message={emptyMessage} />
        )}
      </div>
    </section>
  )
}

export function ModelManagementCard({
  isLoadingModels,
  models,
  modelsError,
  modelsFeedback,
  onRefresh,
  onToggleAvailability,
  updatingModelKey,
}) {
  const enabledModels = models.filter((model) => model.enabled)
  const disabledModels = models.filter((model) => !model.enabled)

  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
      <CardHeader className="gap-4 border-b px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <CardTitle className="text-base font-medium">Model availability</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Choose which models appear in the chat picker. Changes apply as soon
              as the availability update succeeds.
            </CardDescription>
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

        <dl className="grid gap-2 border-t pt-4 text-sm sm:grid-cols-3">
          <div className="flex items-baseline justify-between gap-4 border-b pb-2 sm:border-b-0 sm:border-r sm:pr-4 sm:pb-0">
            <dt className="text-muted-foreground">Total models</dt>
            <dd className="font-medium text-foreground">{models.length}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b pb-2 sm:border-b-0 sm:border-r sm:px-4 sm:pb-0">
            <dt className="text-muted-foreground">Enabled</dt>
            <dd className="font-medium text-foreground">{enabledModels.length}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 sm:pl-4">
            <dt className="text-muted-foreground">Disabled</dt>
            <dd className="font-medium text-foreground">{disabledModels.length}</dd>
          </div>
        </dl>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5">
        {modelsFeedback.message ? (
          <Alert variant={modelsFeedback.type === "error" ? "destructive" : "default"}>
            <AlertTitle>
              {modelsFeedback.type === "error" ? "Request failed" : "Model updated"}
            </AlertTitle>
            <AlertDescription>{modelsFeedback.message}</AlertDescription>
          </Alert>
        ) : null}

        {modelsError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load models</AlertTitle>
            <AlertDescription>{modelsError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoadingModels ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="overflow-hidden rounded-lg border bg-background">
              <header className="border-b px-4 py-3">
                <h2 className="text-sm font-medium text-foreground">Enabled</h2>
              </header>
              <ModelSectionEmptyState message="Loading models..." />
            </section>

            <section className="overflow-hidden rounded-lg border bg-background">
              <header className="border-b px-4 py-3">
                <h2 className="text-sm font-medium text-foreground">Disabled</h2>
              </header>
              <ModelSectionEmptyState message="Loading models..." />
            </section>
          </div>
        ) : null}

        {!isLoadingModels && !models.length ? (
          <section className="overflow-hidden rounded-lg border border-dashed bg-background">
            <ModelSectionEmptyState message="No chat models are registered yet." />
          </section>
        ) : null}

        {!isLoadingModels && models.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ModelSection
              title="Enabled"
              description="Visible in chat and available for new messages."
              emptyMessage="No enabled models."
              models={enabledModels}
              onToggleAvailability={onToggleAvailability}
              updatingModelKey={updatingModelKey}
            />
            <ModelSection
              title="Disabled"
              description="Hidden from the model picker until re-enabled."
              emptyMessage="No disabled models."
              models={disabledModels}
              onToggleAvailability={onToggleAvailability}
              updatingModelKey={updatingModelKey}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
