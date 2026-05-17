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

const allowedFormats = new Set(["multiple_choice", "true_false", "short_answer"])
const minimumQuizContextMessages = 2
const minimumQuizContextCharacters = 120
const minimumLatestAssistantCharacters = 60
const maxNoteCharacters = 14000
const maxFocusCharacters = 600
const maxAttachedFileContextCharacters = 30000
const maxAttachedFileContextPerFile = 12000
const maxPriorQuestionPrompts = 60
const maxRejectedQuizCharacters = 8000
const recentThreadMessageFetchLimit = 18
const recentThreadMessageLimit = 12
const insufficientThreadContextMessage =
  "The active Quiz thread does not have enough chat context yet. Ask at least one question and wait for an assistant explanation before generating a quiz."
const placeholderQuizMessage =
  "The quiz generator returned placeholder questions instead of using the Quiz thread context. Generate again after adding a more specific assistant explanation."

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
    throw new HttpError(401, error?.message ?? "You must be signed in to generate quizzes.")
  }

  return user
}

function requireModel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "model is required.")
  }

  return value.trim()
}

function requireThreadId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "threadId is required.")
  }

  return value.trim().slice(0, 600)
}

function normalizeFocus(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return ""
  }

  return value.trim().slice(0, maxFocusCharacters)
}

function normalizeDifficulty(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "standard"
  }

  return value.trim().slice(0, 40)
}

function normalizeQuestionCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(count) || count < 1 || count > 30) {
    throw new HttpError(400, "questionCount must be an integer from 1 to 30.")
  }

  return count
}

function normalizeFormats(value: unknown) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, "formats must be an array.")
  }

  const formats = [...new Set(value)]
    .filter((format): format is string => typeof format === "string")
    .map((format) => format.trim())
    .filter((format) => allowedFormats.has(format))

  if (!formats.length) {
    throw new HttpError(400, "Choose at least one supported question format.")
  }

  return formats.slice(0, 3)
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

  return decodeHtmlEntities(withoutTags)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, maxNoteCharacters)
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

