import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

import { corsHeaders } from "../_shared/cors.ts"
import {
  type ChatModelConfig,
  extractTextContent,
  getLegacyProvider,
  getProviderConfig,
  isPlaceholderMode,
  normalizeProvider,
} from "../_shared/ai.service.ts"

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

function requireSupabaseConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(500, "Supabase function auth configuration is missing.")
  }

  return { supabaseAnonKey, supabaseUrl }
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
    throw new HttpError(401, error?.message ?? "You must be signed in to grade quizzes.")
  }

  return user
}

function requireModel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "model is required.")
  }

  return value.trim()
}

function requireAttemptId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "attemptId is required.")
  }

  return value.trim()
}

function normalizeSubmittedAnswers(value: unknown) {
  if (!Array.isArray(value) || !value.length) {
    throw new HttpError(400, "answers must include at least one answer.")
  }

  return value.map((answer) => {
    if (!answer || typeof answer !== "object") {
      throw new HttpError(400, "answers must contain objects.")
    }

    const answerRecord = answer as { answer?: unknown; questionId?: unknown }

    if (typeof answerRecord.questionId !== "string" || !answerRecord.questionId.trim()) {
      throw new HttpError(400, "Each answer must include questionId.")
    }

    return {
      answer:
        typeof answerRecord.answer === "string"
          ? answerRecord.answer.trim().slice(0, 5000)
          : "",
      questionId: answerRecord.questionId.trim(),
    }
  })
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

async function loadAttemptQuestions(supabase: SupabaseClient, attemptId: string) {
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, title, topic, difficulty, question_count")
    .eq("id", attemptId)
    .maybeSingle<{
      difficulty: string
      id: string
      question_count: number
      title: string
      topic: string
    }>()

  if (attemptError) {
    throw new HttpError(500, attemptError.message)
  }

  if (!attempt) {
    throw new HttpError(404, "Quiz attempt was not found.")
  }

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("id, question_type, prompt, choices, expected_answer, explanation, sort_order")
    .eq("attempt_id", attemptId)
    .order("sort_order", { ascending: true })
    .returns<
      Array<{
        choices: string[]
        expected_answer: string
        explanation: string
        id: string
        prompt: string
        question_type: string
        sort_order: number
      }>
    >()

  if (questionsError) {
    throw new HttpError(500, questionsError.message)
  }

  if (!questions?.length) {
    throw new HttpError(400, "Quiz attempt has no questions to grade.")
  }

  return { attempt, questions }
}

function normalizeChoice(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().toLowerCase()
}

function makeFallbackGrades(
  questions: Array<{
    expected_answer: string
    id: string
    question_type: string
  }>,
  submittedAnswers: Array<{ answer: string; questionId: string }>,
) {
  const answerByQuestionId = new Map(
    submittedAnswers.map((answer) => [answer.questionId, answer.answer]),
  )

  const grades = questions.map((question) => {
    const userAnswer = answerByQuestionId.get(question.id) ?? ""
    const isCorrect =
      question.question_type === "short_answer"
        ? normalizeChoice(userAnswer).length > 0 &&
          normalizeChoice(question.expected_answer).length > 0
        : normalizeChoice(userAnswer) === normalizeChoice(question.expected_answer)

    return {
      feedback: isCorrect
        ? "This answer matches the expected answer closely enough for the fallback grader."
        : `Expected answer: ${question.expected_answer}`,
      isCorrect,
      maxScore: 1,
      questionId: question.id,
      score: isCorrect ? 1 : 0,
    }
  })

  const scorePoints = grades.reduce((total, grade) => total + grade.score, 0)
  const maxScorePoints = grades.reduce((total, grade) => total + grade.maxScore, 0)

  return {
    answers: grades,
    maxScorePoints,
    scorePercent: maxScorePoints > 0 ? Math.round((scorePoints / maxScorePoints) * 10000) / 100 : 0,
    scorePoints,
    summaryFeedback: "Fallback grading completed. Enable an AI provider for richer feedback.",
  }
}

function extractJsonObject(content: string) {
  const trimmed = content.trim()
  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
  const candidate = fencedMatch?.[1] ?? trimmed
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new HttpError(502, "The quiz grader returned invalid JSON.")
  }

  return JSON.parse(candidate.slice(start, end + 1))
}

