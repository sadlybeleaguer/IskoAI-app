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
  const errorText = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")

  return (
    error?.code === "PGRST205" ||
    ((error?.status === 404 || error?.statusCode === 404) &&
      /table|relation|schema cache/i.test(errorText)) ||
    /could not find the table|relation .* does not exist/i.test(errorText)
  )
}

function isMissingColumnError(error, columnName) {
  if (!error) return false

  const errorText = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")

  const isGenericMissingColumn =
    error.code === "PGRST204" ||
    /column .* does not exist|could not find .* in the schema cache/i.test(
      errorText,
    )

  if (!columnName) return isGenericMissingColumn

  return (
    error.code === "PGRST204" ||
    new RegExp(`column .*${columnName}.* does not exist|could not find .*${columnName}.* in the schema cache`, "i").test(
      errorText,
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

const quizRelationAvailability = {
  activeQuizAttempts: null,
  quizAnswers: null,
  quizAttempts: null,
  quizQuestions: null,
}

function markQuizRelationAvailability(key, isAvailable) {
  quizRelationAvailability[key] = isAvailable
}

function isQuizRelationKnownMissing(key) {
  return quizRelationAvailability[key] === false
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

const chatThreadFileSelect =
  "id, thread_id, user_id, original_name, mime_type, size_bytes, status, error_message, created_at, updated_at"
const chatFolderFileSelect =
  "id, folder_id, user_id, original_name, mime_type, size_bytes, status, error_message, created_at, updated_at"

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

async function invokeQuizFunction(functionName, body) {
  if (!supabaseUrl || !supabaseKey || !supabase) {
    throw new Error("Supabase environment variables are missing.")
  }

  const currentSession = await getCurrentSession()

  if (!currentSession?.access_token) {
    throw new Error("You must be signed in to use quizzes.")
  }

  const invokeRequest = (accessToken) =>
    fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

  let response = await invokeRequest(currentSession.access_token)

  if (response.status === 401 && currentSession.refresh_token) {
    const refreshedSession = await refreshAccessToken(currentSession.refresh_token)
    response = await invokeRequest(refreshedSession.access_token)
  }

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? result.error
        : `Unable to complete the quiz request. (${response.status})`

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
    .select(chatThreadFileSelect)
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
  formData.append("target", "thread")
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
    target: "thread",
  })

  return result?.fileId ?? fileId
}

export async function listChatFolderFiles(userId, folderId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folder_files")
    .select(chatFolderFileSelect)
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .order("created_at", { ascending: true })

  if (isMissingRelationError(error)) {
    return []
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function uploadChatFolderFile({ file, folderId }) {
  const formData = new FormData()
  formData.append("action", "upload")
  formData.append("target", "folder")
  formData.append("folderId", folderId)
  formData.append("file", file)

  const result = await invokeChatFileMutation(formData)

  if (!result?.file) {
    throw new Error("The upload response was missing the file record.")
  }

  return result.file
}

export async function removeChatFolderFile({ fileId }) {
  const result = await invokeChatFileMutation({
    action: "delete",
    fileId,
    target: "folder",
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

export async function createChatFolder({
  attachedNoteId = null,
  selectedTool = "",
  systemPrompt = "",
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folders")
    .insert({
      attached_note_id: attachedNoteId,
      selected_tool: selectedTool,
      system_prompt: systemPrompt,
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

export async function updateChatFolder({
  attachedNoteId,
  folderId,
  selectedTool,
  systemPrompt,
  title,
  userId,
}) {
  const client = requireClient()
  const updates = {}

  if (typeof attachedNoteId !== "undefined") {
    updates.attached_note_id = attachedNoteId
  }

  if (typeof selectedTool !== "undefined") {
    updates.selected_tool = selectedTool
  }

  if (typeof systemPrompt !== "undefined") {
    updates.system_prompt = systemPrompt
  }

  if (typeof title !== "undefined") {
    updates.title = title
  }

  const { data, error } = await client
    .from("chat_folders")
    .update(updates)
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
    description: "Balanced general model for explanations, summaries, and study chat.",
    key: "MiniMaxAI/MiniMax-M2.7:together",
    label: "MiniMaxAI/MiniMax-M2.7:together",
    provider: "huggingface-router",
  },
  {
    description: "Routes to an available free model; responses can vary by provider capacity.",
    key: "openrouter/free",
    label: "OpenRouter Free Router",
    provider: "openrouter",
  },
  {
    description: "Open-weight Google model for concise reasoning and study explanations.",
    key: "google/gemma-4-26b-a4b-it:free",
    label: "Google Gemma 4 26B A4B (Free)",
    provider: "openrouter",
  },
  {
    description: "OpenAI open-weight model for general chat, reasoning, and quiz support.",
    key: "openai/gpt-oss-20b:free",
    label: "OpenAI GPT-OSS 20B (Free)",
    provider: "openrouter",
  },
]

function getChatModelDescription(model) {
  const key = model?.key ?? ""
  const label = model?.label ?? ""
  const provider = model?.provider ?? ""
  const searchable = `${key} ${label}`.toLowerCase()

  if (searchable.includes("openrouter/free")) {
    return "Routes to an available free model; responses can vary by provider capacity."
  }

  if (searchable.includes("gemma")) {
    return "Open-weight Google model for concise reasoning and study explanations."
  }

  if (searchable.includes("gpt-oss")) {
    return "OpenAI open-weight model for general chat, reasoning, and quiz support."
  }

  if (searchable.includes("minimax")) {
    return "Balanced general model for explanations, summaries, and study chat."
  }

  if (provider === "openrouter") {
    return "OpenRouter-hosted model for general chat and quiz generation."
  }

  return "General-purpose model for chat, explanations, and study workflows."
}

function normalizeChatModel(model) {
  return {
    ...model,
    description: model?.description || getChatModelDescription(model),
  }
}

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

  return (data ?? []).map(normalizeChatModel)
}

// --- Quiz Service Logic ---

const quizAttemptSelect =
  "id, user_id, thread_id, title, topic, difficulty, question_count, formats, attached_note_id, attached_note_title, status, score_points, max_score_points, score_percent, summary_feedback, archived_at, created_at, updated_at"
const legacyQuizAttemptSelect =
  "id, user_id, title, topic, difficulty, question_count, formats, attached_note_id, attached_note_title, status, score_points, max_score_points, score_percent, summary_feedback, archived_at, created_at, updated_at"
const minimalQuizAttemptSelect =
  "id, user_id, title, status, archived_at, created_at, updated_at"
const quizQuestionSelect =
  "id, attempt_id, user_id, question_type, prompt, choices, expected_answer, explanation, sort_order, created_at, updated_at"
const quizAnswerSelect =
  "id, attempt_id, question_id, user_id, answer, is_correct, score, max_score, feedback, created_at, updated_at"

function mergeQuizRecords(attempts, questions, answers) {
  const questionsByAttemptId = new Map()
  const answersByQuestionId = new Map()

  for (const answer of answers) {
    answersByQuestionId.set(answer.question_id, answer)
  }

  for (const question of questions) {
    const nextQuestion = {
      ...question,
      answer: answersByQuestionId.get(question.id) ?? null,
    }

    if (!questionsByAttemptId.has(question.attempt_id)) {
      questionsByAttemptId.set(question.attempt_id, [])
    }

    questionsByAttemptId.get(question.attempt_id).push(nextQuestion)
  }

  return attempts.map((attempt) => ({
    ...attempt,
    questions: questionsByAttemptId.get(attempt.id) ?? [],
  }))
}

export async function listQuizAttempts(userId) {
  const client = requireClient()
  let attempts = []
  let loadedAttempts = false

  if (!isQuizRelationKnownMissing("activeQuizAttempts")) {
    const selects = [
      quizAttemptSelect,
      legacyQuizAttemptSelect,
      minimalQuizAttemptSelect,
    ]
    let lastError = null

    for (const select of selects) {
      const { data, error } = await client
        .from("active_quiz_attempts")
        .select(select)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (!error) {
        markQuizRelationAvailability("activeQuizAttempts", true)
        attempts = data ?? []
        loadedAttempts = true
        break
      }

      lastError = error
      if (!isMissingColumnError(error)) {
        break
      }
    }

    if (!loadedAttempts) {
      if (isMissingRelationError(lastError)) {
        markQuizRelationAvailability("activeQuizAttempts", false)
      } else if (lastError) {
        // If it's not a missing relation, it might be a broken view.
        // We'll let it fall through to the table fallback.
      }
    }
  }

  if (!loadedAttempts) {
    if (isQuizRelationKnownMissing("quizAttempts")) {
      return []
    }

    const selects = [
      quizAttemptSelect,
      legacyQuizAttemptSelect,
      minimalQuizAttemptSelect,
    ]
    let lastError = null

    for (const select of selects) {
      const { data, error } = await client
        .from("quiz_attempts")
        .select(select)
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })

      if (!error) {
        markQuizRelationAvailability("quizAttempts", true)
        attempts = data ?? []
        loadedAttempts = true
        break
      }

      lastError = error
      if (!isMissingColumnError(error)) {
        break
      }
    }

    if (!loadedAttempts) {
      if (isMissingRelationError(lastError)) {
        markQuizRelationAvailability("quizAttempts", false)
        return []
      }

      if (lastError) {
        throw new Error(lastError.message)
      }
    }
  }

  if (!attempts.length) {
    return []
  }

  const attemptIds = attempts.map((attempt) => attempt.id)
  const [questionsResult, answersResult] = await Promise.all(
    [
      isQuizRelationKnownMissing("quizQuestions")
        ? null
        : client
            .from("quiz_questions")
            .select(quizQuestionSelect)
            .in("attempt_id", attemptIds)
            .order("sort_order", { ascending: true }),
      isQuizRelationKnownMissing("quizAnswers")
        ? null
        : client
            .from("quiz_answers")
            .select(quizAnswerSelect)
            .in("attempt_id", attemptIds),
    ].map((result) => Promise.resolve(result)),
  )

  if (questionsResult?.error) {
    if (isMissingRelationError(questionsResult.error)) {
      markQuizRelationAvailability("quizQuestions", false)
      return attempts.map((attempt) => ({ ...attempt, questions: [] }))
    }

    throw new Error(questionsResult.error.message)
  }

  if (questionsResult) {
    markQuizRelationAvailability("quizQuestions", true)
  }

  if (answersResult?.error) {
    if (isMissingRelationError(answersResult.error)) {
      markQuizRelationAvailability("quizAnswers", false)
      return mergeQuizRecords(attempts, questionsResult?.data ?? [], [])
    }

    throw new Error(answersResult.error.message)
  }

  if (answersResult) {
    markQuizRelationAvailability("quizAnswers", true)
  }

  return mergeQuizRecords(
    attempts,
    questionsResult?.data ?? [],
    answersResult?.data ?? [],
  )
}

export async function generateQuiz(payload) {
  const result = await invokeQuizFunction("quiz-generate", payload)

  if (!result?.quiz) {
    throw new Error("The quiz generator response was missing quiz data.")
  }

  return result.quiz
}

export async function createQuizAttemptWithQuestions({
  attachedNoteId = null,
  difficulty,
  formats,
  questions,
  questionCount,
  threadId = null,
  title,
  topic,
  userId,
}) {
  const client = requireClient()
  const attemptPayload = {
    attached_note_id: attachedNoteId,
    difficulty,
    formats,
    question_count: questionCount,
    status: "generated",
    thread_id: threadId,
    title,
    topic,
    user_id: userId,
  }

  const selects = [
    quizAttemptSelect,
    legacyQuizAttemptSelect,
    minimalQuizAttemptSelect,
  ]
  let attempt = null
  let attemptError = null

  for (const select of selects) {
    let currentPayload = { ...attemptPayload }

    // If we've already seen that thread_id is missing, or if we're on a legacy/minimal select,
    // we should strip thread_id from the payload too.
    if (
      (attemptError && isMissingColumnError(attemptError, "thread_id")) ||
      select !== quizAttemptSelect
    ) {
      delete currentPayload.thread_id
    }

    const { data, error } = await client
      .from("quiz_attempts")
      .insert(currentPayload)
      .select(select)
      .single()

    if (!error) {
      attempt = data
      attemptError = null
      break
    }

    attemptError = error
    if (!isMissingColumnError(error)) {
      break
    }
  }

  if (attemptError) {
    throw new Error(attemptError.message)
  }

  const questionRows = questions.map((question, index) => ({
    attempt_id: attempt.id,
    choices: question.choices ?? [],
    explanation: question.explanation ?? "",
    expected_answer: question.expectedAnswer ?? "",
    prompt: question.prompt,
    question_type: question.type,
    sort_order: index,
    user_id: userId,
  }))

  const { data: savedQuestions, error: questionsError } = await client
    .from("quiz_questions")
    .insert(questionRows)
    .select(quizQuestionSelect)

  if (questionsError) {
    throw new Error(questionsError.message)
  }

  return {
    ...attempt,
    questions: (savedQuestions ?? []).map((question) => ({
      ...question,
      answer: null,
    })),
  }
}

export async function saveQuizAnswers({ answers, attemptId, userId }) {
  const client = requireClient()
  const rows = answers.map((answer) => ({
    answer: answer.answer ?? "",
    attempt_id: attemptId,
    max_score: 1,
    question_id: answer.questionId,
    user_id: userId,
  }))

  if (!rows.length) {
    return []
  }

  const { data, error } = await client
    .from("quiz_answers")
    .upsert(rows, { onConflict: "attempt_id,question_id" })
    .select(quizAnswerSelect)

  if (error) {
    throw new Error(error.message)
  }

  const { error: attemptError } = await client
    .from("quiz_attempts")
    .update({ status: "submitted" })
    .eq("id", attemptId)
    .eq("user_id", userId)

  if (attemptError) {
    throw new Error(attemptError.message)
  }

  return data ?? []
}

export async function gradeQuiz(payload) {
  const result = await invokeQuizFunction("quiz-grade", payload)

  if (!result?.grades) {
    throw new Error("The quiz grader response was missing grading data.")
  }

  return result.grades
}

export async function applyQuizGrades({ attemptId, grades, userId }) {
  const client = requireClient()
  const answerRows = grades.answers.map((answer) => ({
    attempt_id: attemptId,
    feedback: answer.feedback ?? "",
    is_correct: Boolean(answer.isCorrect),
    max_score: answer.maxScore ?? 1,
    question_id: answer.questionId,
    score: answer.score ?? 0,
    user_id: userId,
  }))

  const { data: answers, error: answersError } = await client
    .from("quiz_answers")
    .upsert(answerRows, { onConflict: "attempt_id,question_id" })
    .select(quizAnswerSelect)

  if (answersError) {
    throw new Error(answersError.message)
  }

  const updateFields = {
    max_score_points: grades.maxScorePoints,
    score_percent: grades.scorePercent,
    score_points: grades.scorePoints,
    status: "graded",
    summary_feedback: grades.summaryFeedback ?? "",
  }

  const selects = [
    quizAttemptSelect,
    legacyQuizAttemptSelect,
    minimalQuizAttemptSelect,
  ]
  let attempt = null
  let attemptError = null

  for (const select of selects) {
    const { data, error } = await client
      .from("quiz_attempts")
      .update(updateFields)
      .eq("id", attemptId)
      .eq("user_id", userId)
      .select(select)
      .single()

    if (!error) {
      attempt = data
      attemptError = null
      break
    }

    attemptError = error
    if (!isMissingColumnError(error)) {
      break
    }
  }

  if (attemptError) {
    throw new Error(attemptError.message)
  }

  return { answers: answers ?? [], attempt }
}

export async function archiveQuizAttempt({ attemptId, userId }) {
  const client = requireClient()
  const selects = [
    quizAttemptSelect,
    legacyQuizAttemptSelect,
    minimalQuizAttemptSelect,
  ]
  let data = null
  let error = null

  for (const select of selects) {
    const result = await client
      .from("quiz_attempts")
      .update({
        archived_at: new Date().toISOString(),
        status: "archived",
      })
      .eq("id", attemptId)
      .eq("user_id", userId)
      .select(select)
      .single()

    if (!result.error) {
      data = result.data
      error = null
      break
    }

    error = result.error
    if (!isMissingColumnError(error)) {
      break
    }
  }

  if (error) {
    throw new Error(error.message)
  }

  return data
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

export async function deleteNote({ noteId, userId }) {
  const client = requireClient()

  const { error } = await client
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId)

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