function isMissingColumnError(
  error: { code?: string; details?: string; hint?: string; message?: string } | null,
  columnName: string,
) {
  const errorText = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ")

  return (
    error?.code === "PGRST204" ||
    new RegExp(
      `column .*${columnName}.* does not exist|could not find .*${columnName}.* in the schema cache`,
      "i",
    ).test(errorText)
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

async function resolveAttachedNote(
  supabase: SupabaseClient,
  userId: string,
  attachedNoteId: unknown,
) {
  if (attachedNoteId == null || attachedNoteId === "") {
    return null
  }

  if (typeof attachedNoteId !== "string") {
    throw new HttpError(400, "attachedNoteId must be a string.")
  }

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content")
    .eq("id", attachedNoteId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle<{ content: string; id: string; title: string }>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  if (!data) {
    throw new HttpError(404, "Attached note was not found.")
  }

  return {
    content: extractPlainTextFromNoteContent(data.content ?? ""),
    id: data.id,
    title: data.title?.trim() || "Untitled note",
  }
}

async function resolveAttachedFileContexts(
  supabase: SupabaseClient,
  {
    parentField,
    parentId,
    tableName,
  }: {
    parentField: "folder_id" | "thread_id"
    parentId: string
    tableName: "chat_folder_files" | "chat_thread_files"
  },
) {
  const { data, error } = await supabase
    .from(tableName)
    .select("original_name, extracted_text")
    .eq(parentField, parentId)
    .eq("status", "ready")
    .order("created_at", { ascending: true })
    .returns<Array<{ extracted_text: string; original_name: string }>>()

  if (error) {
    if (
      error.code === "PGRST204" ||
      error.code === "PGRST205" ||
      /relation .*chat_(thread|folder)_files.* does not exist|could not find the table/i.test(
        error.message ?? "",
      )
    ) {
      return []
    }

    throw new HttpError(500, error.message)
  }

  let remainingCharacters = maxAttachedFileContextCharacters
  const attachedFiles: Array<{ content: string; name: string }> = []

  for (const file of data ?? []) {
    if (remainingCharacters <= 0) {
      break
    }

    const content = (file.extracted_text ?? "").trim()

    if (!content) {
      continue
    }

    const truncatedContent = content.slice(
      0,
      Math.min(maxAttachedFileContextPerFile, remainingCharacters),
    )

    attachedFiles.push({
      content: truncatedContent,
      name: file.original_name?.trim() || "Untitled file",
    })
    remainingCharacters -= truncatedContent.length
  }

  return attachedFiles
}

type QuizContextMessage = {
  content: string
  created_at: string
  role: "assistant" | "user"
}

type GeneratedQuizQuestion = {
  choices: string[]
  expectedAnswer: string
  explanation: string
  prompt: string
  type: string
}

function normalizePromptFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getPromptTokens(value: string) {
  return new Set(
    normalizePromptFingerprint(value)
      .split(" ")
      .filter((token) => token.length > 2),
  )
}

function getPromptSimilarity(left: string, right: string) {
  const leftTokens = getPromptTokens(left)
  const rightTokens = getPromptTokens(right)

  if (!leftTokens.size || !rightTokens.size) {
    return 0
  }

  let intersection = 0

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size

  return union > 0 ? intersection / union : 0
}

function arePromptsTooSimilar(left: string, right: string) {
  const leftFingerprint = normalizePromptFingerprint(left)
  const rightFingerprint = normalizePromptFingerprint(right)

  if (!leftFingerprint || !rightFingerprint) {
    return false
  }

  return leftFingerprint === rightFingerprint || getPromptSimilarity(left, right) >= 0.88
}

function normalizeChoiceText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function dedupeChoices(choices: string[]) {
  const seenChoices = new Set<string>()
  const nextChoices: string[] = []

  for (const choice of choices) {
    const fingerprint = normalizeChoiceText(choice)

    if (!fingerprint || seenChoices.has(fingerprint)) {
      continue
    }

    seenChoices.add(fingerprint)
    nextChoices.push(choice)
  }

  return nextChoices
}

function stripChoiceLabel(value: string) {
  return value.replace(/^\s*(?:[A-F]|\d+)[.)\]:-]\s+/i, "").trim()
}

function resolveMultipleChoiceExpectedAnswer(expectedAnswer: string, choices: string[]) {
  const trimmedExpectedAnswer = expectedAnswer.trim()
  const letterMatch = /^([A-F])(?:[.)\]:-])?$/i.exec(trimmedExpectedAnswer)

  if (letterMatch) {
    const index = letterMatch[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0)
    return choices[index] ?? trimmedExpectedAnswer
  }

  const numberedMatch = /^(\d+)(?:[.)\]:-])?$/.exec(trimmedExpectedAnswer)

  if (numberedMatch) {
    const index = Number(numberedMatch[1]) - 1
    return choices[index] ?? trimmedExpectedAnswer
  }

  const strippedExpectedAnswer = stripChoiceLabel(trimmedExpectedAnswer)
  const matchingChoice = choices.find(
    (choice) =>
      normalizeChoiceText(choice) === normalizeChoiceText(trimmedExpectedAnswer) ||
      normalizeChoiceText(choice) === normalizeChoiceText(strippedExpectedAnswer),
  )

  return matchingChoice ?? strippedExpectedAnswer
}

function resolveTrueFalseExpectedAnswer(expectedAnswer: string) {
  if (/^true\b/i.test(expectedAnswer.trim())) {
    return "True"
  }

  if (/^false\b/i.test(expectedAnswer.trim())) {
    return "False"
  }

  return expectedAnswer.trim()
}

function includesChoice(choices: string[], expectedAnswer: string) {
  const expectedFingerprint = normalizeChoiceText(expectedAnswer)

  return choices.some((choice) => normalizeChoiceText(choice) === expectedFingerprint)
}

function hasPlaceholderQuizText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()

  if (!normalized) {
    return false
  }

  return [
    /^question\s+\d+$/i,
    /^item\s+\d+$/i,
    /which option best matches\b/i,
    /a correct concept related to\b/i,
    /\ban unrelated detail\b/i,
    /a partially correct but incomplete idea\b/i,
    /a contradicted statement\b/i,
    /includes a key idea worth reviewing in item\b/i,
    /\bkey idea worth reviewing\b/i,
  ].some((pattern) => pattern.test(normalized))
}

