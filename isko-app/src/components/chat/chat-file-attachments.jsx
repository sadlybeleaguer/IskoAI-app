import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

function formatFileSize(sizeBytes = 0) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function getStatusCopy(status) {
  switch (status) {
    case "failed":
      return {
        description: "Could not extract readable text from this file.",
        icon: AlertCircle,
        label: "Failed",
        tone: "text-destructive",
      }
    case "processing":
      return {
        description: "File uploaded. Extracting text for chat context.",
        icon: LoaderCircle,
        label: "Processing",
        tone: "text-amber-600",
      }
    case "ready":
      return {
        description: "Ready for this thread's chat context.",
        icon: CheckCircle2,
        label: "Ready",
        tone: "text-emerald-600",
      }
    default:
      return {
        description: "Uploading to this thread.",
        icon: LoaderCircle,
        label: "Uploading",
        tone: "text-muted-foreground",
      }
  }
}

export function ChatFileAttachments({
  files,
  onRemove,
  removingFileId = "",
  title = "Attached files",
}) {
  if (!files?.length) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background">
      <div className="border-b px-3 py-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">
          Files stay attached to this thread until you remove them.
        </div>
      </div>

      <div className="flex flex-col divide-y">
        {files.map((file) => {
          const status = getStatusCopy(file.status)
          const StatusIcon = status.icon
          const isRemoving = removingFileId === file.id
          const canRemove = typeof onRemove === "function"

          return (
            <div
              key={file.id}
              className="flex items-start gap-3 px-3 py-3"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                <FileText className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {file.original_name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size_bytes)}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium",
                          status.tone,
                        )}
                      >
                        <StatusIcon
                          className={cn(
                            "size-3.5",
                            file.status === "processing" || file.status === "uploading"
                              ? "animate-spin"
                              : "",
                          )}
                        />
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {canRemove ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void onRemove(file)}
                      disabled={isRemoving}
                      aria-label={`Remove ${file.original_name}`}
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {file.error_message || status.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
