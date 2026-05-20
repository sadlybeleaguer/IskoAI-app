import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Archive,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { ChatComposer, ChatModelMenu } from "@/components/chat/chat-composer"
import { ChatNotePicker } from "@/components/chat/chat-note-picker"
import { ChatEmptyState, ChatThreadView } from "@/components/chat/chat-content"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { QuizAttemptDialog } from "@/components/quiz/quiz-attempt-dialog"
import { ActionConfirmDialog } from "@/components/ui/action-confirm-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useAuth } from "@/context/auth-context"
import { useChatWorkspace } from "@/hooks/use-chat-workspace"
import {
  applyQuizGrades,
  archiveQuizAttempt,
  createQuizAttemptWithQuestions,
  generateQuiz,
  gradeQuiz,
  listQuizAttempts,
  saveQuizAnswers,
} from "@/services/db.service"
import { formatRelativeTime } from "@/utils/chat"
import { cn } from "@/utils/cn"
import { getErrorMessage } from "@/utils/errors"

const defaultFormats = ["multiple_choice", "true_false", "short_answer"]
const formatLabels = {
  multiple_choice: "Multiple choice",
  short_answer: "Short answer",
  true_false: "True / false",
}
const recentQuizContextMessageLimit = 12

const difficultyOptions = [
  { label: "Foundation", value: "foundation" },
  { label: "Standard", value: "standard" },
  { label: "Challenge", value: "challenge" },
]

function getUsableQuizContextMessages(messages) {
  return (messages ?? [])
    .filter(
      (message) =>
        (message.role === "assistant" || message.role === "user") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-recentQuizContextMessageLimit)
}

function getQuizContextState(activeThread, messages) {
  if (!activeThread?.id) {
    return {
      canGenerate: false,
      description:
        "Ask a question in the Quiz chat to generate a saved quiz attempt.",
      errorMessage: "Ask a question in the Quiz chat before generating a quiz.",
      title: "No active Quiz thread",
    }
  }

  const usableMessages = getUsableQuizContextMessages(messages)
  const userMessages = usableMessages.filter((message) => message.role === "user")
  const assistantMessages = usableMessages.filter(
    (message) => message.role === "assistant",
  )
  const totalCharacters = usableMessages.reduce(
    (sum, message) => sum + message.content.trim().length,
    0,
  )

  if (!usableMessages.length) {
    return {
      canGenerate: false,
      description:
        "Ask a question in this Quiz thread first. The quiz generator will use the student prompt and any attached note.",
      errorMessage:
        "This Quiz thread does not have any saved prompt yet.",
      title: "No chat context yet",
    }
  }

  if (!userMessages.length || totalCharacters < 12) {
    return {
      canGenerate: false,
      description:
        "Add a clearer student prompt before generating a quiz.",
      errorMessage: "This Quiz thread needs a clearer student prompt before a quiz can be generated.",
      title: "More thread context needed",
    }
  }

  if (!assistantMessages.length) {
    return {
      canGenerate: false,
      description:
        "Wait for the assistant explanation to finish before generating a quiz.",
      errorMessage:
        "The active Quiz thread does not have enough chat context yet. Ask at least one question and wait for an assistant explanation before generating a quiz.",
      title: "Assistant explanation needed",
    }
  }

  return {
    canGenerate: true,
    description:
      "Questions will be generated from this Quiz thread's latest student prompt and any attached note.",
    errorMessage: "",
    title: "Quiz context ready",
  }
}

function getAttemptStatusLabel(attempt) {
  if (!attempt) return "Draft"
  if (attempt.status === "draft") return "Draft"
  if (attempt.status === "graded") return `${Math.round(attempt.score_percent ?? 0)}%`
  if (attempt.status === "submitted") return "Submitted"
  return "Generated"
}

function createDraftQuizAttempt({ difficulty, questionCount }) {
  const now = new Date().toISOString()

  return {
    created_at: now,
    difficulty,
    id: `draft-${crypto.randomUUID()}`,
    question_count: questionCount,
    questions: [],
    status: "draft",
    title: "New quiz",
    updated_at: now,
  }
}

