import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"

import { corsHeaders } from "../_shared/cors.ts"
import {
  type ChatModelConfig,
  getLegacyProvider,
  getProviderConfig,
  isPlaceholderMode,
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

function extractJsonObject(content: string) {
  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(content)
  const candidate = fencedMatch?.[1] ?? content
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new HttpError(502, "The quiz grader returned invalid JSON.")
  }

  return JSON.parse(candidate.slice(start, end + 1))
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

function normalizeAnswers(value: unknown) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, "answers must be an array.")
  }

  return value.map((answer) => ({
    answer: normalizeString(answer?.answer),
    questionId: normalizeString(answer?.questionId),
  }))
}

async function loadQuestions(supabase: SupabaseClient, attemptId: string, userId: string) {
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, title")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle()

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
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })

  if (questionsError) {
    throw new HttpError(500, questionsError.message)
  }

  return questions ?? []
}

function buildPlaceholderGrades(questions: Array<Record<string, unknown>>, answers: Array<{ answer: string; questionId: string }>) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]))
  const gradedAnswers = questions.map((question) => {
    const questionId = String(question.id)
    const answer = answerMap.get(questionId) ?? ""
    const expectedAnswer = String(question.expected_answer ?? "")
    const isCorrect = answer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()

    return {
      feedback: isCorrect
        ? "Correct."
        : `Review the expected answer: ${expectedAnswer || "check the source material"}.`,
      isCorrect,
      maxScore: 1,
      questionId,
      score: isCorrect ? 1 : 0,
    }
  })
  const scorePoints = gradedAnswers.reduce((sum, answer) => sum + answer.score, 0)
  const maxScorePoints = gradedAnswers.reduce((sum, answer) => sum + answer.maxScore, 0)

  return {
    answers: gradedAnswers,
    maxScorePoints,
    scorePercent: maxScorePoints ? (scorePoints / maxScorePoints) * 100 : 0,
    scorePoints,
    summaryFeedback:
      scorePoints === maxScorePoints
        ? "Strong work. All answers matched the expected responses."
        : "Review the feedback for missed or incomplete answers.",
  }
}

function normalizeGrades(value: unknown, questions: Array<Record<string, unknown>>) {
  const payload = value as {
    answers?: Array<Record<string, unknown>>
    summaryFeedback?: unknown
    summary_feedback?: unknown
  }
  const questionIds = new Set(questions.map((question) => String(question.id)))
  const answers = Array.isArray(payload.answers) ? payload.answers : []
  const normalizedAnswers = answers
    .map((answer) => {
      const questionId = normalizeString(answer.questionId ?? answer.question_id)

      if (!questionIds.has(questionId)) {
        return null
      }

      const maxScore = Number(answer.maxScore ?? answer.max_score ?? 1)
      const score = Number(answer.score ?? 0)

      return {
        feedback: normalizeString(answer.feedback),
        isCorrect: Boolean(answer.isCorrect ?? answer.is_correct ?? score >= maxScore),
        maxScore: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 1,
        questionId,
        score: Number.isFinite(score) ? Math.max(0, score) : 0,
      }
    })
    .filter((answer): answer is {
      feedback: string
      isCorrect: boolean
      maxScore: number
      questionId: string
      score: number
    } => Boolean(answer))

  if (normalizedAnswers.length !== questions.length) {
    throw new HttpError(502, "The quiz grader did not return grades for every question.")
  }

  const scorePoints = normalizedAnswers.reduce((sum, answer) => sum + answer.score, 0)
  const maxScorePoints = normalizedAnswers.reduce((sum, answer) => sum + answer.maxScore, 0)

  return {
    answers: normalizedAnswers,
    maxScorePoints,
    scorePercent: maxScorePoints ? (scorePoints / maxScorePoints) * 100 : 0,
    scorePoints,
    summaryFeedback: normalizeString(payload.summaryFeedback ?? payload.summary_feedback),
  }
}

async function gradeWithProvider(
  modelConfig: ChatModelConfig,
  questions: Array<Record<string, unknown>>,
  answers: Array<{ answer: string; questionId: string }>,
) {
  const config = getProviderConfig(modelConfig.provider)

  if (isPlaceholderMode(config)) {
    return buildPlaceholderGrades(questions, answers)
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
            "Grade a student quiz and return only valid JSON. Shape: {\"answers\":[{\"questionId\":\"...\",\"isCorrect\":true,\"score\":1,\"maxScore\":1,\"feedback\":\"...\"}],\"summaryFeedback\":\"...\"}. Be fair with short answers and do not add markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({
            answers,
            questions: questions.map((question) => ({
              choices: question.choices,
              expectedAnswer: question.expected_answer,
              explanation: question.explanation,
              prompt: question.prompt,
              questionId: question.id,
              type: question.question_type,
            })),
          }),
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
        : result?.error?.message || "The quiz grader provider request failed."
    throw new HttpError(response.status >= 400 && response.status <= 599 ? response.status : 502, message)
  }

  const result = await response.json()
  const content = result?.choices?.[0]?.message?.content

  if (typeof content !== "string") {
    throw new HttpError(502, "The quiz grader provider returned an invalid response.")
  }

  return normalizeGrades(extractJsonObject(content), questions)
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
    const attemptId = normalizeString(payload.attemptId)

    if (!model) {
      throw new HttpError(400, "model is required.")
    }

    if (!attemptId) {
      throw new HttpError(400, "attemptId is required.")
    }

    const answers = normalizeAnswers(payload.answers)
    const questions = await loadQuestions(supabase, attemptId, user.id)

    if (!questions.length) {
      throw new HttpError(400, "This quiz attempt has no questions.")
    }

    const modelConfig = await resolveModelConfig(supabase, model)
    const grades = await gradeWithProvider(modelConfig, questions, answers)

    return jsonResponse(200, { grades })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to grade quiz."

    return jsonResponse(status, { error: message })
  }
})
