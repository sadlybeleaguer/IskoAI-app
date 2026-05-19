export const DEFAULT_PROVIDER = "huggingface-router"
export const OPENROUTER_PROVIDER = "openrouter"
export const PLACEHOLDER_PROVIDER = "placeholder"
export const SUPPORTED_PROVIDERS = new Set([
  DEFAULT_PROVIDER,
  OPENROUTER_PROVIDER,
  PLACEHOLDER_PROVIDER,
])
export const PLACEHOLDER_API_KEY_VALUES = new Set([
  "",
  "replace-me",
  "your-api-key",
  "your_api_key",
  "changeme",
])

export type AllowedRole = "assistant" | "system" | "user"
export type ProviderName =
  | typeof DEFAULT_PROVIDER
  | typeof OPENROUTER_PROVIDER
  | typeof PLACEHOLDER_PROVIDER

export type CompletionPayload = {
  messages?: Array<{
    content?: unknown
    role?: unknown
  }>
  model?: unknown
  selectedTool?: unknown
  threadId?: unknown
}

export type NormalizedMessage = {
  content: string
  role: AllowedRole
}

export type ProviderConfig = {
  apiKey: string
  baseUrl: string
  missingSecretName: string
  provider: ProviderName
  systemPrompt: string
}

export type ChatModelConfig = {
  key: string
  provider: ProviderName
}

export type AttachedNoteContext = {
  content: string
  title: string
}

export type AttachedFileContext = {
  content: string
  name: string
}

/**
 * Custom Error class to be compatible with HttpError in index.ts
 * Since we don't want to export HttpError from index.ts to avoid circular deps
 */
class AIServiceError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "AIServiceError"
  }
}

export function normalizeProvider(value: unknown): ProviderName {
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

export function getLegacyProvider() {
  const provider = normalizeProvider(Deno.env.get("AI_PROVIDER") ?? DEFAULT_PROVIDER)

  return SUPPORTED_PROVIDERS.has(provider) ? provider : DEFAULT_PROVIDER
}

export function getProviderConfig(provider: ProviderName): ProviderConfig {
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

export function isConfiguredApiKey(value: string) {
  return !PLACEHOLDER_API_KEY_VALUES.has(value.trim().toLowerCase())
}

export function isPlaceholderMode(config: ProviderConfig) {
  if (config.provider === PLACEHOLDER_PROVIDER) {
    return true
  }

  if (!config.baseUrl) {
    return true
  }

  return !isConfiguredApiKey(config.apiKey)
}

export function getLatestUserPrompt(messages: NormalizedMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
}

export function buildPlaceholderReply(config: ProviderConfig, model: string, latestUserPrompt: string) {
  const promptPreview = latestUserPrompt.replace(/\s+/g, " ").slice(0, 160)

  return [
    `AI placeholder response for ${model}.`,
    `Add ${config.missingSecretName} in supabase/functions/.env or Supabase function secrets to enable live ${config.provider} completions.`,
    promptPreview ? `Latest prompt: "${promptPreview}"` : "",
  ]
    .filter(Boolean)
    .join(" ")
}

export function getToolInstruction(selectedTool: string) {
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
    case "Quiz":
      return [
        "Current tool: Quiz.",
        "You are operating in Quiz tool mode for this thread.",
        "If the user asks which tool is active, answer that the current tool is Quiz.",
        "Help the user generate study quizzes, clarify question intent, explain answers, and review weak areas. Keep answers focused on learning and assessment.",
      ].join(" ")
    default:
      return ""
  }
}

export function buildAttachedNoteInstruction(attachedNoteContext: AttachedNoteContext | null) {
  if (!attachedNoteContext) {
    return ""
  }

  return [
    `Attached note available: ${attachedNoteContext.title}.`,
    "You can read the attached note content in this request.",
    "Do not say that you cannot access the user's notes when attached note content is provided below.",
    "If the user asks about their notes, answer from the attached note content first.",
    "Treat the attached note as authoritative context for this chat unless the user tells you to ignore it.",
    "Attached note content:",
    attachedNoteContext.content,
  ].join("\n\n")
}

export function buildAttachedFileInstruction(attachedFileContexts: AttachedFileContext[]) {
  if (!attachedFileContexts.length) {
    return ""
  }

  return [
    `Attached files available: ${attachedFileContexts.map((file) => file.name).join(", ")}.`,
    "You can read extracted text from the attached files in this request.",
    "Use attached file content when it is relevant to the user's request.",
    "Do not say that you cannot access the user's uploaded files when attached file content is provided below.",
    ...attachedFileContexts.flatMap((file) => [
      `Attached file: ${file.name}`,
      file.content,
    ]),
  ].join("\n\n")
}

export function buildRequestContextBlock(
  selectedTool: string,
  attachedNoteContext: AttachedNoteContext | null,
  attachedFileContexts: AttachedFileContext[],
) {
  const sections = [
    "The following chat context is real application data provided with this request.",
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

  if (attachedFileContexts.length) {
    sections.push(
      `Attached files: ${attachedFileContexts.map((file) => file.name).join(", ")}`,
    )

    for (const file of attachedFileContexts) {
      sections.push(`Attached file: ${file.name}`)
      sections.push(file.content)
    }
  }

  if (sections.length <= 2) {
    return ""
  }

  return ["[CHAT_CONTEXT]", ...sections, "[END_CHAT_CONTEXT]"].join("\n\n")
}

export function injectRequestContext(
  messages: NormalizedMessage[],
  selectedTool: string,
  attachedNoteContext: AttachedNoteContext | null,
  attachedFileContexts: AttachedFileContext[],
) {
  const contextBlock = buildRequestContextBlock(
    selectedTool,
    attachedNoteContext,
    attachedFileContexts,
  )

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

export function extractTextContent(value: unknown): string {
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

export function extractProviderError(result: unknown, fallbackMessage: string) {
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

export function extractProviderStatus(result: unknown, fallbackStatus: number) {
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

export function extractStreamDelta(result: unknown) {
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

export async function* iterateSseData(stream: ReadableStream<Uint8Array>) {
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

export function encodeStreamEvent(encoder: TextEncoder, payload: Record<string, unknown>) {
  return encoder.encode(`${JSON.stringify(payload)}\n`)
}

export function createPlaceholderStream(
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

export async function createOpenAICompatibleStream(
  config: ProviderConfig,
  model: string,
  messages: NormalizedMessage[],
  selectedTool: string,
  attachedNoteContext: AttachedNoteContext | null,
  attachedFileContexts: AttachedFileContext[],
  extraSystemPrompts: string[] = [],
) {
  const upstreamConversation = injectRequestContext(
    messages,
    selectedTool,
    attachedNoteContext,
    attachedFileContexts,
  )
  const systemMessages = [
    ...extraSystemPrompts,
    config.systemPrompt,
    getToolInstruction(selectedTool),
    buildAttachedNoteInstruction(attachedNoteContext),
    buildAttachedFileInstruction(attachedFileContexts),
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

    throw new AIServiceError(
      providerStatus,
      extractProviderError(result, "The AI provider request failed."),
    )
  }

  if (!response.body) {
    throw new AIServiceError(502, "The AI provider response did not include a readable stream.")
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