function validateGrades(
  value: unknown,
  questions: Array<{ id: string }>,
) {
  if (!value || typeof value !== "object") {
    throw new HttpError(502, "The quiz grader returned invalid results.")
  }

  const payload = value as {
    answers?: Array<Record<string, unknown>>
    summaryFeedback?: unknown
  }
  const questionIds = new Set(questions.map((question) => question.id))

  if (!Array.isArray(payload.answers)) {
    throw new HttpError(502, "The quiz grader did not return per-question results.")
  }

  const answers = payload.answers.map((answer) => {
    const questionId = typeof answer.questionId === "string" ? answer.questionId : ""

    if (!questionIds.has(questionId)) {
      throw new HttpError(502, "The quiz grader returned an unknown question id.")
    }

    const maxScore =
      typeof answer.maxScore === "number" && answer.maxScore > 0 ? answer.maxScore : 1
    const score =
      typeof answer.score === "number"
        ? Math.max(0, Math.min(answer.score, maxScore))
        : 0

    return {
      feedback: typeof answer.feedback === "string" ? answer.feedback.trim() : "",
      isCorrect: Boolean(answer.isCorrect ?? score >= maxScore),
      maxScore,
      questionId,
      score,
    }
  })

  const answerIds = new Set(answers.map((answer) => answer.questionId))

  if (answerIds.size !== questions.length) {
    throw new HttpError(502, "The quiz grader did not grade every question.")
  }

  const scorePoints = answers.reduce((total, answer) => total + answer.score, 0)
  const maxScorePoints = answers.reduce((total, answer) => total + answer.maxScore, 0)

  return {
    answers,
    maxScorePoints,
    scorePercent:
      maxScorePoints > 0 ? Math.round((scorePoints / maxScorePoints) * 10000) / 100 : 0,
    scorePoints,
    summaryFeedback:
      typeof payload.summaryFeedback === "string"
        ? payload.summaryFeedback.trim()
        : "Quiz graded.",
  }
}

async function requestGradesFromProvider({
  attempt,
  modelConfig,
  questions,
  submittedAnswers,
}: {
  attempt: { difficulty: string; title: string; topic: string }
  modelConfig: ChatModelConfig
  questions: Array<Record<string, unknown>>
  submittedAnswers: Array<{ answer: string; questionId: string }>
}) {
  const providerConfig = getProviderConfig(modelConfig.provider)

  if (isPlaceholderMode(providerConfig)) {
    return makeFallbackGrades(
      questions as Array<{
        expected_answer: string
        id: string
        question_type: string
      }>,
      submittedAnswers,
    )
  }

  const messages = [
    {
      role: "system",
      content: [
        "You grade study quiz answers as strict JSON.",
        "Return only: {\"summaryFeedback\":\"...\",\"answers\":[{\"questionId\":\"...\",\"isCorrect\":true,\"score\":0,\"maxScore\":1,\"feedback\":\"...\"}]}",
        "Grade multiple choice, true/false, and short answers against the expected answer and explanation. Award partial credit for short answers when appropriate.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        attempt,
        questions,
        submittedAnswers,
      }),
    },
  ]

  const response = await fetch(`${providerConfig.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      model: modelConfig.key,
      response_format: { type: "json_object" },
      stream: false,
    }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new HttpError(response.status, "The AI provider could not grade the quiz.")
  }

  const content = extractTextContent(
    (result as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]
      ?.message?.content,
  )

  return extractJsonObject(content)
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
    const payload = await request.json()
    const model = requireModel(payload.model)
    const attemptId = requireAttemptId(payload.attemptId)
    const submittedAnswers = normalizeSubmittedAnswers(payload.answers)
    const modelConfig = await resolveModelConfig(supabase, model)
    const { attempt, questions } = await loadAttemptQuestions(supabase, attemptId)
    const submittedQuestionIds = new Set(
      submittedAnswers.map((answer) => answer.questionId),
    )

    if (!questions.every((question) => submittedQuestionIds.has(question.id))) {
      throw new HttpError(400, "Every quiz question must have an answer before grading.")
    }

    const rawGrades = await requestGradesFromProvider({
      attempt,
      modelConfig,
      questions,
      submittedAnswers,
    })
    const grades = validateGrades(rawGrades, questions)

    return jsonResponse(200, { grades })
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500
    const message = error instanceof Error ? error.message : "Unexpected server error."
    return jsonResponse(status, { error: message })
  }
})
