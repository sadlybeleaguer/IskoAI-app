import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

import { corsHeaders } from "../_shared/cors.ts"
import {
  type AttachedFileContext,
  type AttachedNoteContext,
  type ChatModelConfig,
  type CompletionPayload,
  getLatestUserPrompt,
  getLegacyProvider,
  getProviderConfig,
  isPlaceholderMode,
  normalizeProvider,
  type NormalizedMessage,
  createPlaceholderStream,
  createOpenAICompatibleStream,
} from "../_shared/ai.service.ts"

const ALLOWED_TOOLS = new Set(["", "Math", "Programming", "Complex Problems", "Quiz"])
const MAX_ATTACHED_FILE_CONTEXT_CHARACTERS = 30000
const MAX_ATTACHED_FILE_CONTEXT_PER_FILE = 12000

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function streamResponse(body: ReadableStream<Uint8Array>) {
  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  })
}

function requireSupabaseConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(500, "Supabase function auth configuration is missing.")
  }

  return {
    supabaseAnonKey,
    supabaseUrl,
  }
}

function createAuthedSupabaseClient(authHeader: string) {
  const { supabaseAnonKey, supabaseUrl } = requireSupabaseConfig()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })
}

function getAccessToken(authHeader: string) {
  const [scheme, token] = authHeader.trim().split(/\s+/, 2)

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "Authorization header must be a Bearer token.")
  }

  return token
}

async function requireAuthenticatedUser(authHeader: string) {
  const token = getAccessToken(authHeader)
  const supabase = createAuthedSupabaseClient(authHeader)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user?.id) {
    throw new HttpError(401, error?.message ?? "You must be signed in to use chat.")
  }

  return user
}

function isMissingModelRegistryError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    /column .*provider.* does not exist|could not find the table|relation .* does not exist/i.test(
      error?.message ?? "",
    )
  )
}

function isMissingThreadAttachmentSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    /column .*attached_note_(id|title).* does not exist|could not find the table|relation .* does not exist/i.test(
      error?.message ?? "",
    )
  )
}

function isMissingThreadFileSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    /relation .*chat_thread_files.* does not exist|column .*error_message.* does not exist|could not find the table/i.test(
      error?.message ?? "",
    )
  )
}

function isMissingThreadFolderSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    /column .*folder_id.* does not exist|could not find the table|relation .* does not exist/i.test(
      error?.message ?? "",
    )
  )
}

function isMissingFolderFileSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    /relation .*chat_folder_files.* does not exist|column .*error_message.* does not exist|could not find the table/i.test(
      error?.message ?? "",
    )
  )
}

function requireModel(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "model is required.")
  }

  return value.trim()
}

function requireThreadId(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "threadId is required.")
  }

  return value.trim()
}

function requireSelectedTool(value: unknown) {
  if (value == null) {
    return ""
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "selectedTool must be a string.")
  }

  const selectedTool = value.trim()

  if (!ALLOWED_TOOLS.has(selectedTool)) {
    throw new HttpError(400, "selectedTool is invalid.")
  }

  return selectedTool
}

function normalizeMessageRole(value: unknown): NormalizedMessage["role"] {
  if (value === "assistant" || value === "system" || value === "user") {
    return value
  }

  throw new HttpError(400, "messages must use assistant, system, or user roles.")
}

function normalizeMessageContent(value: unknown) {
  if (typeof value !== "string") {
    throw new HttpError(400, "messages must include string content.")
  }

  const content = value.trim()

  if (!content) {
    throw new HttpError(400, "messages must not be blank.")
  }

  return content
}

function requireMessages(value: unknown): NormalizedMessage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "messages must contain at least one item.")
  }

  const messages = value.map((message) => ({
    content: normalizeMessageContent(message?.content),
    role: normalizeMessageRole(message?.role),
  }))

  if (!messages.some((message) => message.role === "user")) {
    throw new HttpError(400, "messages must include at least one user message.")
  }

  return messages.slice(-20)
}

async function resolveModelConfig(
  supabase: SupabaseClient,
  modelKey: string,
): Promise<ChatModelConfig> {
  const { data, error } = await supabase
    .from("chat_models")
    .select("key, provider")
    .eq("key", modelKey)
    .eq("enabled", true)
    .maybeSingle<ChatModelConfig>()

  if (error) {
    if (isMissingModelRegistryError(error)) {
      return {
        key: modelKey,
        provider: getLegacyProvider(),
      }
    }

    throw new HttpError(500, error.message)
  }

  if (!data) {
    throw new HttpError(400, "Selected model is unavailable.")
  }

  return {
    key: data.key,
    provider: normalizeProvider(data.provider),
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
}

function extractPlainTextFromNoteContent(value: string) {
  if (!value.trim()) {
    return ""
  }

  const withLineBreaks = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li|ol|ul)>/gi, "\n")
    .replace(/<li>/gi, "- ")
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, " ")
  const decoded = decodeHtmlEntities(withoutTags)

  return decoded
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim()
}