function normalizeAnswerMap(attempt) {
  const nextAnswers = {}

  for (const question of attempt?.questions ?? []) {
    nextAnswers[question.id] = question.answer?.answer ?? ""
  }

  return nextAnswers
}

function QuizAttemptsList({
  activeAttemptId,
  attempts,
  isLoading,
  onArchiveAttempt,
  onSelectAttempt,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-2 py-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 rounded-lg border bg-muted/40" />
        ))}
      </div>
    )
  }

  if (!attempts.length) {
    return (
      <div className="px-3 py-6 text-sm text-muted-foreground">
        No saved quizzes yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 py-2">
      {attempts.map((attempt) => {
        const isActive = attempt.id === activeAttemptId

        return (
          <div
            key={attempt.id}
            className={cn(
              "group flex items-start gap-2 rounded-lg border px-2 py-2 transition-colors",
              isActive ? "border-primary/30 bg-primary/10" : "hover:bg-muted/60",
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onSelectAttempt(attempt.id)}
            >
              <div className="truncate text-sm font-medium">{attempt.title}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{getAttemptStatusLabel(attempt)}</span>
                <span>{formatRelativeTime(attempt.updated_at)}</span>
              </div>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onArchiveAttempt(attempt.id)}
              aria-label="Archive quiz"
            >
              <Trash2 data-icon="inline-start" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function QuizPanel({
  activeAttempt,
  canGenerateQuiz,
  chat,
  difficulty,
  formats,
  hasAvailableModels,
  handleGenerateQuiz,
  isGenerating,
  onOpenAttempt,
  questionCount,
  quizContextState,
  setDifficulty,
  setFormats,
  setQuestionCount,
  setTopic,
  topic,
}) {
  return (
    <aside className="flex min-h-0 border-t bg-background lg:w-[28rem] lg:border-l lg:border-t-0 xl:w-[32rem]">
      <ScrollArea className="h-full w-full">
        <div className="flex min-h-full flex-col gap-4 p-4">
          <Card className="rounded-lg border-primary/15 bg-gradient-to-br from-card via-card to-muted/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>Quiz setup</CardTitle>
                  <CardDescription>
                    Generate from the active Quiz thread. Open settings to adjust
                    focus, difficulty, question count, and formats.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleGenerateQuiz}>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Focus or refinement
                  <Input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Optional: emphasize formulas, compare causes and effects, focus on likely weak spots"
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    Optional. The quiz source is the active Quiz thread, not this field.
                  </span>
                </label>

                <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">Difficulty</div>
                    <ToggleGroup
                      type="single"
                      value={difficulty}
                      onValueChange={(value) => value && setDifficulty(value)}
                      className="w-full flex-wrap"
                    >
                      {difficultyOptions.map((option) => (
                        <ToggleGroupItem key={option.value} value={option.value}>
                          {option.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Questions
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={questionCount}
                      onChange={(event) => setQuestionCount(Number(event.target.value))}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">Formats</div>
                  <ToggleGroup
                    type="multiple"
                    value={formats}
                    onValueChange={(value) => setFormats(value.length ? value : formats)}
                    className="w-full flex-wrap justify-start"
                  >
                    {defaultFormats.map((format) => (
                      <ToggleGroupItem key={format} value={format}>
                        {formatLabels[format]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <Alert>
                  <AlertTitle>{quizContextState.title}</AlertTitle>
                  <AlertDescription>{quizContextState.description}</AlertDescription>
                </Alert>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Uses the latest Quiz chat prompt.
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      !canGenerateQuiz ||
                      isGenerating ||
                      !hasAvailableModels ||
                      chat.isLoadingModels ||
                      chat.isStreamingActiveThread ||
                      chat.isUpdatingAttachedNote
                    }
                  >
                    {isGenerating ? (
                      <Loader2 className="animate-spin" data-icon="inline-start" />
                    ) : (
                      <Sparkles data-icon="inline-start" />
                    )}
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {activeAttempt ? (
            <div className="flex flex-col gap-4">
              <Card className="rounded-lg">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{activeAttempt.title}</CardTitle>
                      <CardDescription>
                        {activeAttempt.question_count} questions /{" "}
                        {activeAttempt.difficulty}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{getAttemptStatusLabel(activeAttempt)}</Badge>
                  </div>
                </CardHeader>
                {activeAttempt.status === "graded" ? (
                  <CardContent>
                    <div className="rounded-lg border bg-muted/35 px-4 py-3">
                      <div className="text-2xl font-semibold">
                        {Math.round(activeAttempt.score_percent ?? 0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activeAttempt.score_points ?? 0}/
                        {activeAttempt.max_score_points ?? activeAttempt.questions.length} points
                      </div>
                      {activeAttempt.summary_feedback ? (
                        <p className="mt-2 text-sm">{activeAttempt.summary_feedback}</p>
                      ) : null}
                    </div>
                  </CardContent>
                ) : null}
              </Card>

              <Card className="rounded-lg">
                <CardContent className="flex flex-col gap-3 py-4">
                  <p className="text-sm text-muted-foreground">
                    Questions open in a focused quiz modal so answers stay out of the chat.
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    onClick={onOpenAttempt}
                    disabled={
                      activeAttempt.status === "draft" ||
                      (!hasAvailableModels && activeAttempt.status !== "graded")
                    }
                    className="shadow-lg shadow-primary/20"
                  >
                    {activeAttempt.status === "draft"
                      ? "Ask a question to generate"
                      : activeAttempt.status === "graded"
                        ? "Review assessment"
                        : "Take the quiz"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="rounded-lg">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Ask a question in the Quiz chat or choose a saved attempt.
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}

function QuizChatWorkspace({
  chat,
  hasAvailableModels,
  modelStatusMessage,
  selectedModelLabel,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.035),_transparent_52%)]">
      {chat.activeThread ? (
        <>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <ChatThreadView
                activeThread={chat.activeThread}
                attachedFiles={chat.attachedFiles}
                endOfMessagesRef={chat.endOfMessagesRef}
                hasSelectedThreadOnce={chat.hasSelectedThreadOnce}
                isLoadingMessages={chat.isLoadingMessages}
                messages={chat.messages}
                onNewChat={chat.createNewChat}
                onRemoveAttachedFile={chat.removeAttachedFile}
                removingFileId={chat.removingFileId}
                streamingMessageId={chat.streamingMessageId}
              />
            </ScrollArea>
          </div>

          <div className="border-t border-border/70 bg-background/88 shadow-[0_-18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/76">
            <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
              <ChatComposer
                attachedNote={chat.attachedNote}
                attachedFiles={chat.attachedFiles}
                composerNotice={chat.composerNotice}
                draft={chat.draft}
                isEphemeral={chat.isEphemeral}
                isLoadingModels={chat.isLoadingModels}
                isLoadingAttachedFiles={chat.isLoadingAttachedFiles}
                isUploadingFiles={chat.isUploadingFiles}
                isUpdatingAttachedNote={chat.isUpdatingAttachedNote}
                isSending={chat.isSending}
                isStreaming={chat.isStreamingActiveThread}
                hasAvailableModels={hasAvailableModels}
                modelStatusMessage={modelStatusMessage}
                onAttachFiles={chat.attachFiles}
                onOpenNotePicker={chat.openNotePicker}
                onKeyDown={chat.handleComposerKeyDown}
                onPromptClick={chat.setDraft}
                onRemoveAttachedFile={chat.removeAttachedFile}
                onRemoveAttachedNote={() => chat.setAttachedNote(null)}
                onStopStreaming={chat.stopStreaming}
                onSubmit={chat.sendMessage}
                removingFileId={chat.removingFileId}
                selectedModelLabel={selectedModelLabel}
                selectedTool={chat.selectedTool}
                setDraft={chat.setDraft}
                setSelectedTool={chat.setSelectedTool}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <ChatEmptyState selectedModelLabel={selectedModelLabel}>
              <ChatComposer
                attachedNote={chat.attachedNote}
                attachedFiles={chat.attachedFiles}
                composerNotice={chat.composerNotice}
                draft={chat.draft}
                isEmptyState
                isEphemeral={chat.isEphemeral}
                isLoadingModels={chat.isLoadingModels}
                isLoadingAttachedFiles={chat.isLoadingAttachedFiles}
                isUploadingFiles={chat.isUploadingFiles}
                isUpdatingAttachedNote={chat.isUpdatingAttachedNote}
                isSending={chat.isSending}
                isStreaming={chat.isStreamingActiveThread}
                hasAvailableModels={hasAvailableModels}
                modelStatusMessage={modelStatusMessage}
                onAttachFiles={chat.attachFiles}
                onOpenNotePicker={chat.openNotePicker}
                onKeyDown={chat.handleComposerKeyDown}
                onPromptClick={chat.setDraft}
                onRemoveAttachedFile={chat.removeAttachedFile}
                onRemoveAttachedNote={() => chat.setAttachedNote(null)}
                onStopStreaming={chat.stopStreaming}
                onSubmit={chat.sendMessage}
                removingFileId={chat.removingFileId}
                selectedModelLabel={selectedModelLabel}
                selectedTool={chat.selectedTool}
                setDraft={chat.setDraft}
                setSelectedTool={chat.setSelectedTool}
              />
            </ChatEmptyState>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

export function QuizPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const preferredAttemptId = searchParams.get("attemptId")
  const [attempts, setAttempts] = useState([])
  const [draftAttempt, setDraftAttempt] = useState(null)
  const [activeAttemptId, setActiveAttemptId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)
  const [isQuizPanelOpen, setIsQuizPanelOpen] = useState(true)
  const [topic, setTopic] = useState("")
  const [questionCount, setQuestionCount] = useState(6)
  const [difficulty, setDifficulty] = useState("standard")
  const [formats, setFormats] = useState(defaultFormats)
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [isSubmittingAttemptAction, setIsSubmittingAttemptAction] = useState(false)
  const [pageError, setPageError] = useState("")
  const [pendingAttemptAction, setPendingAttemptAction] = useState(null)

  const handleQuizPrompt = useCallback(
    async ({ attachedNote, content, selectedModelKey, thread }) => {
      if (!user?.id || !thread?.id || !selectedModelKey || isGenerating) {
        return
      }

      setIsGenerating(true)
      setPageError("")

      const focusHint = topic.trim()
      const sourcePrompt = content.trim()

      try {
        const quiz = await generateQuiz({
          difficulty,
          formats,
          model: selectedModelKey,
          questionCount,
          sourcePrompt,
          threadId: thread.id,
          topic: focusHint || sourcePrompt,
        })
        const attempt = await createQuizAttemptWithQuestions({
          attachedNoteId: attachedNote?.id ?? null,
          difficulty,
          formats,
          questionCount,
          questions: quiz.questions,
          threadId: thread.id,
          title: quiz.title,
          topic: focusHint || sourcePrompt,
          userId: user.id,
        })

        setAttempts((currentAttempts) => [attempt, ...currentAttempts])
        setDraftAttempt(null)
        setActiveAttemptId(attempt.id)
        setSearchParams({ attemptId: attempt.id }, { replace: true })
        setAnswers(normalizeAnswerMap(attempt))
        toast.success("Quiz generated. Click Take the quiz when you're ready.")
      } catch (error) {
        setPageError(getErrorMessage(error))
      } finally {
        setIsGenerating(false)
      }
    },
    [difficulty, formats, isGenerating, questionCount, setSearchParams, topic, user?.id],
  )

  const chat = useChatWorkspace(user?.id, null, {
    onQuizPrompt: handleQuizPrompt,
  })

  const visibleAttempts = useMemo(
    () => (draftAttempt ? [draftAttempt, ...attempts] : attempts),
    [attempts, draftAttempt],
  )

  const activeAttempt = useMemo(
    () => visibleAttempts.find((attempt) => attempt.id === activeAttemptId) ?? null,
    [activeAttemptId, visibleAttempts],
  )
  const selectedTool = chat.selectedTool
  const setChatSelectedTool = chat.setSelectedTool
  const hasAvailableModels = chat.availableModels.length > 0
  const modelStatusMessage =
    !chat.isLoadingModels && !hasAvailableModels
      ? "No quiz models are enabled right now. Contact an admin to restore availability."
      : ""
  const quizContextState = useMemo(
    () => getQuizContextState(chat.activeThread, chat.messages),
    [chat.activeThread, chat.messages],
  )
  const canGenerateQuiz =
    quizContextState.canGenerate &&
    !chat.isLoadingMessages &&
    !chat.isStreamingActiveThread &&
    !chat.isUpdatingAttachedNote

  const loadAttempts = useCallback(async () => {
    if (!user?.id) {
      setAttempts([])
      setActiveAttemptId(null)
      setIsLoadingAttempts(false)
      return
    }

    setIsLoadingAttempts(true)
    setPageError("")

    try {
      const nextAttempts = await listQuizAttempts(user.id)
      setAttempts(nextAttempts)
      setActiveAttemptId((currentAttemptId) => {
        if (
          preferredAttemptId &&
          nextAttempts.some((attempt) => attempt.id === preferredAttemptId)
        ) {
          return preferredAttemptId
        }

        if (currentAttemptId && nextAttempts.some((attempt) => attempt.id === currentAttemptId)) {
          return currentAttemptId
        }

        return nextAttempts[0]?.id ?? null
      })
    } catch (error) {
      setPageError(getErrorMessage(error))
      setAttempts([])
      setActiveAttemptId(null)
    } finally {
      setIsLoadingAttempts(false)
    }
  }, [preferredAttemptId, user?.id])

  useEffect(() => {
    void loadAttempts()
  }, [loadAttempts])

  useEffect(() => {
    if (selectedTool !== "Quiz") {
      void setChatSelectedTool("Quiz")
    }
  }, [selectedTool, setChatSelectedTool])

  useEffect(() => {
    setAnswers(normalizeAnswerMap(activeAttempt))
  }, [activeAttempt])

  const handleSelectAttempt = (attemptId) => {
    setActiveAttemptId(attemptId)
    if (attemptId.startsWith("draft-")) {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ attemptId }, { replace: true })
    }
  }

  const handleNewQuiz = () => {
    const nextDraftAttempt = createDraftQuizAttempt({ difficulty, questionCount })

    setDraftAttempt(nextDraftAttempt)
    setActiveAttemptId(nextDraftAttempt.id)
    setSearchParams({}, { replace: true })
    setAnswers({})
    setPageError("")
    setIsQuizPanelOpen(true)
    chat.createNewChat()
  }

  const handleGenerateQuiz = async (event) => {
    event.preventDefault()

    if (
      !user?.id ||
      !chat.selectedModelKey ||
      isGenerating ||
      chat.isLoadingMessages ||
      chat.isStreamingActiveThread ||
      chat.isUpdatingAttachedNote
    ) {
      return
    }

    if (!chat.activeThread?.id) {
      setPageError("Ask a question in the Quiz chat before generating a quiz.")
      return
    }

    if (!quizContextState.canGenerate) {
      setPageError(quizContextState.errorMessage)
      return
    }

    setIsGenerating(true)
    setPageError("")
    const focusHint = topic.trim()
    const sourcePrompt =
      [...chat.messages]
        .reverse()
        .find((message) => message.role === "user")
        ?.content?.trim() ?? ""

    try {
      const quiz = await generateQuiz({
        difficulty,
        formats,
        model: chat.selectedModelKey,
        questionCount,
        sourcePrompt,
        threadId: chat.activeThread.id,
        topic: focusHint || sourcePrompt,
      })
      const attempt = await createQuizAttemptWithQuestions({
        attachedNoteId:
          chat.attachedNote?.id ??
          chat.activeFolder?.attached_note_id ??
          null,
        difficulty,
        formats,
        questionCount,
        questions: quiz.questions,
        threadId: chat.activeThread.id,
        title: quiz.title,
        topic: focusHint || sourcePrompt,
        userId: user.id,
      })

      setAttempts((currentAttempts) => [attempt, ...currentAttempts])
      setDraftAttempt(null)
      setActiveAttemptId(attempt.id)
      setSearchParams({ attemptId: attempt.id }, { replace: true })
      setAnswers(normalizeAnswerMap(attempt))
      toast.success("Quiz generated. Click Take the quiz when you're ready.")
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnswerChange = (questionId, value) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }))
  }

  const handleSubmitQuiz = async () => {
    if (
      !user?.id ||
      !activeAttempt ||
      activeAttempt.status === "draft" ||
      !chat.selectedModelKey ||
      isGrading
    ) {
      return
    }

    const submittedAnswers = activeAttempt.questions.map((question) => ({
      answer: answers[question.id] ?? "",
      questionId: question.id,
    }))

    if (submittedAnswers.some((answer) => !answer.answer.trim())) {
      setPageError("Answer every question before submitting the quiz.")
      return
    }

    setIsGrading(true)
    setPageError("")

    try {
      await saveQuizAnswers({
        answers: submittedAnswers,
        attemptId: activeAttempt.id,
        userId: user.id,
      })
      const grades = await gradeQuiz({
        answers: submittedAnswers,
        attemptId: activeAttempt.id,
        model: chat.selectedModelKey,
      })
      const { answers: gradedAnswers, attempt: gradedAttempt } = await applyQuizGrades({
        attemptId: activeAttempt.id,
        grades,
        userId: user.id,
      })
      const answersByQuestionId = new Map(
        gradedAnswers.map((answer) => [answer.question_id, answer]),
      )
      const nextAttempt = {
        ...gradedAttempt,
        questions: activeAttempt.questions.map((question) => ({
          ...question,
          answer: answersByQuestionId.get(question.id) ?? question.answer,
        })),
      }

      setAttempts((currentAttempts) =>
        currentAttempts.map((attempt) =>
          attempt.id === nextAttempt.id ? nextAttempt : attempt,
        ),
      )
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsGrading(false)
    }
  }

  const handleArchiveAttempt = (attemptId) => {
    const attempt = visibleAttempts.find((currentAttempt) => currentAttempt.id === attemptId)

    if (!attempt) {
      return
    }

    setPendingAttemptAction(attempt)
  }

  const confirmArchiveAttempt = async () => {
    const attempt = pendingAttemptAction

    if (!attempt || isSubmittingAttemptAction) {
      return
    }

    setIsSubmittingAttemptAction(true)

    const attemptId = attempt.id

    try {
      if (attemptId.startsWith("draft-")) {
        setDraftAttempt((currentDraft) =>
          currentDraft?.id === attemptId ? null : currentDraft,
        )
        if (attemptId === activeAttemptId) {
          setActiveAttemptId(null)
          setSearchParams({}, { replace: true })
        }
        setPendingAttemptAction(null)
        toast.success("Discarded draft quiz.")
        return
      }

      if (!user?.id) return

      await archiveQuizAttempt({ attemptId, userId: user.id })
      setAttempts((currentAttempts) =>
        currentAttempts.filter((attempt) => attempt.id !== attemptId),
      )
      if (attemptId === activeAttemptId) {
        setActiveAttemptId(null)
        setSearchParams({}, { replace: true })
      }
      setPendingAttemptAction(null)
      toast.success(`Archived "${attempt.title}".`)
    } catch (error) {
      const message = getErrorMessage(error)

      setPageError(message)
      toast.error(message)
    } finally {
      setIsSubmittingAttemptAction(false)
    }
  }

  const handleSelectNote = (note) => {
    void chat.setAttachedNote(note)
  }

  const alerts =
    pageError || chat.modelsError || chat.pageError ? (
      <div className="flex flex-col gap-3">
        {chat.modelsError ? (
          <Alert variant="destructive">
            <AlertTitle>Models unavailable</AlertTitle>
            <AlertDescription>{chat.modelsError}</AlertDescription>
          </Alert>
        ) : null}
        {chat.pageError ? (
          <Alert variant="destructive">
            <AlertTitle>Assistant unavailable</AlertTitle>
            <AlertDescription>{chat.pageError}</AlertDescription>
          </Alert>
        ) : null}
        {pageError ? (
          <Alert variant="destructive">
            <AlertTitle>Quiz unavailable</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    ) : null

  return (
    <WorkspaceShell
      alerts={alerts}
      headerContent={
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <ChatModelMenu
              isLoadingModels={chat.isLoadingModels}
              models={chat.availableModels}
              selectedModelKey={chat.selectedModelKey}
              selectedModelLabel={chat.selectedModelLabel}
              setSelectedModelKey={chat.setSelectedModelKey}
            />
            <div className="truncate text-xs text-muted-foreground">Quiz model</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant={isQuizPanelOpen ? "ghost" : "outline"}
              size="sm"
              onClick={() => setIsQuizPanelOpen((isOpen) => !isOpen)}
              aria-label={isQuizPanelOpen ? "Collapse quiz settings sidebar" : "Open quiz settings sidebar"}
              title={isQuizPanelOpen ? "Collapse quiz settings" : "Quiz settings"}
            >
              {isQuizPanelOpen ? (
                <PanelRightClose data-icon="inline-start" />
              ) : (
                <SlidersHorizontal data-icon="inline-start" />
              )}
              <span className="hidden sm:inline">Quiz settings</span>
            </Button>
          </div>
        </div>
      }
      pageKey="quiz"
      primaryAction={{
        label: "New quiz",
        icon: Plus,
        onClick: handleNewQuiz,
      }}
      sidebarContent={
        <QuizAttemptsList
          activeAttemptId={activeAttemptId}
          attempts={visibleAttempts}
          isLoading={isLoadingAttempts}
          onArchiveAttempt={handleArchiveAttempt}
          onSelectAttempt={handleSelectAttempt}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <QuizChatWorkspace
          chat={chat}
          hasAvailableModels={hasAvailableModels}
          modelStatusMessage={modelStatusMessage}
          selectedModelLabel={chat.selectedModelLabel}
        />
        {isQuizPanelOpen ? (
          <QuizPanel
            activeAttempt={activeAttempt}
            canGenerateQuiz={canGenerateQuiz}
            chat={chat}
            difficulty={difficulty}
            formats={formats}
            handleGenerateQuiz={handleGenerateQuiz}
            hasAvailableModels={hasAvailableModels}
            isGenerating={isGenerating}
            onOpenAttempt={() => setIsQuizDialogOpen(true)}
            questionCount={questionCount}
            quizContextState={quizContextState}
            setDifficulty={setDifficulty}
            setFormats={setFormats}
            setQuestionCount={setQuestionCount}
            setTopic={setTopic}
            topic={topic}
          />
        ) : (
          <aside className="flex border-t bg-background p-3 lg:w-14 lg:border-l lg:border-t-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mx-auto"
              onClick={() => setIsQuizPanelOpen(true)}
              aria-label="Open quiz settings sidebar"
              title="Quiz settings"
            >
              <PanelRightOpen data-icon="inline-start" />
            </Button>
          </aside>
        )}
      </div>

      <ChatNotePicker
        isLoading={chat.isLoadingAvailableNotes}
        notes={chat.availableNotes}
        onClose={chat.closeNotePicker}
        onSelectNote={handleSelectNote}
        open={chat.isNotePickerOpen}
        selectedNoteId={chat.attachedNote?.id ?? ""}
      />
      <QuizAttemptDialog
        answers={answers}
        attempt={activeAttempt}
        isGrading={isGrading}
        onAnswerChange={handleAnswerChange}
        onOpenChange={setIsQuizDialogOpen}
        onSubmitQuiz={handleSubmitQuiz}
        open={isQuizDialogOpen}
      />
      <ActionConfirmDialog
        confirmLabel={
          pendingAttemptAction?.id?.startsWith("draft-") ? "Discard draft" : "Archive"
        }
        description={
          pendingAttemptAction?.id?.startsWith("draft-")
            ? "This unsaved quiz draft will be removed."
            : "This quiz attempt will be removed from your saved quiz list."
        }
        icon={pendingAttemptAction?.id?.startsWith("draft-") ? Trash2 : Archive}
        isSubmitting={isSubmittingAttemptAction}
        onConfirm={confirmArchiveAttempt}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAttemptAction(null)
          }
        }}
        open={Boolean(pendingAttemptAction)}
        title={
          pendingAttemptAction?.id?.startsWith("draft-")
            ? "Discard draft quiz?"
            : "Archive quiz?"
        }
        tone={pendingAttemptAction?.id?.startsWith("draft-") ? "destructive" : "warning"}
      />
    </WorkspaceShell>
  )
}
