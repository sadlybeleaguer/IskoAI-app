import { supabase, supabaseKey, supabaseUrl } from "@/lib/supabaseClient"
import {
  clearLocalSupabaseSession,
  getSession,
  isInvalidRefreshTokenError,
} from "@/services/auth.service"
import { formatCompactDate } from "@/utils/calendar"
import { formatRelativeTime } from "@/utils/chat"
import { getNotePreview, getNoteTitle } from "@/utils/notes"

// --- Shared Helpers ---

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }
  return supabase
}

function isMissingRelationError(error) {
  return (
    error?.code === "PGRST205" ||
    /could not find the table|relation .* does not exist/i.test(
      error?.message ?? "",
    )
  )
}

function isMissingRpcError(error) {
  return (
    error?.code === "PGRST202" ||
    /could not find the function .* in the schema cache/i.test(
      error?.message ?? "",
    )
  )
}

let refreshSessionPromise = null

async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await getSession()

  if (error) {
    if (isInvalidRefreshTokenError(error.message)) {
      await clearLocalSupabaseSession()
      throw new Error("Your session expired. Please sign in again.")
    }
    throw new Error(error.message)
  }

  return session
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new Error("You must be signed in to perform this action.")
  }

  if (!refreshSessionPromise) {
    refreshSessionPromise = supabase.auth
      .refreshSession({ refresh_token: refreshToken })
      .finally(() => {
        refreshSessionPromise = null
      })
  }

  const { data, error } = await refreshSessionPromise

  if (error) {
    if (isInvalidRefreshTokenError(error.message)) {
      await clearLocalSupabaseSession()
      throw new Error("Your session expired. Please sign in again.")
    }
    throw new Error(error.message)
  }

  const nextSession = data.session

  if (!nextSession?.access_token) {
    throw new Error("You must be signed in to perform this action.")
  }

  return nextSession
}

// --- Admin Service Logic ---