function assertConcreteQuestion(question: GeneratedQuizQuestion) {
  if (
    hasPlaceholderQuizText(question.prompt) ||
    hasPlaceholderQuizText(question.expectedAnswer) ||
    question.choices.some((choice) => hasPlaceholderQuizText(choice))
  ) {
    throw new HttpError(502, placeholderQuizMessage)
  }
}

function normalizeQuizContextMessages(
  messages: Array<{ content: string | null; created_at: string; role: string }> | null,
) {
  return (messages ?? [])
    .filter(
      (message): message is { content: string; created_at: string; role: "assistant" | "user" } =>
        (message.role === "assistant" || message.role === "user") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      content: message.content.trim(),
      created_at: message.created_at,
      role: message.role,
    }))
    .reverse()
    .slice(-recentThreadMessageLimit)
}

function ensureUsableQuizContext(messages: QuizContextMessage[]) {
  const assistantMessages = messages.filter((message) => message.role === "assistant")
  const userMessages = messages.filter((message) => message.role === "user")
  const latestAssistantMessage =
    [...assistantMessages]
      .reverse()
      .find((message) => message.content.length >= minimumLatestAssistantCharacters) ?? null
  const totalCharacters = messages.reduce((sum, message) => sum + message.content.length, 0)

  if (
    messages.length < minimumQuizContextMessages ||
    !assistantMessages.length ||
    !userMessages.length ||
    totalCharacters < minimumQuizContextCharacters ||
    !latestAssistantMessage ||
    latestAssistantMessage.content.length < minimumLatestAssistantCharacters
  ) {
    throw new HttpError(400, insufficientThreadContextMessage)
  }

  return {
    latestAssistantMessage,
    totalCharacters,
  }
}

