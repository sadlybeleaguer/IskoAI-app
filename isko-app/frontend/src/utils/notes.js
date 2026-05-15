export function formatNoteTimestamp(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

const allowedRichTextTags = new Set([
  "B",
  "BR",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "U",
  "UL",
])

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\w-]*\b[^>]*>/i.test(value)
}

function formatPlainTextAsHtml(value) {
  const normalizedValue = value.replace(/\r\n?/g, "\n").trim()

  if (!normalizedValue) {
    return ""
  }

  return normalizedValue
    .split(/\n{2,}/)
    .map((paragraph) => {
      const paragraphContent = paragraph
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>")

      return `<p>${paragraphContent}</p>`
    })
    .join("")
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? "")
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ""
  }

  const tagName = node.nodeName.toUpperCase()

  if (tagName === "BR") {
    return "<br>"
  }

  const children = Array.from(node.childNodes).map(sanitizeNode).join("")

  if (!allowedRichTextTags.has(tagName)) {
    return children
  }

  const normalizedTagName = tagName.toLowerCase()
  return `<${normalizedTagName}>${children}</${normalizedTagName}>`
}

export function sanitizeNoteContent(value) {
  if (!value?.trim()) {
    return ""
  }

  if (typeof DOMParser === "undefined") {
    return looksLikeHtml(value) ? value.trim() : formatPlainTextAsHtml(value)
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(value, "text/html")

  return Array.from(document.body.childNodes).map(sanitizeNode).join("").trim()
}

export function normalizeNoteContent(value) {
  if (!value?.trim()) {
    return ""
  }

  return looksLikeHtml(value)
    ? sanitizeNoteContent(value)
    : formatPlainTextAsHtml(value)
}

export function extractPlainTextFromNoteContent(value) {
  if (!value?.trim()) {
    return ""
  }

  if (typeof DOMParser === "undefined") {
    return value
      .replace(/<[^>]+>/g, " ")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  }

  if (!looksLikeHtml(value)) {
    return value.replace(/\r\n?/g, "\n").trim()
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(value, "text/html")

  return document.body.textContent
    ?.replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim() ?? ""
}

export function getNoteTitle(note) {
  const title = note.title.trim()

  if (title) {
    return title
  }

  const derivedTitle = extractPlainTextFromNoteContent(note.content)
    .trim()
    .split(/\n+/)
    .find(Boolean)
    ?.trim()
    .slice(0, 52)

  return derivedTitle || "Untitled note"
}

export function getNotePreview(note) {
  const preview = extractPlainTextFromNoteContent(note.content)
    .replace(/\n+/g, " ")
    .trim()

  return preview ? preview.slice(0, 96) : "Empty note"
}

export function isNoteContentEmpty(value) {
  return !extractPlainTextFromNoteContent(value).trim()
}

export function getInitialNoteDraft(note) {
  return {
    title: note?.title ?? "",
    content: normalizeNoteContent(note?.content ?? ""),
  }
}