async function invokeManageUsersRequest(accessToken, payload) {
  return fetch(`${supabaseUrl}/functions/v1/manage-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function invokeManageUsers(_session, payload) {
  if (!supabaseUrl || !supabaseKey || !supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const currentSession = await getCurrentSession()

  if (!currentSession?.access_token) {
    throw new Error("You must be signed in to manage users.")
  }

  let response = await invokeManageUsersRequest(
    currentSession.access_token,
    payload,
  )

  if (response.status === 401 && currentSession.refresh_token) {
    const refreshedSession = await refreshAccessToken(
      currentSession.refresh_token,
    )
    response = await invokeManageUsersRequest(
      refreshedSession.access_token,
      payload,
    )
  }

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? result.error
        : `Unable to complete the request. (${response.status})`

    throw new Error(message)
  }

  return result ?? {}
}

// --- Calendar Service Logic ---

const calendarEventSelect =
  "id, user_id, title, description, starts_at, ends_at, is_all_day, created_at, updated_at"

export async function listCalendarEvents({ userId, rangeStart, rangeEnd }) {
  const client = requireClient()

  const { data, error } = await client.rpc("list_calendar_events_for_range", {
    range_end: rangeEnd,
    range_start: rangeStart,
  })

  if (isMissingRpcError(error)) {
    const fallbackResult = await client
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("user_id", userId)
      .lte("starts_at", rangeEnd)
      .gte("ends_at", rangeStart)
      .order("starts_at", { ascending: true })

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message)
    }

    return fallbackResult.data ?? []
  }

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).filter((event) => event.user_id === userId)
}

export async function createCalendarEvent({
  description,
  endsAt,
  isAllDay,
  startsAt,
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("calendar_events")
    .insert({
      user_id: userId,
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      is_all_day: isAllDay,
    })
    .select(calendarEventSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateCalendarEvent({
  description,
  endsAt,
  eventId,
  isAllDay,
  startsAt,
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("calendar_events")
    .update({
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      is_all_day: isAllDay,
    })
    .eq("id", eventId)
    .eq("user_id", userId)
    .select(calendarEventSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteCalendarEvent({ eventId, userId }) {
  const client = requireClient()

  const { error } = await client
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

// --- Chat Files Service Logic ---

export const chatFileSizeLimitBytes = 10 * 1024 * 1024
export const acceptedChatFileExtensions = [
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".html",
  ".htm",
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
]
export const acceptedChatFileInputAccept = acceptedChatFileExtensions.join(",")

const chatFileSelect =
  "id, thread_id, user_id, original_name, mime_type, size_bytes, status, error_message, created_at, updated_at"

async function invokeChatFileRequest(accessToken, body) {
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
  }

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  return fetch(`${supabaseUrl}/functions/v1/chat-file-attachments`, {
    method: "POST",
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

async function invokeChatFileMutation(body) {
  if (!supabaseUrl || !supabaseKey || !supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const currentSession = await getCurrentSession()

  if (!currentSession?.access_token) {
    throw new Error("You must be signed in to manage chat files.")
  }

  let response = await invokeChatFileRequest(currentSession.access_token, body)

  if (response.status === 401 && currentSession.refresh_token) {
    const refreshedSession = await refreshAccessToken(
      currentSession.refresh_token,
    )
    response = await invokeChatFileRequest(refreshedSession.access_token, body)
  }

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? result.error
        : `Unable to complete the request. (${response.status})`

    throw new Error(message)
  }

  return result ?? {}
}

function normalizeExtension(fileName) {
  const match = /\.([^.]+)$/.exec(fileName ?? "")
  return match ? `.${match[1].toLowerCase()}` : ""
}

export function validateChatFiles(files) {
  if (!Array.isArray(files) || !files.length) {
    throw new Error("Choose at least one file to upload.")
  }

  for (const file of files) {
    const extension = normalizeExtension(file?.name ?? "")

    if (!acceptedChatFileExtensions.includes(extension)) {
      throw new Error(
        `Unsupported file type for ${file?.name || "this file"}. Upload txt, md, csv, json, html, pdf, docx, xlsx, or pptx.`,
      )
    }

    if ((file?.size ?? 0) <= 0) {
      throw new Error(`${file?.name || "This file"} is empty.`)
    }

    if ((file?.size ?? 0) > chatFileSizeLimitBytes) {
      throw new Error(`${file.name} is larger than the 10 MB limit.`)
    }
  }

  return files
}

export async function listChatThreadFiles(userId, threadId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_thread_files")
    .select(chatFileSelect)
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (isMissingRelationError(error)) {
    return []
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function uploadChatFileAttachment({ file, threadId }) {
  const formData = new FormData()
  formData.append("action", "upload")
  formData.append("threadId", threadId)
  formData.append("file", file)

  const result = await invokeChatFileMutation(formData)

  if (!result?.file) {
    throw new Error("The upload response was missing the file record.")
  }

  return result.file
}

export async function removeChatFileAttachment({ fileId }) {
  const result = await invokeChatFileMutation({
    action: "delete",
    fileId,
  })

  return result?.fileId ?? fileId
}

// --- Chat Service Logic ---

const threadSelect =
  "id, user_id, title, selected_tool, attached_note_id, attached_note_title, folder_id, archived_at, created_at, updated_at"
const folderSelect =
  "id, user_id, title, system_prompt, selected_tool, attached_note_id, attached_note_title, archived_at, created_at, updated_at"
const messageSelect = "id, thread_id, user_id, role, content, created_at"

export async function listChatThreads(userId) {
  const client = requireClient()

  const activeThreadsQuery = client
    .from("active_chat_threads")
    .select(threadSelect)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  const { data, error } = await activeThreadsQuery

  if (isMissingRelationError(error)) {
    const fallbackResult = await client
      .from("chat_threads")
      .select(threadSelect)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message)
    }

    return fallbackResult.data ?? []
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function listArchivedChatThreads(userId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .select(threadSelect)
    .eq("user_id", userId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function listChatFolders(userId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folders")
    .select(folderSelect)
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function createChatFolder({ title, userId }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folders")
    .insert({
      title,
      user_id: userId,
    })
    .select(folderSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatFolder({ folderId, title, userId }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folders")
    .update({
      title,
    })
    .eq("id", folderId)
    .eq("user_id", userId)
    .select(folderSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteChatFolder({ folderId, userId }) {
  const client = requireClient()

  // First, unassign threads from this folder
  await client
    .from("chat_threads")
    .update({ folder_id: null })
    .eq("folder_id", folderId)
    .eq("user_id", userId)

  const { error } = await client
    .from("chat_folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateChatThreadFolder({ threadId, folderId, userId }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      folder_id: folderId,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function listChatMessages(userId, threadId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_messages")
    .select(messageSelect)
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function createChatThread({
  attachedNoteId = null,
  selectedTool = "",
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .insert({
      attached_note_id: attachedNoteId,
      selected_tool: selectedTool,
      user_id: userId,
      title,
    })
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatThreadTool({ selectedTool, threadId, userId }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      selected_tool: selectedTool,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatThreadAttachment({
  attachedNoteId,
  threadId,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      attached_note_id: attachedNoteId,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function archiveChatThread({ threadId, userId }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function unarchiveChatThread({ threadId, userId }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      archived_at: null,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteChatThreadPermanent({ threadId, userId }) {
  const client = requireClient()

  const { error } = await client
    .from("chat_threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function createChatMessage({ threadId, userId, role, content }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      user_id: userId,
      role,
      content,
    })
    .select(messageSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatMessage({ messageId, userId, content }) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_messages")
    .update({
      content,
    })
    .eq("id", messageId)
    .eq("user_id", userId)
    .select(messageSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// --- Models Service Logic ---

export const defaultChatModels = [
  {
    key: "MiniMaxAI/MiniMax-M2.7:together",
    label: "MiniMaxAI/MiniMax-M2.7:together",
    provider: "huggingface-router",
  },
  {
    key: "openrouter/free",
    label: "OpenRouter Free Router",
    provider: "openrouter",
  },
  {
    key: "google/gemma-4-26b-a4b-it:free",
    label: "Google Gemma 4 26B A4B (Free)",
    provider: "openrouter",
  },
  {
    key: "openai/gpt-oss-20b:free",
    label: "OpenAI GPT-OSS 20B (Free)",
    provider: "openrouter",
  },
]

export async function listAvailableChatModels() {
  if (!supabase) {
    return defaultChatModels
  }

  const { data, error } = await supabase
    .from("chat_models")
    .select("key, label, provider")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true })

  if (isMissingRelationError(error)) {
    return defaultChatModels
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

// --- Notes Service Logic ---

const noteSelect =
  "id, user_id, title, content, archived_at, created_at, updated_at"

export async function listNotes(userId) {
  const client = requireClient()

  const activeNotesQuery = client
    .from("active_notes")
    .select(noteSelect)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  const { data, error } = await activeNotesQuery

  if (isMissingRelationError(error)) {
    const fallbackResult = await client
      .from("notes")
      .select(noteSelect)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message)
    }

    return fallbackResult.data ?? []
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function createNote({ userId, title = "", content = "" }) {
  const client = requireClient()

  const { data, error } = await client
    .from("notes")
    .insert({
      user_id: userId,
      title,
      content,
    })
    .select(noteSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateNote({ noteId, userId, title, content }) {
  const client = requireClient()

  const { data, error } = await client
    .from("notes")
    .update({
      title,
      content,
    })
    .eq("id", noteId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .select(noteSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function archiveNote({ noteId, userId }) {
  const client = requireClient()

  const { error } = await client
    .from("notes")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("user_id", userId)
    .is("archived_at", null)

  if (error) {
    throw new Error(error.message)
  }
}

// --- Workspace Search Service Logic ---

const calendarSearchWindowInMonths = 12

function getCalendarSearchWindow(now = new Date()) {
  const rangeStart = new Date(
    now.getFullYear(),
    now.getMonth() - calendarSearchWindowInMonths,
    1,
    0,
    0,
    0,
    0,
  )
  const rangeEnd = new Date(
    now.getFullYear(),
    now.getMonth() + calendarSearchWindowInMonths + 1,
    0,
    23,
    59,
    59,
    999,
  )

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
  }
}

function buildHref(pathname, searchParams) {
  const query = new URLSearchParams(searchParams).toString()
  return query ? `${pathname}?${query}` : pathname
}

function toDateValue(value) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf()
}

function createNoteRecord(note) {
  const title = getNoteTitle(note)
  const preview = getNotePreview(note)

  return {
    type: "note",
    id: note.id,
    title,
    subtitle: preview,
    href: `/notes/${note.id}`,
    updatedAt: note.updated_at,
    meta: formatRelativeTime(note.updated_at),
    searchValue: `${title} ${preview}`.trim(),
    sortValue: toDateValue(note.updated_at),
  }
}

function createChatRecord(thread) {
  const title = thread.title?.trim() || "Untitled chat"

  return {
    type: "chat",
    id: thread.id,
    title,
    subtitle: thread.selected_tool?.trim()
      ? `Tool: ${thread.selected_tool.trim()}`
      : "Chat thread",
    href: buildHref("/chat", { threadId: thread.id }),
    updatedAt: thread.updated_at,
    meta: formatRelativeTime(thread.updated_at),
    searchValue: title,
    sortValue: toDateValue(thread.updated_at),
  }
}

function createCalendarRecord(event) {
  const title = event.title?.trim() || "Untitled event"
  const description = event.description?.trim() ?? ""

  return {
    type: "calendar",
    id: event.id,
    title,
    subtitle: description
      ? `${formatCompactDate(event.starts_at)} - ${description}`
      : formatCompactDate(event.starts_at),
    href: buildHref("/calendar", {
      date: event.starts_at,
      eventId: event.id,
    }),
    updatedAt: event.updated_at || event.starts_at,
    meta: formatCompactDate(event.starts_at),
    searchValue: `${title} ${description}`.trim(),
    sortValue: Math.max(
      toDateValue(event.updated_at),
      toDateValue(event.starts_at),
    ),
  }
}

export async function loadWorkspaceSearchRecords(userId) {
  const { rangeStart, rangeEnd } = getCalendarSearchWindow()
  const requests = [
    {
      key: "note",
      label: "Notes",
      load: () => listNotes(userId),
    },
    {
      key: "chat",
      label: "Chat",
      load: () => listChatThreads(userId),
    },
    {
      key: "calendar",
      label: "Calendar",
      load: () =>
        listCalendarEvents({
          userId,
          rangeStart,
          rangeEnd,
        }),
    },
  ]

  const settledResults = await Promise.allSettled(
    requests.map((request) => request.load()),
  )

  const records = []
  const errors = []

  settledResults.forEach((result, index) => {
    const request = requests[index]

    if (result.status === "rejected") {
      errors.push({
        key: request.key,
        label: request.label,
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "Unable to load results.",
      })
      return
    }

    const nextRecords =
      request.key === "note"
        ? result.value.map(createNoteRecord)
        : request.key === "chat"
          ? result.value.map(createChatRecord)
          : result.value.map(createCalendarRecord)

    records.push(...nextRecords)
  })

  return {
    errors,
    records,
  }
}
