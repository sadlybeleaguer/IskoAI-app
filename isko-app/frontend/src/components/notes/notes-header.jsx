import {
  AlertCircle,
  Bold,
  Check,
  Clock3,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"
import { formatNoteTimestamp } from "@/utils/notes"

const blockButtons = [
  {
    command: "formatBlock",
    label: "Text",
    value: "<p>",
  },
  {
    command: "formatBlock",
    icon: Heading1,
    label: "H1",
    value: "<h1>",
  },
  {
    command: "formatBlock",
    icon: Heading2,
    label: "H2",
    value: "<h2>",
  },
]

const inlineButtons = [
  { command: "bold", icon: Bold, label: "Bold" },
  { command: "italic", icon: Italic, label: "Italic" },
  { command: "underline", icon: Underline, label: "Underline" },
  { command: "insertUnorderedList", icon: List, label: "Bullet list" },
  { command: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  { command: "undo", icon: Undo2, label: "Undo" },
  { command: "redo", icon: Redo2, label: "Redo" },
]

function SaveStateIndicator({ activeNote, saveState }) {
  let Icon = Check
  let label = activeNote ? `Edited ${formatNoteTimestamp(activeNote.updated_at)}` : "Create or select a note"

  if (saveState === "saving") {
    Icon = Clock3
    label = "Saving..."
  } else if (saveState === "saved") {
    Icon = Check
    label = "Saved"
  } else if (saveState === "error") {
    Icon = AlertCircle
    label = "Save failed"
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        saveState === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </div>
  )
}

function ToolbarButton({
  command,
  commandValue,
  icon: Icon,
  label,
  onRunCommand,
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={Icon ? "icon-sm" : "sm"}
      className={cn(
        "shrink-0",
        Icon ? "px-0" : "px-2 text-xs font-medium",
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onRunCommand(command, commandValue)}
      aria-label={label}
      title={label}
    >
      {Icon ? <Icon className="size-3.5" /> : label}
    </Button>
  )
}

export function NotesHeader({
  activeNote,
  draft,
  editorRef,
  isDeleting,
  onDeleteNote,
  onTitleChange,
  saveState,
}) {
  const canEdit = Boolean(activeNote)

  const runCommand = (command, commandValue) => {
    if (!canEdit) {
      return
    }

    editorRef.current?.runCommand(command, commandValue)
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={draft.title}
            placeholder={canEdit ? "Untitled note" : "Notes"}
            disabled={!canEdit}
            onChange={(event) => onTitleChange(event.target.value)}
            className={cn(
              "w-full border-0 bg-transparent p-0 text-lg font-medium tracking-[-0.02em] outline-none",
              "placeholder:text-muted-foreground disabled:cursor-default disabled:text-foreground",
            )}
            aria-label="Note title"
          />
          <div className="mt-1">
            <SaveStateIndicator activeNote={activeNote} saveState={saveState} />
          </div>
        </div>

        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onDeleteNote()}
            disabled={isDeleting}
            className="shrink-0"
          >
            <Trash2 data-icon="inline-start" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-background px-1 py-1">
            {blockButtons.map((button) => (
              <ToolbarButton
                key={`${button.command}-${button.label}`}
                command={button.command}
                commandValue={button.value}
                icon={button.icon}
                label={button.label}
                onRunCommand={runCommand}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-background px-1 py-1">
            {inlineButtons.map((button) => (
              <ToolbarButton
                key={`${button.command}-${button.label}`}
                command={button.command}
                commandValue={button.value}
                icon={button.icon}
                label={button.label}
                onRunCommand={runCommand}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
