import { useRef } from "react"

import {
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  FileText,
  Paperclip,
  Plus,
  Square,
  Wrench,
  X,
} from "lucide-react"

import { ChatFileAttachments } from "@/components/chat/chat-file-attachments"
import { chatToolOptions } from "@/components/chat/chat-tool-options"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Marquee } from "@/components/ui/marquee"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { acceptedChatFileInputAccept } from "@/services/db.service"
import { recommendationPrompts } from "@/utils/chat"
import { cn } from "@/utils/cn"

export function ChatModelMenu({
  isLoadingModels = false,
  models,
  selectedModelKey,
  selectedModelLabel,
  setSelectedModelKey,
}) {
  const isDisabled = isLoadingModels || models.length === 0
  const triggerLabel = selectedModelLabel || "No models available"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto justify-start px-0 py-0"
          disabled={isDisabled}
        >
          <div className="flex min-w-0 items-center gap-1 text-left">
            {isLoadingModels ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <span className="truncate text-sm font-medium">{triggerLabel}</span>
            )}
            <ChevronDown data-icon="inline-end" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Model</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {models.length ? (
          <DropdownMenuRadioGroup
            value={selectedModelKey}
            onValueChange={setSelectedModelKey}
          >
            {models.map((model) => (
              <DropdownMenuRadioItem key={model.key} value={model.key}>
                {model.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        ) : (
          <DropdownMenuItem disabled>
            {isLoadingModels ? <Skeleton className="h-4 w-32" /> : "No models available"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ChatComposer({
  allowFileAttachments = true,
  allowNoteAttachments = true,
  attachedNote,
  attachedFiles = [],
  composerNotice,
  draft,
  isEmptyState = false,
  isEphemeral = false,
  isLoadingModels = false,
  isUploadingFiles = false,
  isUpdatingAttachedNote = false,
  isSending,
  hasAvailableModels = true,
  modelStatusMessage = "",
  onAttachFiles,
  onOpenNotePicker,
  onKeyDown,
  onPromptClick,
  onRemoveAttachedFile,
  onRemoveAttachedNote,
  onStopStreaming,
  onSubmit,
  isStreaming = false,
  removingFileId = "",
  selectedModelLabel,
  selectedTool,
  setDraft,
  setSelectedTool,
}) {
  const fileInputRef = useRef(null)
  const canAttachContext = allowFileAttachments || allowNoteAttachments

  return (
    <form
      className={cn(
        "flex flex-col gap-3",
        isEmptyState ? "mx-auto w-full max-w-3xl" : "w-full",
      )}
      onSubmit={onSubmit}
    >
      {allowFileAttachments ? (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={acceptedChatFileInputAccept}
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? [])

            if (nextFiles.length) {
              void onAttachFiles?.(nextFiles)
            }

            event.target.value = ""
          }}
        />
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            isEmptyState
              ? isEphemeral
                ? "Start a temporary chat..."
                : "How can I help you today?"
              : "Message IskoAI"
          }
          className={cn(
            "resize-none border-0 px-5 py-4 shadow-none focus-visible:ring-0",
            isEmptyState ? "min-h-28" : "min-h-24",
          )}
        />
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              {canAttachContext ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="More actions"
                      disabled={isEphemeral}
                    >
                      <Plus data-icon="inline-start" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>Attach</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {allowFileAttachments ? (
                        <DropdownMenuItem
                          onSelect={() => fileInputRef.current?.click()}
                          disabled={isUploadingFiles}
                        >
                          <Paperclip data-icon="inline-start" />
                          {isUploadingFiles ? "Uploading files..." : "Upload files"}
                        </DropdownMenuItem>
                      ) : null}
                      {allowNoteAttachments ? (
                        <DropdownMenuItem onSelect={onOpenNotePicker}>
                          <FileText data-icon="inline-start" />
                          {attachedNote ? "Replace attached note" : "Attach notes"}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Tool selection">
                    <Wrench data-icon="inline-start" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Tools</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={selectedTool} onValueChange={setSelectedTool}>
                    <DropdownMenuRadioItem value="">Default</DropdownMenuRadioItem>
                    {chatToolOptions.map((tool) => {
                      const Icon = tool.icon

                      return (
                        <DropdownMenuRadioItem key={tool.value} value={tool.value}>
                          <Icon data-icon="inline-start" />
                          {tool.value}
                        </DropdownMenuRadioItem>
                      )
                    })}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="hidden min-w-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
              {isLoadingModels ? (
                <Skeleton className="h-3 w-28" />
              ) : (
                <span className="truncate">
                  Model {selectedModelLabel || "Unavailable"}
                </span>
              )}
              {isEphemeral ? (
                <span className="font-medium text-primary">Temporary Mode</span>
              ) : (
                <>
                  {selectedTool ? <span className="truncate">Tool {selectedTool}</span> : null}
                  {attachedFiles.length ? (
                    <span className="truncate">
                      Files {attachedFiles.length}
                    </span>
                  ) : null}
                  {allowNoteAttachments && attachedNote ? (
                    <span className="truncate">
                      Note {attachedNote.title}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="rounded-full"
                onClick={onStopStreaming}
                aria-label="Stop generating"
              >
                <Square data-icon="inline-start" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={!draft.trim() || isSending || !hasAvailableModels}
                aria-label={isSending ? "Sending message" : "Send message"}
              >
                <ArrowUpRight data-icon="inline-start" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {selectedTool || composerNotice || modelStatusMessage ? (
        <div className="flex flex-col gap-2">
          {selectedTool ? (
            <div className="px-1 text-xs text-muted-foreground sm:hidden">
              Model {selectedModelLabel || "Unavailable"} / Tool {selectedTool}
            </div>
          ) : null}
          {modelStatusMessage ? (
            <Alert>
              <BrainCircuit className="size-4" />
              <AlertTitle>Model availability</AlertTitle>
              <AlertDescription>{modelStatusMessage}</AlertDescription>
            </Alert>
          ) : null}
          {composerNotice ? (
            <Alert>
              <FileText className="size-4" />
              <AlertTitle>Composer action</AlertTitle>
              <AlertDescription>{composerNotice}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {allowNoteAttachments && attachedNote ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
          <div className="min-w-0">
            {isUpdatingAttachedNote ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              <div className="truncate text-sm font-medium">
                {attachedNote.title}
              </div>
            )}
            <div className="truncate text-xs text-muted-foreground">
              Attached note context stays active for this thread.
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void onRemoveAttachedNote?.()}
            disabled={isUpdatingAttachedNote}
            aria-label="Remove attached note"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      {attachedFiles.length ? (
        <ChatFileAttachments
          files={attachedFiles}
          onRemove={onRemoveAttachedFile}
          removingFileId={removingFileId}
          title="Attached files"
        />
      ) : null}

      {isEmptyState ? (
        <div className="relative overflow-hidden px-1 sm:px-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />
          <Marquee
            className="py-1 [--duration:58s] [--gap:0.5rem]"
            pauseOnHover
            repeat={3}
          >
            {recommendationPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="h-10 max-w-[22rem] shrink-0 rounded-full border border-border/70 bg-card px-4 text-sm font-medium text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => onPromptClick(prompt)}
              >
                <span className="block truncate">{prompt}</span>
              </button>
            ))}
          </Marquee>
        </div>
      ) : null}
    </form>
  )
}
