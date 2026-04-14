export function formatNoteTimestamp(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function getNoteTitle(note) {
  const title = note.title.trim()

  if (title) {
    return title
  }

  const derivedTitle = note.content
    .trim()
    .split(/\n+/)
    .find(Boolean)
    ?.trim()
    .slice(0, 52)

  return derivedTitle || "Untitled note"
}

export function getInitialNoteDraft(note) {
  return {
    title: note?.title ?? "",
    content: note?.content ?? "",
  }
}
