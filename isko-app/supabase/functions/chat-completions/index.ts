import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

import { corsHeaders } from "../_shared/cors.ts"

const DEFAULT_PROVIDER = "huggingface-router"
const OPENROUTER_PROVIDER = "openrouter"
const PLACEHOLDER_PROVIDER = "placeholder"
const ALLOWED_TOOLS = new Set(["", "Math", "Programming", "Complex Problems"])
const PLACEHOLDER_API_KEY_VALUES = new Set([
  "",
  "replace-me",
  "your-api-key",
  "your_api_key",
  "changeme",
])
const SUPPORTED_PROVIDERS = new Set([
  DEFAULT_PROVIDER,
  OPENROUTER_PROVIDER,
  PLACEHOLDER_PROVIDER,
])

type AllowedRole = "assistant" | "system" | "user"
type ProviderName =
  | typeof DEFAULT_PROVIDER
  | typeof OPENROUTER_PROVIDER
  | typeof PLACEHOLDER_PROVIDER

type CompletionPayload = {
  messages?: Array<{
    content?: unknown
    role?: unknown
  }>
  model?: unknown
  selectedTool?: unknown
  threadId?: unknown
}

type NormalizedMessage = {
  content: string
  role: AllowedRole
}

type ProviderConfig = {
  apiKey: string
  baseUrl: string
  missingSecretName: string
  provider: ProviderName
  systemPrompt: string
}

type ChatModelConfig = {
  key: string
  provider: ProviderName
}

type AttachedNoteContext = {
  content: string
  title: string
}

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