async function loadQuizThreadContext(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
) {
  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("id, title, selected_tool, attached_note_id, attached_note_title, archived_at, folder_id")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle<{
      archived_at: string | null
      attached_note_id: string | null
      attached_note_title: string | null
      folder_id: string | null
      id: string
      selected_tool: string | null
      title: string | null
    }>()

  if (threadError) {
    throw new HttpError(500, threadError.message)
  }

  if (!thread || thread.archived_at) {
    throw new HttpError(404, "The active Quiz thread was not found.")
  }

  const { data: rawMessages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(recentThreadMessageFetchLimit)
    .returns<Array<{ content: string | null; created_at: string; role: string }>>()

  if (messagesError) {
    throw new HttpError(500, messagesError.message)
  }

  const messages = normalizeQuizContextMessages(rawMessages)
  const { latestAssistantMessage } = ensureUsableQuizContext(messages)
  let folder:
    | {
        attached_note_id: string | null
        attached_note_title: string | null
        id: string
        system_prompt: string | null
      }
    | null = null

  if (thread.folder_id) {
    const { data: folderData, error: folderError } = await supabase
      .from("chat_folders")
      .select("id, system_prompt, attached_note_id, attached_note_title")
      .eq("id", thread.folder_id)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<{
        attached_note_id: string | null
        attached_note_title: string | null
        id: string
        system_prompt: string | null
      }>()

    if (folderError) {
      if (
        !(
          folderError.code === "PGRST204" ||
          folderError.code === "PGRST205" ||
          /relation .*chat_folders.* does not exist|could not find the table/i.test(
            folderError.message ?? "",
          )
        )
      ) {
        throw new HttpError(500, folderError.message)
      }
    } else {
      folder = folderData ?? null
    }
  }

  const [note, folderFiles, threadFiles] = await Promise.all([
    thread.attached_note_id
      ? resolveAttachedNote(supabase, userId, thread.attached_note_id)
      : folder?.attached_note_id
        ? resolveAttachedNote(supabase, userId, folder.attached_note_id)
        : Promise.resolve(null),
    folder?.id
      ? resolveAttachedFileContexts(supabase, {
          parentField: "folder_id",
          parentId: folder.id,
          tableName: "chat_folder_files",
        })
      : Promise.resolve([]),
    resolveAttachedFileContexts(supabase, {
      parentField: "thread_id",
      parentId: thread.id,
      tableName: "chat_thread_files",
    }),
  ])

  return {
    fileContexts: [...folderFiles, ...threadFiles],
    folderInstructions: folder?.system_prompt?.trim() || "",
    latestAssistantMessage,
    messages,
    note,
    thread: {
      id: thread.id,
      selectedTool: thread.selected_tool?.trim() || "",
      title: thread.title?.trim() || "Untitled Quiz thread",
    },
  }
}

async function loadPriorQuizQuestionPrompts(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
) {
  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(12)
    .returns<Array<{ id: string }>>()

  if (attemptsError) {
    if (isMissingColumnError(attemptsError, "thread_id")) {
      return []
    }

    throw new HttpError(500, attemptsError.message)
  }

  const attemptIds = (attempts ?? []).map((attempt) => attempt.id)

  if (!attemptIds.length) {
    return []
  }

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("prompt")
    .in("attempt_id", attemptIds)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(maxPriorQuestionPrompts)
    .returns<Array<{ prompt: string | null }>>()

  if (questionsError) {
    throw new HttpError(500, questionsError.message)
  }

  return (questions ?? [])
    .map((question) => question.prompt?.trim() ?? "")
    .filter(Boolean)
}

function buildQuizSourceContext({
  focus,
  note,
  fileContexts,
  folderInstructions,
  priorQuestionPrompts,
  thread,
}: {
  fileContexts: Array<{ content: string; name: string }>
  folderInstructions: string
  focus: string
  note: { content: string; title: string } | null
  priorQuestionPrompts: string[]
  thread: {
    latestAssistantMessage: QuizContextMessage
    messages: QuizContextMessage[]
    thread: { selectedTool: string; title: string }
  }
}) {
  const sections = [
    `Active thread title: ${thread.thread.title}`,
    thread.thread.selectedTool ? `Active tool: ${thread.thread.selectedTool}` : "",
    focus ? `Optional focus hint: ${focus}` : "No optional focus hint was provided.",
    folderInstructions
      ? `Folder instructions:\n${folderInstructions}`
      : "No folder instructions are saved for this Quiz thread.",
    "Use the Quiz thread as the primary source of truth.",
    "Weight the most recent assistant explanation most heavily when choosing concepts and wording questions.",
    "Most recent assistant explanation:",
    thread.latestAssistantMessage.content,
    "Recent Quiz thread messages in chronological order:",
    ...thread.messages.map((message) => {
      const label = message.role === "assistant" ? "Assistant" : "User"
      return `[${label}] ${message.content}`
    }),
    priorQuestionPrompts.length
      ? [
          "Previously saved quiz questions for this same thread. Do not repeat or closely paraphrase these:",
          ...priorQuestionPrompts.map((prompt, index) => `${index + 1}. ${prompt}`),
        ].join("\n")
      : "No prior saved quiz questions exist for this Quiz thread.",
    note
      ? `Attached note title: ${note.title}\nAttached note content:\n${note.content}`
      : "No attached note is saved on this Quiz thread.",
    fileContexts.length
      ? [
          `Attached files available to this Quiz thread: ${fileContexts
            .map((file) => file.name)
            .join(", ")}`,
          ...fileContexts.flatMap((file) => [
            `Attached file: ${file.name}`,
            file.content,
          ]),
        ].join("\n")
      : "No attached files are saved on this Quiz thread.",
  ]

  return sections.filter(Boolean).join("\n\n")
}

function extractJsonObject(content: string) {
  const trimmed = content.trim()
  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
  const candidate = fencedMatch?.[1] ?? trimmed
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new HttpError(502, "The quiz generator returned invalid JSON.")
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    throw new HttpError(502, "The quiz generator returned invalid JSON.")
  }
}

