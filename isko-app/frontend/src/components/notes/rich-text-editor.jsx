import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react"

import { cn } from "@/utils/cn"
import { isNoteContentEmpty, normalizeNoteContent } from "@/utils/notes"

function runEditorCommand(command, value, editorRef, onChange) {
  const editor = editorRef.current

  if (!editor || typeof document === "undefined") {
    return
  }

  editor.focus()
  document.execCommand(command, false, value)
  onChange(normalizeNoteContent(editor.innerHTML))
}

export const RichTextEditor = forwardRef(function RichTextEditor({
  className,
  id,
  onChange,
  placeholder,
  value,
}, ref) {
  const fallbackId = useId()
  const editorId = id ?? fallbackId
  const editorRef = useRef(null)
  const lastEmittedValueRef = useRef(normalizeNoteContent(value))

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        editorRef.current?.focus()
      },
      runCommand(command, commandValue) {
        runEditorCommand(command, commandValue, editorRef, (nextValue) => {
          lastEmittedValueRef.current = nextValue
          onChange(nextValue)
        })
      },
    }),
    [onChange],
  )

  useEffect(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const normalizedValue = normalizeNoteContent(value)

    if (normalizedValue === lastEmittedValueRef.current) {
      return
    }

    if (editor.innerHTML !== normalizedValue) {
      editor.innerHTML = normalizedValue
    }

    lastEmittedValueRef.current = normalizedValue
  }, [value])

  const handleInput = () => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const nextValue = normalizeNoteContent(editor.innerHTML)

    if (nextValue === lastEmittedValueRef.current) {
      return
    }

    lastEmittedValueRef.current = nextValue
    onChange(nextValue)
  }

  return (
    <div className={cn("relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-background", className)}>
      {isNoteContentEmpty(value) ? (
        <div className="pointer-events-none absolute left-8 top-8 text-sm text-muted-foreground">
          {placeholder}
        </div>
      ) : null}

      <div
        id={editorId}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          "min-h-[28rem] h-full overflow-y-auto px-8 py-8 text-[15px] leading-8 outline-none",
          "[&_h1]:mt-8 [&_h1]:text-[2rem] [&_h1]:font-semibold [&_h1]:tracking-[-0.03em]",
          "[&_h2]:mt-6 [&_h2]:text-[1.5rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em]",
          "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_p]:min-h-[1.9rem]",
          "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
          "[&_li]:my-1.5",
        )}
        role="textbox"
        aria-label="Note content"
        aria-multiline="true"
        onInput={handleInput}
      />
    </div>
  )
})