function normalizeProvider(value: unknown): ProviderName {
  if (typeof value !== "string") {
    return DEFAULT_PROVIDER
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === DEFAULT_PROVIDER || normalized === OPENROUTER_PROVIDER) {
    return normalized
  }

  if (normalized === PLACEHOLDER_PROVIDER) {
    return PLACEHOLDER_PROVIDER
  }

  return DEFAULT_PROVIDER
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

function normalizeMessageRole(value: unknown): AllowedRole {
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

function getLegacyProvider() {
  const provider = normalizeProvider(Deno.env.get("AI_PROVIDER") ?? DEFAULT_PROVIDER)

  return SUPPORTED_PROVIDERS.has(provider) ? provider : DEFAULT_PROVIDER
}

function getProviderConfig(provider: ProviderName): ProviderConfig {
  const systemPrompt = (Deno.env.get("AI_SYSTEM_PROMPT") ?? "").trim()

  switch (provider) {
    case OPENROUTER_PROVIDER:
      return {
        apiKey: (Deno.env.get("OPENROUTER_API_KEY") ?? "").trim(),
        baseUrl: (
          Deno.env.get("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1"
        ).trim(),
        missingSecretName: "OPENROUTER_API_KEY",
        provider,
        systemPrompt,
      }
    case PLACEHOLDER_PROVIDER:
      return {
        apiKey: "",
        baseUrl: "",
        missingSecretName: "AI_PROVIDER=placeholder",
        provider,
        systemPrompt,
      }
    default:
      return {
        apiKey: (Deno.env.get("HF_TOKEN") ?? Deno.env.get("AI_API_KEY") ?? "").trim(),
        baseUrl: (
          Deno.env.get("AI_BASE_URL") ?? "https://router.huggingface.co/v1"
        ).trim(),
        missingSecretName: "HF_TOKEN",
        provider: DEFAULT_PROVIDER,
        systemPrompt,
      }
  }
}

function isConfiguredApiKey(value: string) {
  return !PLACEHOLDER_API_KEY_VALUES.has(value.trim().toLowerCase())
}

function isPlaceholderMode(config: ProviderConfig) {
  if (config.provider === PLACEHOLDER_PROVIDER) {
    return true
  }

  if (!config.baseUrl) {
    return true
  }

  return !isConfiguredApiKey(config.apiKey)
}

function getLatestUserPrompt(messages: NormalizedMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
}

function buildPlaceholderReply(config: ProviderConfig, model: string, latestUserPrompt: string) {
  const promptPreview = latestUserPrompt.replace(/\s+/g, " ").slice(0, 160)

  return [
    `AI placeholder response for ${model}.`,
    `Add ${config.missingSecretName} in supabase/functions/.env or Supabase function secrets to enable live ${config.provider} completions.`,
    promptPreview ? `Latest prompt: "${promptPreview}"` : "",
  ]
    .filter(Boolean)
    .join(" ")
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

function getToolInstruction(selectedTool: string) {
  switch (selectedTool) {
    case "Math":
      return [
        "Current tool: Math.",
        "You are operating in Math tool mode for this thread.",
        "If the user asks which tool is active, answer that the current tool is Math.",
        "Solve quantitative problems step by step, state assumptions clearly, show formulas when useful, and verify calculations before concluding.",
      ].join(" ")
    case "Programming":
      return [
        "Current tool: Programming.",
        "You are operating in Programming tool mode for this thread.",
        "If the user asks which tool is active, answer that the current tool is Programming.",
        "Prioritize correctness, practical implementation detail, debugging clarity, and concise code examples when they materially help.",
      ].join(" ")
    case "Complex Problems":
      return [
        "Current tool: Complex Problems.",
        "You are operating in Complex Problems tool mode for this thread.",
        "If the user asks which tool is active, answer that the current tool is Complex Problems.",
        "Break the problem into parts, reason explicitly about tradeoffs, and end with concrete next steps.",
      ].join(" ")
    default:
      return ""
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

function buildAttachedNoteInstruction(attachedNoteContext: AttachedNoteContext | null) {
  if (!attachedNoteContext) {
    return ""
  }

  return [
    `Attached note available: ${attachedNoteContext.title}.`,
    "You can read the attached note content in this request.",
    "Do not say that you cannot access the user's notes when attached note content is provided below.",
    "If the user asks about their notes, answer from the attached note content first.",
    "Treat the attached note as authoritative context for this thread unless the user tells you to ignore it.",
    "Attached note content:",
    attachedNoteContext.content,
  ].join("\n\n")
}

function buildRequestContextBlock(
  selectedTool: string,
  attachedNoteContext: AttachedNoteContext | null,
) {
  const sections = [
    "The following thread context is real application data provided with this request.",
    "Use it directly when answering. Do not claim you cannot access notes or tools when they are included here.",
  ]

  if (selectedTool) {
    sections.push(`Active tool: ${selectedTool}`)
  }

  if (attachedNoteContext) {
    sections.push(`Attached note title: ${attachedNoteContext.title}`)
    sections.push("Attached note content:")
    sections.push(attachedNoteContext.content)
  }

  if (sections.length <= 2) {
    return ""
  }

  return ["[THREAD_CONTEXT]", ...sections, "[END_THREAD_CONTEXT]"].join("\n\n")
}

function injectRequestContext(
  messages: NormalizedMessage[],
  selectedTool: string,
  attachedNoteContext: AttachedNoteContext | null,
) {
  const contextBlock = buildRequestContextBlock(selectedTool, attachedNoteContext)

  if (!contextBlock) {
    return messages
  }

  const nextMessages = [...messages]

  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index].role !== "user") {
      continue
    }

    nextMessages[index] = {
      ...nextMessages[index],
      content: `${contextBlock}\n\n[USER_MESSAGE]\n\n${nextMessages[index].content}`,
    }
    return nextMessages
  }

  return nextMessages
}

function extractTextContent(value: unknown): string {
  if (typeof value === "string") {
    return value
  }

  if (!Array.isArray(value)) {
    return ""
  }

  return value
    .map((part) => {
      if (typeof part === "string") {
        return part
      }

      if (part && typeof part === "object" && typeof part.text === "string") {
        return part.text
      }

      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

function extractProviderError(result: unknown, fallbackMessage: string) {
  if (result && typeof result === "object") {
    const errorPayload = result as {
      error?: string | { code?: number | string; message?: string }
    }
    const message =
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : typeof errorPayload.error?.message === "string"
          ? errorPayload.error.message
          : ""

    if (message) {
      return message
    }
  }

  return fallbackMessage
}

function extractProviderStatus(result: unknown, fallbackStatus: number) {
  if (result && typeof result === "object") {
    const errorPayload = result as {
      error?: { code?: number | string }
    }
    const code = errorPayload.error?.code

    if (typeof code === "number" && Number.isInteger(code) && code >= 400 && code <= 599) {
      return code
    }

    if (typeof code === "string" && /^\d{3}$/.test(code)) {
      return Number(code)
    }
  }

  return fallbackStatus
}

function extractStreamDelta(result: unknown) {
  if (!result || typeof result !== "object") {
    return ""
  }

  const streamPayload = result as {
    choices?: Array<{
      delta?: {
        content?: unknown
      }
      message?: {
        content?: unknown
      }
    }>
  }
  const choice = streamPayload.choices?.[0]

  if (!choice || typeof choice !== "object") {
    return ""
  }

  return extractTextContent(choice.delta?.content ?? choice.message?.content)
}

async function* iterateSseData(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, "\n")
    let separatorIndex = buffer.indexOf("\n\n")

    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)
      separatorIndex = buffer.indexOf("\n\n")

      const data = rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")

      if (data) {
        yield data
      }
    }
  }

  buffer = buffer.replace(/\r\n/g, "\n")
  const trailingData = buffer
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")

  if (trailingData) {
    yield trailingData
  }
}

function encodeStreamEvent(encoder: TextEncoder, payload: Record<string, unknown>) {
  return encoder.encode(`${JSON.stringify(payload)}\n`)
}

function createPlaceholderStream(
  config: ProviderConfig,
  model: string,
  latestUserPrompt: string,
) {
  const encoder = new TextEncoder()
  const placeholderReply = buildPlaceholderReply(config, model, latestUserPrompt)

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encodeStreamEvent(encoder, {
          delta: placeholderReply,
          type: "delta",
        }),
      )
      controller.enqueue(
        encodeStreamEvent(encoder, {
          provider: config.provider,
          type: "complete",
        }),
      )
      controller.close()
    },
  })
}

