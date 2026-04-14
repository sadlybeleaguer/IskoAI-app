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

function ModelStatusBadge({ enabled }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex items-center rounded-md bg-emerald-500/12 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20"
          : "inline-flex items-center rounded-md bg-amber-500/12 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20"
      }
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
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
  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
      <CardHeader className="gap-4 border-b px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-medium">
              Chat models
            </CardTitle>
            <CardDescription className="mt-1 leading-6">
              Disable a model to remove it from the chat model picker for users.
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
          <div className="rounded-lg border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            Loading chat models...
          </div>
        ) : null}

        {!isLoadingModels && !models.length ? (
          <div className="rounded-lg border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            No chat models are registered yet.
          </div>
        ) : null}

        {!isLoadingModels &&
          models.map((model) => {
            const isUpdating = updatingModelKey === model.key

            return (
              <div
                key={model.key}
                className="flex flex-col gap-4 rounded-lg border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                        <Bot className="size-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{model.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {model.key}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ModelStatusBadge enabled={model.enabled} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {model.enabled
                      ? "Visible in chat and available for new messages."
                      : "Hidden from the chat dropdown until re-enabled."}
                  </p>
                  <Button
                    type="button"
                    variant={model.enabled ? "outline" : "default"}
                    size="sm"
                    onClick={() => onToggleAvailability(model)}
                    disabled={Boolean(updatingModelKey)}
                  >
                    {isUpdating
                      ? "Saving..."
                      : model.enabled
                        ? "Disable"
                        : "Enable"}
                  </Button>
                </div>
              </div>
            )
          })}
      </CardContent>
    </Card>
  )
}
