import { RichTextEditor } from "@/components/notes/rich-text-editor"

export function NotesEditor({
  draft,
  onDraftChange,
  editorRef,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col py-6">
      <div className="min-h-0 flex-1">
        <RichTextEditor
          ref={editorRef}
          id="note-body"
          value={draft.content}
          placeholder="Start writing..."
          className="min-h-full"
          onChange={(nextContent) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              content: nextContent,
            }))
          }
        />
      </div>
    </div>
  )
}
