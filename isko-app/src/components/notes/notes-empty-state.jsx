import { PencilLine, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

export function NotesEmptyState({ onCreateNote }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border">
          <PencilLine className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">No note selected</p>
          <p className="text-sm text-muted-foreground">
            Create a note from the sidebar to start capturing ideas, drafts, or task lists.
          </p>
        </div>
        <Button type="button" onClick={() => void onCreateNote()}>
          <Plus data-icon="inline-start" />
          New note
        </Button>
      </div>
    </div>
  )
}
