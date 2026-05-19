import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

import { corsHeaders } from "../_shared/cors.ts"
import {
  type ChatModelConfig,
  getLegacyProvider,
  getProviderConfig,
  isPlaceholderMode,
} from "../_shared/ai.service.ts"

const ALLOWED_FORMATS = new Set(["multiple_choice", "short_answer", "true_false"])
const ALLOWED_DIFFICULTIES = new Set(["foundation", "standard", "challenge"])

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

function createAuthedSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(500, "Supabase function auth configuration is missing.")
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authHeader },
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
    throw new HttpError(401, error?.message ?? "You must be signed in to use quizzes.")
  }

  return user
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback
}

function normalizeQuestionCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(count)) {
    return 6
  }

  return Math.min(30, Math.max(1, Math.round(count)))
}

function normalizeFormats(value: unknown) {
  if (!Array.isArray(value)) {
    return ["multiple_choice", "true_false", "short_answer"]
  }

  const formats = value
    .filter((format): format is string => typeof format === "string")
    .map((format) => format.trim())
    .filter((format) => ALLOWED_FORMATS.has(format))

  return formats.length ? [...new Set(formats)] : ["multiple_choice"]
}

function normalizeDifficulty(value: unknown) {
  const difficulty = normalizeString(value, "standard")
  return ALLOWED_DIFFICULTIES.has(difficulty) ? difficulty : "standard"
}

function extractJsonObject(content: string) {
  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(content)
  const candidate = fencedMatch?.[1] ?? content
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new HttpError(502, "The quiz generator returned invalid JSON.")
  }

  return JSON.parse(candidate.slice(start, end + 1))
}

function normalizeChoices(value: unknown, fallbackType: string) {
  if (fallbackType === "true_false") {
    return ["True", "False"]
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((choice): choice is string => typeof choice === "string")
    .map((choice) => choice.trim())
    .filter(Boolean)
    .slice(0, 6)
}

function normalizeGeneratedQuiz(value: unknown, questionCount: number, formats: string[]) {
  const payload = value as {
    questions?: Array<Record<string, unknown>>
    title?: unknown
  }
  const questions = Array.isArray(payload.questions) ? payload.questions : []
  const normalizedQuestions = questions
    .map((question, index) => {
      const requestedType = normalizeString(question.type ?? question.question_type)
      const type = formats.includes(requestedType) ? requestedType : formats[index % formats.length]
      const prompt = normalizeString(question.prompt)
      const expectedAnswer = normalizeString(
        question.expectedAnswer ?? question.expected_answer,
      )

      if (!prompt || !expectedAnswer) {
        return null
      }

      return {
        choices: normalizeChoices(question.choices, type),
        expectedAnswer,
        explanation: normalizeString(question.explanation),
        prompt,
        type,
      }
    })
    .filter((question): question is {
      choices: string[]
      expectedAnswer: string
      explanation: string
      prompt: string
      type: string
    } => Boolean(question))
    .slice(0, questionCount)

  if (!normalizedQuestions.length) {
    throw new HttpError(502, "The quiz generator did not return usable questions.")
  }

  return {
    questions: normalizedQuestions,
    title: normalizeString(payload.title, "Generated quiz").slice(0, 120),
  }
}

function buildPlaceholderQuiz(sourcePrompt: string, questionCount: number, formats: string[]) {
  const topic = sourcePrompt.replace(/\s+/g, " ").slice(0, 80) || "the topic"

  return {
    title: `Quiz: ${topic}`,
    questions: Array.from({ length: questionCount }).map((_, index) => {
      const type = formats[index % formats.length]

      if (type === "true_false") {
        return {
          choices: ["True", "False"],
          expectedAnswer: "True",
          explanation: "Review the source prompt and choose the statement that best matches it.",
          prompt: `True or false: this quiz item is based on ${topic}.`,
          type,
        }
      }

      if (type === "short_answer") {
        return {
          choices: [],
          expectedAnswer: topic,
          explanation: "A strong answer should reference the main idea from the prompt.",
          prompt: `In one or two sentences, explain the main idea of ${topic}.`,
          type,
        }
      }

      return {
        choices: [topic, "An unrelated topic", "A formatting rule", "A calendar event"],
        expectedAnswer: topic,
        explanation: "The correct option is the topic from the student's prompt.",
        prompt: `Which option best matches the quiz topic?`,
        type,
      }
    }),
  }
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

async function resolveModelConfig(supabase: SupabaseClient, modelKey: string) {
  const { data, error } = await supabase
    .from("chat_models")
    .select("key, provider")
    .eq("key", modelKey)
    .eq("enabled", true)
    .maybeSingle<ChatModelConfig>()

  if (error) {
    if (isMissingModelRegistryError(error)) {
      return { key: modelKey, provider: getLegacyProvider() }
    }

    throw new HttpError(500, error.message)
  }

  if (!data) {
    throw new HttpError(400, "Selected model is unavailable.")
  }

  return data
}

async function loadThreadContext(supabase: SupabaseClient, threadId: string, userId: string) {
  if (!threadId) {
    return ""
  }

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("id, title, attached_note_id")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle()

  if (threadError) {
    throw new HttpError(500, threadError.message)
  }

  if (!thread) {
    throw new HttpError(404, "Quiz thread was not found.")
  }

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (messagesError) {
    throw new HttpError(500, messagesError.message)
  }

  let noteContext = ""
  let fileContext = ""

  if (thread.attached_note_id) {
    const { data: note } = await supabase
      .from("notes")
      .select("title, content")
      .eq("id", thread.attached_note_id)
      .eq("user_id", userId)
      .maybeSingle()

    if (note?.content) {
      noteContext = `\n\nAttached note: ${note.title || "Untitled note"}\n${note.content.slice(0, 8000)}`
    }
  }

  const { data: files } = await supabase
    .from("chat_thread_files")
    .select("original_name, extracted_text")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: true })

  if (files?.length) {
    fileContext = files
      .map((file) =>
        [
          `Attached file: ${file.original_name}`,
          String(file.extracted_text ?? "").slice(0, 6000),
        ].join("\n"),
      )
      .join("\n\n")
      .slice(0, 18000)
  }

  const messageContext = (messages ?? [])
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n")

  return `${messageContext}${noteContext}${fileContext ? `\n\n${fileContext}` : ""}`.trim()
}

