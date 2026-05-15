import { PencilLine, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

export function NotesEmptyState({ onCreateNote }) {
  return (
    <NotesEmptyStateCard
      title="No note selected"
      description="Create a note to start writing with headings, lists, and bold text."
      onCreateNote={onCreateNote}
    />
  )
}

export function NotesEmptyStateCard({
  description,
  onCreateNote,
  title,
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border">
          <PencilLine className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" onClick={() => void onCreateNote()}>
          <Plus data-icon="inline-start" />
          New note
        </Button>
      </div>
    </div>
  )
}
