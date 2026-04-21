import { useRef } from "react"

import {
  ArrowUpRight,
  BrainCircuit,
  Calculator,
  ChevronDown,
  Code2,
  FileText,
  Mic,
  Paperclip,
  Plus,
  Square,
  Wrench,
  X,
} from "lucide-react"

import { ChatFileAttachments } from "@/components/chat/chat-file-attachments"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { acceptedChatFileInputAccept } from "@/services/chat-files-service"
import { starterPrompts, suggestedPrompts } from "@/utils/chat"
import { cn } from "@/utils/cn"

const toolOptions = [
  { value: "Math", icon: Calculator },
  { value: "Programming", icon: Code2 },
  { value: "Complex Problems", icon: BrainCircuit },
]

export function ChatModelMenu({
  isLoadingModels = false,
  models,
  selectedModelKey,
  selectedModelLabel,
  setSelectedModelKey,
}) {
  const isDisabled = isLoadingModels || models.length === 0
  const triggerLabel = isLoadingModels
    ? "Loading models..."
    : selectedModelLabel || "No models available"

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
            <span className="truncate text-sm font-medium">{triggerLabel}</span>
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
            {isLoadingModels ? "Loading models..." : "No models available"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ChatComposer({
  attachedNote,
  attachedFiles = [],
  composerNotice,
  draft,
  isEmptyState = false,
  isLoadingAttachedFiles = false,
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

  return (
    <form
      className={cn(
        "flex flex-col gap-3",
        isEmptyState ? "mx-auto w-full max-w-3xl" : "w-full",
      )}
      onSubmit={onSubmit}
    >
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

      <div className="overflow-hidden rounded-lg border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isEmptyState ? "How can I help you today?" : "Message IskoAI"}
          className={cn(
            "resize-none border-0 px-5 py-4 shadow-none focus-visible:ring-0",
            isEmptyState ? "min-h-28" : "min-h-24",
          )}
        />
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="More actions">
                    <Plus data-icon="inline-start" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Attach</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() => fileInputRef.current?.click()}
                      disabled={isUploadingFiles}
                    >
                      <Paperclip data-icon="inline-start" />
                      {isUploadingFiles ? "Uploading files..." : "Upload files"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onOpenNotePicker}>
                      <FileText data-icon="inline-start" />
                      {attachedNote ? "Replace attached note" : "Attach notes"}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

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
                    {toolOptions.map((tool) => {
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
              <span className="truncate">
                Model {selectedModelLabel || (isLoadingModels ? "Loading..." : "Unavailable")}
              </span>
              {selectedTool ? <span className="truncate">Tool {selectedTool}</span> : null}
              {attachedFiles.length ? (
                <span className="truncate">
                  Files {attachedFiles.length}
                </span>
              ) : null}
              {attachedNote ? (
                <span className="truncate">
                  Note {attachedNote.title}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" disabled>
              <Mic data-icon="inline-start" />
            </Button>
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

      {attachedNote ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {isUpdatingAttachedNote ? "Updating note context..." : attachedNote.title}
            </div>
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
          title={isLoadingAttachedFiles ? "Loading files..." : "Attached files"}
        />
      ) : null}

      {isEmptyState ? (
        <div className="grid gap-3 px-3 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => onPromptClick(prompt)}
              >
                {prompt.trim().replace(/\s+/g, " ").slice(0, 40)}
              </button>
            ))}
          </div>

          <div className="grid gap-1 text-left sm:max-w-xl">
            {suggestedPrompts.map((item) => (
              <button
                key={item.title}
                type="button"
                className="rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                onClick={() => onPromptClick(item.prompt)}
              >
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.hint}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  )
}