async function createQuizWithProvider(
  modelConfig: ChatModelConfig,
  sourcePrompt: string,
  context: string,
  questionCount: number,
  formats: string[],
  difficulty: string,
) {
  const config = getProviderConfig(modelConfig.provider)

  if (isPlaceholderMode(config)) {
    return buildPlaceholderQuiz(sourcePrompt, questionCount, formats)
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "Generate only valid JSON for a student quiz. Do not include markdown. The JSON shape must be {\"title\":\"...\",\"questions\":[{\"type\":\"multiple_choice|true_false|short_answer\",\"prompt\":\"...\",\"choices\":[\"...\"],\"expectedAnswer\":\"...\",\"explanation\":\"...\"}]}. Do not reveal answers in prompts.",
        },
        {
          role: "user",
          content: [
            `Difficulty: ${difficulty}`,
            `Question count: ${questionCount}`,
            `Allowed formats: ${formats.join(", ")}`,
            `Student prompt: ${sourcePrompt}`,
            context ? `Context:\n${context}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      model: modelConfig.key,
      stream: false,
    }),
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    const message =
      typeof result?.error === "string"
        ? result.error
        : result?.error?.message || "The quiz generator provider request failed."
    throw new HttpError(response.status >= 400 && response.status <= 599 ? response.status : 502, message)
  }

  const result = await response.json()
  const content = result?.choices?.[0]?.message?.content

  if (typeof content !== "string") {
    throw new HttpError(502, "The quiz generator provider returned an invalid response.")
  }

  return normalizeGeneratedQuiz(extractJsonObject(content), questionCount, formats)
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed.")
    }

    const authHeader = request.headers.get("Authorization") ?? ""
    const user = await requireAuthenticatedUser(authHeader)
    const supabase = createAuthedSupabaseClient(authHeader)
    const payload = await request.json().catch(() => ({}))
    const model = normalizeString(payload.model)
    const sourcePrompt = normalizeString(payload.sourcePrompt ?? payload.topic)

    if (!model) {
      throw new HttpError(400, "model is required.")
    }

    if (!sourcePrompt) {
      throw new HttpError(400, "A quiz prompt is required.")
    }

    const questionCount = normalizeQuestionCount(payload.questionCount)
    const formats = normalizeFormats(payload.formats)
    const difficulty = normalizeDifficulty(payload.difficulty)
    const threadId = normalizeString(payload.threadId)
    const modelConfig = await resolveModelConfig(supabase, model)
    const context = await loadThreadContext(supabase, threadId, user.id)
    const quiz = await createQuizWithProvider(
      modelConfig,
      sourcePrompt,
      context,
      questionCount,
      formats,
      difficulty,
    )

    return jsonResponse(200, { quiz })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to generate quiz."

    return jsonResponse(status, { error: message })
  }
})