async function createOpenAICompatibleStream(
  config: ProviderConfig,
  model: string,
  messages: NormalizedMessage[],
  selectedTool: string,
  attachedNoteContext: AttachedNoteContext | null,
) {
  const upstreamConversation = injectRequestContext(
    messages,
    selectedTool,
    attachedNoteContext,
  )
  const systemMessages = [
    config.systemPrompt,
    getToolInstruction(selectedTool),
    buildAttachedNoteInstruction(attachedNoteContext),
  ]
    .filter(Boolean)
    .map((content) => ({
      role: "system" as const,
      content,
    }))
  const upstreamMessages = [...systemMessages, ...upstreamConversation]

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: upstreamMessages,
      model,
      stream: true,
    }),
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    const providerStatus = extractProviderStatus(
      result,
      response.status >= 400 && response.status <= 599 ? response.status : 502,
    )

    throw new HttpError(
      providerStatus,
      extractProviderError(result, "The AI provider request failed."),
    )
  }

  if (!response.body) {
    throw new HttpError(502, "The AI provider response did not include a readable stream.")
  }

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const data of iterateSseData(response.body)) {
          if (data === "[DONE]") {
            controller.enqueue(
              encodeStreamEvent(encoder, {
                provider: config.provider,
                type: "complete",
              }),
            )
            controller.close()
            return
          }

          let payload

          try {
            payload = JSON.parse(data)
          } catch {
            continue
          }

          const delta = extractStreamDelta(payload)
          const completionPayload = payload as {
            choices?: Array<{
              finish_reason?: string | null
            }>
          }

          if (delta) {
            controller.enqueue(
              encodeStreamEvent(encoder, {
                delta,
                type: "delta",
              }),
            )
          }

          const finishReason =
            completionPayload.choices?.[0]?.finish_reason ?? null

          if (finishReason) {
            controller.enqueue(
              encodeStreamEvent(encoder, {
                provider: config.provider,
                type: "complete",
              }),
            )
            controller.close()
            return
          }
        }

        controller.enqueue(
          encodeStreamEvent(encoder, {
            provider: config.provider,
            type: "complete",
          }),
        )
        controller.close()
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The AI provider stream failed."

        controller.enqueue(
          encodeStreamEvent(encoder, {
            error: message,
            type: "error",
          }),
        )
        controller.close()
      }
    },
    cancel() {
      void response.body?.cancel().catch(() => undefined)
    },
  })
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
    const attachedNoteContext = await resolveAttachedNoteContext(supabase, threadId)

    const body = isPlaceholderMode(providerConfig)
      ? createPlaceholderStream(providerConfig, modelConfig.key, latestUserPrompt)
      : await createOpenAICompatibleStream(
          providerConfig,
          modelConfig.key,
          messages,
          selectedTool,
          attachedNoteContext,
        )

    return streamResponse(body)
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message })
    }

    const message = error instanceof Error ? error.message : "Unexpected server error."
    return jsonResponse(500, { error: message })
  }
})