function validateQuizPayload(
  value: unknown,
  questionCount: number,
  formats: string[],
  priorQuestionPrompts: string[],
) {
  if (!value || typeof value !== "object") {
    throw new HttpError(502, "The quiz generator returned an invalid quiz.")
  }

  const quiz = value as {
    questions?: Array<Record<string, unknown>>
    title?: unknown
  }
  const title =
    typeof quiz.title === "string" && quiz.title.trim()
      ? quiz.title.trim().slice(0, 160)
      : "Generated quiz"

  if (!Array.isArray(quiz.questions)) {
    throw new HttpError(502, "The quiz generator did not return questions.")
  }

  const questions: GeneratedQuizQuestion[] = quiz.questions.slice(0, questionCount).map((question, index) => {
    const questionType =
      typeof question.type === "string" && allowedFormats.has(question.type)
        ? question.type
        : formats[index % formats.length]
    const prompt =
      typeof question.prompt === "string" && question.prompt.trim()
        ? question.prompt.trim()
        : ""
    const explanation =
      typeof question.explanation === "string" ? question.explanation.trim() : ""
    let choices = Array.isArray(question.choices)
      ? dedupeChoices(
          question.choices
            .filter((choice): choice is string => typeof choice === "string")
            .map((choice) => choice.trim())
            .filter(Boolean)
            .map(stripChoiceLabel),
        ).slice(0, 6)
      : []
    const rawExpectedAnswer =
      typeof question.expectedAnswer === "string"
        ? question.expectedAnswer.trim()
        : typeof question.expected_answer === "string"
          ? question.expected_answer.trim()
          : ""
    const expectedAnswer =
      questionType === "multiple_choice"
        ? resolveMultipleChoiceExpectedAnswer(rawExpectedAnswer, choices)
        : questionType === "true_false"
          ? resolveTrueFalseExpectedAnswer(rawExpectedAnswer)
          : rawExpectedAnswer

    if (!prompt || !expectedAnswer) {
      throw new HttpError(502, "The quiz generator returned incomplete questions.")
    }

    if (questionType === "multiple_choice" && choices.length < 2) {
      throw new HttpError(502, "Multiple choice questions must include choices.")
    }

    if (questionType === "multiple_choice" && !includesChoice(choices, expectedAnswer)) {
      choices = dedupeChoices([expectedAnswer, ...choices]).slice(0, 6)
    }

    if (questionType === "true_false" && expectedAnswer !== "True" && expectedAnswer !== "False") {
      throw new HttpError(502, "True/false questions must have True or False as the expected answer.")
    }

    const nextQuestion = {
      choices: questionType === "short_answer" || questionType === "true_false" ? [] : choices,
      expectedAnswer,
      explanation,
      prompt,
      type: questionType,
    }

    assertConcreteQuestion(nextQuestion)

    return nextQuestion
  })

  if (questions.length !== questionCount) {
    throw new HttpError(502, "The quiz generator returned the wrong number of questions.")
  }

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]

    for (let comparisonIndex = 0; comparisonIndex < index; comparisonIndex += 1) {
      if (arePromptsTooSimilar(question.prompt, questions[comparisonIndex].prompt)) {
        throw new HttpError(
          502,
          "The quiz generator returned repeated questions. Add more thread context or generate again.",
        )
      }
    }

    if (
      priorQuestionPrompts.some((priorPrompt) =>
        arePromptsTooSimilar(question.prompt, priorPrompt),
      )
    ) {
      throw new HttpError(
        502,
        "The quiz generator repeated a previous saved question. Add more thread context or generate again.",
      )
    }
  }

  return { questions, title }
}

function isRetryableQuizQualityError(error: unknown) {
  return (
    error instanceof HttpError &&
    error.status === 502 &&
    /placeholder|incomplete|multiple choice|true\/false|wrong number|invalid quiz|did not return questions/i.test(
      error.message,
    )
  )
}