async function resolveAttachedNoteContext(
  supabase: SupabaseClient,
  threadId: string,
): Promise<AttachedNoteContext | null> {
  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("attached_note_id, attached_note_title")
    .eq("id", threadId)
    .maybeSingle<{
      attached_note_id: string | null
      attached_note_title: string | null
    }>()

  if (threadError) {
    if (isMissingThreadAttachmentSchemaError(threadError)) {
      return null
    }

    throw new HttpError(500, threadError.message)
  }

  if (!thread) {
    throw new HttpError(404, "Chat thread was not found.")
  }

  if (!thread.attached_note_id) {
    return null
  }

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("title, content")
    .eq("id", thread.attached_note_id)
    .maybeSingle<{
      content: string
      title: string
    }>()

  if (noteError) {
    throw new HttpError(500, noteError.message)
  }

  if (!note) {
    return null
  }

  const content = extractPlainTextFromNoteContent(note.content ?? "")

  if (!content) {
    return null
  }

  return {
    content: content.slice(0, 12000),
    title:
      thread.attached_note_title?.trim() ||
      note.title?.trim() ||
      "Untitled note",
  }
}

async function resolveThreadFolderId(
  supabase: SupabaseClient,
  threadId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("folder_id")
    .eq("id", threadId)
    .maybeSingle<{ folder_id: string | null }>()

  if (error) {
    if (isMissingThreadFolderSchemaError(error)) {
      return null
    }

    throw new HttpError(500, error.message)
  }

  return data?.folder_id ?? null
}

type AttachedFileRow = {
  extracted_text: string
  original_name: string
}

async function listAttachedFileRows(
  supabase: SupabaseClient,
  relation: "chat_folder_files" | "chat_thread_files",
  column: "folder_id" | "thread_id",
  value: string,
): Promise<AttachedFileRow[]> {
  const { data, error } = await supabase
    .from(relation)
    .select("original_name, extracted_text")
    .eq(column, value)
    .eq("status", "ready")
    .order("created_at", { ascending: true })
    .returns<AttachedFileRow[]>()

  if (error) {
    if (
      (relation === "chat_thread_files" && isMissingThreadFileSchemaError(error)) ||
      (relation === "chat_folder_files" && isMissingFolderFileSchemaError(error))
    ) {
      return []
    }

    throw new HttpError(500, error.message)
  }

  return data ?? []
}

async function resolveAttachedFileContexts(
  supabase: SupabaseClient,
  threadId: string,
  folderId: string | null,
): Promise<AttachedFileContext[]> {
  const [folderFiles, threadFiles] = await Promise.all([
    folderId
      ? listAttachedFileRows(supabase, "chat_folder_files", "folder_id", folderId)
      : Promise.resolve([]),
    listAttachedFileRows(supabase, "chat_thread_files", "thread_id", threadId),
  ])

  let remainingCharacters = MAX_ATTACHED_FILE_CONTEXT_CHARACTERS
  const attachedFiles: AttachedFileContext[] = []

  for (const file of [...folderFiles, ...threadFiles]) {
    if (remainingCharacters <= 0) {
      break
    }

    const content = (file.extracted_text ?? "").trim()

    if (!content) {
      continue
    }

    const truncatedContent = content.slice(
      0,
      Math.min(MAX_ATTACHED_FILE_CONTEXT_PER_FILE, remainingCharacters),
    )

    attachedFiles.push({
      content: truncatedContent,
      name: file.original_name?.trim() || "Untitled file",
    })
    remainingCharacters -= truncatedContent.length
  }

  return attachedFiles
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." })
  }

  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      throw new HttpError(401, "Authorization header is required.")
    }

    await requireAuthenticatedUser(authHeader)
    const supabase = createAuthedSupabaseClient(authHeader)

    const payload = (await request.json()) as CompletionPayload
    const model = requireModel(payload.model)
    const selectedTool = requireSelectedTool(payload.selectedTool)
    const threadId = requireThreadId(payload.threadId)
    const messages = requireMessages(payload.messages)
    const modelConfig = await resolveModelConfig(supabase, model)
    const providerConfig = getProviderConfig(modelConfig.provider)
    const latestUserPrompt = getLatestUserPrompt(messages)
    const folderId = await resolveThreadFolderId(supabase, threadId)
    const attachedNoteContext = await resolveAttachedNoteContext(supabase, threadId)
    const attachedFileContexts = await resolveAttachedFileContexts(supabase, threadId, folderId)

    const body = isPlaceholderMode(providerConfig)
      ? createPlaceholderStream(providerConfig, modelConfig.key, latestUserPrompt)
      : await createOpenAICompatibleStream(
          providerConfig,
          modelConfig.key,
          messages,
          selectedTool,
          attachedNoteContext,
          attachedFileContexts,
        )

    return streamResponse(body)
  } catch (error) {
    // Both HttpError and AIServiceError have 'status' and 'message'
    const status = (error as { status?: number }).status ?? 500
    const message = error instanceof Error ? error.message : "Unexpected server error."
    return jsonResponse(status, { error: message })
  }
})