async function requestQuizFromProvider({
  difficulty,
  formats,
  focus,
  rejectedQuiz,
  retryReason,
  modelConfig,
  note,
  fileContexts,
  folderInstructions,
  priorQuestionPrompts,
  questionCount,
  threadContext,
}: {
  fileContexts: Array<{ content: string; name: string }>
  folderInstructions: string
  difficulty: string
  formats: string[]
  focus: string
  rejectedQuiz?: unknown
  retryReason?: string
  modelConfig: ChatModelConfig
  note: { content: string; title: string } | null
  priorQuestionPrompts: string[]
  questionCount: number
  threadContext: {
    latestAssistantMessage: QuizContextMessage
    messages: QuizContextMessage[]
    thread: { selectedTool: string; title: string }
  }
}) {
  const providerConfig = getProviderConfig(modelConfig.provider)

  if (isPlaceholderMode(providerConfig)) {
    throw new HttpError(
      503,
      `Live quiz generation is unavailable because the selected AI provider is not configured. Add ${providerConfig.missingSecretName} to enable quiz generation.`,
    )
  }

  const messages = [
    {
      role: "system",
      content: [
        "You generate reliable study quizzes from real tutoring context as strict JSON.",
        "Return only one JSON object with this shape: {\"title\":\"...\",\"questions\":[{\"type\":\"multiple_choice|true_false|short_answer\",\"prompt\":\"...\",\"choices\":[\"...\"],\"expectedAnswer\":\"...\",\"explanation\":\"...\"}]}",
        "Do not include markdown, comments, or extra keys.",
        "Use the supplied Quiz thread content as the primary source of truth for every question.",
        "If the thread already contains an assistant-generated quiz, extract those questions and choices into the JSON schema instead of writing meta-questions about the topic.",
        "Use the optional focus hint only to steer emphasis. Do not invent facts that are not supported by the thread or the attached note.",
        "Questions should test specific ideas, reasoning steps, definitions, examples, and corrections that appeared in the thread.",
        "Every question in the new quiz must test a distinct concept or reasoning step.",
        "Never use placeholders such as Question 1, item 2, correct concept related to the topic, unrelated detail, partially correct idea, or contradicted statement.",
        "Every prompt and every multiple-choice option must contain concrete subject matter from the thread.",
        "For multiple_choice, expectedAnswer must exactly equal the full text of one choices item. Do not use A, B, C, D, or numeric answer labels.",
        "For true_false, expectedAnswer must be exactly True or False and choices must be empty.",
        "For short_answer, choices must be empty.",
        "Do not repeat or closely paraphrase any previously saved quiz question supplied in the request.",
        "When the recent assistant explanation is detailed, prioritize it heavily.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Difficulty: ${difficulty}`,
        `Question count: ${questionCount}`,
        `Allowed formats: ${formats.join(", ")}`,
        retryReason ? `Previous response was rejected: ${retryReason}` : "",
        rejectedQuiz
          ? `Rejected response to repair:\n${JSON.stringify(rejectedQuiz).slice(
              0,
              maxRejectedQuizCharacters,
            )}`
          : "",
        buildQuizSourceContext({
          fileContexts,
          focus,
          folderInstructions,
          note,
          priorQuestionPrompts,
          thread: threadContext,
        }),
      ].join("\n\n"),
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
      temperature: 0.75,
    }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new HttpError(response.status, "The AI provider could not generate the quiz.")
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

    const user = await requireAuthenticatedUser(authHeader)
    const supabase = createAuthedSupabaseClient(authHeader)
    const payload = await request.json()
    const model = requireModel(payload.model)
    const threadId = requireThreadId(payload.threadId)
    const focus = normalizeFocus(payload.focus ?? payload.topic)
    const difficulty = normalizeDifficulty(payload.difficulty)
    const questionCount = normalizeQuestionCount(payload.questionCount)
    const formats = normalizeFormats(payload.formats)
    const threadContext = await loadQuizThreadContext(supabase, user.id, threadId)
    const priorQuestionPrompts = await loadPriorQuizQuestionPrompts(
      supabase,
      user.id,
      threadId,
    )
    const modelConfig = await resolveModelConfig(supabase, model)
    const generatedQuiz = await requestQuizFromProvider({
      difficulty,
      formats,
      focus,
      modelConfig,
      fileContexts: threadContext.fileContexts,
      folderInstructions: threadContext.folderInstructions,
      note: threadContext.note,
      priorQuestionPrompts,
      questionCount,
      threadContext,
    })
    let quiz

    try {
      quiz = validateQuizPayload(
        generatedQuiz,
        questionCount,
        formats,
        priorQuestionPrompts,
      )
    } catch (error) {
      if (!isRetryableQuizQualityError(error)) {
        throw error
      }

      const repairedQuiz = await requestQuizFromProvider({
        difficulty,
        formats,
        focus,
        fileContexts: threadContext.fileContexts,
        folderInstructions: threadContext.folderInstructions,
        modelConfig,
        note: threadContext.note,
        priorQuestionPrompts,
        questionCount,
        rejectedQuiz: generatedQuiz,
        retryReason: error instanceof Error ? error.message : "Invalid quiz response.",
        threadContext,
      })

      quiz = validateQuizPayload(
        repairedQuiz,
        questionCount,
        formats,
        priorQuestionPrompts,
      )
    }

    return jsonResponse(200, {
      quiz,
      attachedNote: threadContext.note
        ? { id: threadContext.note.id, title: threadContext.note.title }
        : null,
    })
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500
    const message = error instanceof Error ? error.message : "Unexpected server error."
    return jsonResponse(status, { error: message })
  }
})
