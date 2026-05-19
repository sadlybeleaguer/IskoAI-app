import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  SquarePen,
  Trash2,
} from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { ChatComposer, ChatModelMenu } from "@/components/chat/chat-composer"
import { ChatNotePicker } from "@/components/chat/chat-note-picker"
import { ChatEmptyState, ChatThreadView } from "@/components/chat/chat-content"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
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
import { Textarea } from "@/components/ui/textarea"
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
const minimumQuizContextMessages = 2
const minimumQuizContextCharacters = 120
const minimumLatestAssistantCharacters = 60
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
        "Start a Quiz thread by asking a question in chat. Quiz generation unlocks after the assistant responds with enough detail.",
      errorMessage:
        "Start a Quiz thread and wait for an assistant explanation before generating a quiz.",
      title: "No active Quiz thread",
    }
  }

  const usableMessages = getUsableQuizContextMessages(messages)
  const assistantMessages = usableMessages.filter((message) => message.role === "assistant")
  const userMessages = usableMessages.filter((message) => message.role === "user")
  const latestAssistantExplanation =
    [...assistantMessages]
      .reverse()
      .find((message) => message.content.trim().length >= minimumLatestAssistantCharacters)
      ?.content?.trim() ?? ""
  const totalCharacters = usableMessages.reduce(
    (sum, message) => sum + message.content.trim().length,
    0,
  )

  if (!usableMessages.length) {
    return {
      canGenerate: false,
      description:
        "Ask a question in this Quiz thread first. The generator uses the saved thread conversation, not only the setup field.",
      errorMessage:
        "This Quiz thread does not have any saved chat context yet. Ask a question and wait for an assistant response first.",
      title: "No chat context yet",
    }
  }

  if (
    usableMessages.length < minimumQuizContextMessages ||
    !assistantMessages.length ||
    !userMessages.length ||
    totalCharacters < minimumQuizContextCharacters ||
    latestAssistantExplanation.length < minimumLatestAssistantCharacters
  ) {
    return {
      canGenerate: false,
      description:
        "Add at least one user question and one detailed assistant explanation before generating. The latest assistant reply should contain enough material to turn into questions.",
      errorMessage:
        "This Quiz thread needs more discussion before a quiz can be generated. Ask a question and wait for a fuller assistant explanation.",
      title: "More thread context needed",
    }
  }

  return {
    canGenerate: true,
    description:
      "Questions will be generated from this Quiz thread's recent saved messages, with extra weight on the latest assistant explanation and any attached note.",
    errorMessage: "",
    title: "Quiz context ready",
  }
}

function getAttemptStatusLabel(attempt) {
  if (!attempt) return "Draft"
  if (attempt.status === "graded") return `${Math.round(attempt.score_percent ?? 0)}%`
  if (attempt.status === "submitted") return "Submitted"
  return "Generated"
}

function getQuestionTypeLabel(value) {
  return formatLabels[value] ?? value
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

function QuestionCard({ answerValue, isGraded, onAnswerChange, question, questionNumber }) {
  const savedAnswer = question.answer
  const isCorrect = savedAnswer?.is_correct

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Question {questionNumber}</Badge>
          <Badge variant="outline">{getQuestionTypeLabel(question.question_type)}</Badge>
          {isGraded ? (
            <Badge variant={isCorrect ? "default" : "destructive"}>
              {isCorrect ? "Correct" : "Review"}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-sm">{question.prompt}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {question.question_type === "short_answer" ? (
          <Textarea
            value={answerValue}
            onChange={(event) => onAnswerChange(question.id, event.target.value)}
            placeholder="Write your answer"
            className="min-h-24"
            disabled={isGraded}
          />
        ) : (
          <div className="grid gap-2">
            {(question.question_type === "true_false"
              ? ["True", "False"]
              : question.choices ?? []
            ).map((choice) => {
              const isSelected = answerValue === choice

              return (
                <button
                  key={choice}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isSelected ? "border-primary/40 bg-primary/10" : "hover:bg-muted/60",
                  )}
                  onClick={() => onAnswerChange(question.id, choice)}
                  disabled={isGraded}
                >
                  {isSelected ? (
                    <CheckCircle2 data-icon="inline-start" />
                  ) : (
                    <Circle data-icon="inline-start" />
                  )}
                  <span>{choice}</span>
                </button>
              )
            })}
          </div>
        )}

        {isGraded ? (
          <div className="rounded-lg border bg-muted/35 px-3 py-3 text-sm">
            <div className="font-medium">
              Score {savedAnswer?.score ?? 0}/{savedAnswer?.max_score ?? 1}
            </div>
            {savedAnswer?.feedback ? (
              <div className="mt-1 text-muted-foreground">{savedAnswer.feedback}</div>
            ) : null}
            {question.explanation ? (
              <div className="mt-2 text-muted-foreground">
                Explanation: {question.explanation}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function QuizPanel({
  activeAttempt,
  answers,
  canGenerateQuiz,
  chat,
  difficulty,
  formats,
  hasAvailableModels,
  handleAnswerChange,
  handleGenerateQuiz,
  handleSubmitQuiz,
  isGenerating,
  isGrading,
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
              <div className="flex items-center gap-2">
                <SquarePen data-icon="inline-start" />
                <CardTitle>Quiz setup</CardTitle>
              </div>
              <CardDescription>
                Generate a saved quiz from the active Quiz thread. Use the field below
                only to refine what the quiz should emphasize.
              </CardDescription>
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

                {chat.attachedNote ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {chat.attachedNote.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Attached note
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => chat.setAttachedNote(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="button" variant="outline" onClick={chat.openNotePicker}>
                    <FileText data-icon="inline-start" />
                    {chat.attachedNote ? "Replace note" : "Attach note"}
                  </Button>
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

              {activeAttempt.questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  answerValue={answers[question.id] ?? ""}
                  isGraded={activeAttempt.status === "graded"}
                  onAnswerChange={handleAnswerChange}
                  question={question}
                  questionNumber={index + 1}
                />
              ))}

              {activeAttempt.status !== "graded" ? (
                <div className="sticky bottom-4 flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmitQuiz}
                    disabled={isGrading || !hasAvailableModels}
                    className="shadow-lg shadow-primary/20"
                  >
                    {isGrading ? (
                      <Loader2 className="animate-spin" data-icon="inline-start" />
                    ) : (
                      <CheckCircle2 data-icon="inline-start" />
                    )}
                    {isGrading ? "Grading..." : "Submit for grading"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Card className="rounded-lg">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Generate a quiz or choose a saved attempt.
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
                attachedFiles={[]}
                endOfMessagesRef={chat.endOfMessagesRef}
                hasSelectedThreadOnce={chat.hasSelectedThreadOnce}
                isLoadingMessages={chat.isLoadingMessages}
                messages={chat.messages}
                onNewChat={chat.createNewChat}
                streamingMessageId={chat.streamingMessageId}
              />
            </ScrollArea>
          </div>

          <div className="border-t border-border/70 bg-background/88 shadow-[0_-18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/76">
            <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
              <ChatComposer
                allowFileAttachments={false}
                attachedNote={chat.attachedNote}
                attachedFiles={[]}
                composerNotice={chat.composerNotice}
                draft={chat.draft}
                isEphemeral={chat.isEphemeral}
                isLoadingModels={chat.isLoadingModels}
                isLoadingAttachedFiles={false}
                isUploadingFiles={false}
                isUpdatingAttachedNote={chat.isUpdatingAttachedNote}
                isSending={chat.isSending}
                isStreaming={chat.isStreamingActiveThread}
                hasAvailableModels={hasAvailableModels}
                modelStatusMessage={modelStatusMessage}
                onAttachFiles={() => undefined}
                onOpenNotePicker={chat.openNotePicker}
                onKeyDown={chat.handleComposerKeyDown}
                onPromptClick={chat.setDraft}
                onRemoveAttachedFile={() => undefined}
                onRemoveAttachedNote={() => chat.setAttachedNote(null)}
                onStopStreaming={chat.stopStreaming}
                onSubmit={chat.sendMessage}
                removingFileId=""
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
                allowFileAttachments={false}
                attachedNote={chat.attachedNote}
                attachedFiles={[]}
                composerNotice={chat.composerNotice}
                draft={chat.draft}
                isEmptyState
                isEphemeral={chat.isEphemeral}
                isLoadingModels={chat.isLoadingModels}
                isLoadingAttachedFiles={false}
                isUploadingFiles={false}
                isUpdatingAttachedNote={chat.isUpdatingAttachedNote}
                isSending={chat.isSending}
                isStreaming={chat.isStreamingActiveThread}
                hasAvailableModels={hasAvailableModels}
                modelStatusMessage={modelStatusMessage}
                onAttachFiles={() => undefined}
                onOpenNotePicker={chat.openNotePicker}
                onKeyDown={chat.handleComposerKeyDown}
                onPromptClick={chat.setDraft}
                onRemoveAttachedFile={() => undefined}
                onRemoveAttachedNote={() => chat.setAttachedNote(null)}
                onStopStreaming={chat.stopStreaming}
                onSubmit={chat.sendMessage}
                removingFileId=""
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
  const chat = useChatWorkspace(user?.id)
  const [attempts, setAttempts] = useState([])
  const [activeAttemptId, setActiveAttemptId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [topic, setTopic] = useState("")
  const [questionCount, setQuestionCount] = useState(6)
  const [difficulty, setDifficulty] = useState("standard")
  const [formats, setFormats] = useState(defaultFormats)
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [pageError, setPageError] = useState("")

  const activeAttempt = useMemo(
    () => attempts.find((attempt) => attempt.id === activeAttemptId) ?? null,
    [activeAttemptId, attempts],
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
    setSearchParams({ attemptId }, { replace: true })
  }

  const handleNewQuiz = () => {
    setActiveAttemptId(null)
    setSearchParams({}, { replace: true })
    setAnswers({})
    setPageError("")
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
      setPageError("Start a Quiz thread and wait for an assistant explanation before generating a quiz.")
      return
    }

    if (!quizContextState.canGenerate) {
      setPageError(quizContextState.errorMessage)
      return
    }

    setIsGenerating(true)
    setPageError("")
    const focusHint = topic.trim()

    try {
      const quiz = await generateQuiz({
        difficulty,
        formats,
        model: chat.selectedModelKey,
        questionCount,
        threadId: chat.activeThread.id,
        topic: focusHint,
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
        topic: focusHint,
        userId: user.id,
      })

      setAttempts((currentAttempts) => [attempt, ...currentAttempts])
      setActiveAttemptId(attempt.id)
      setSearchParams({ attemptId: attempt.id }, { replace: true })
      setAnswers(normalizeAnswerMap(attempt))
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
    if (!user?.id || !activeAttempt || !chat.selectedModelKey || isGrading) {
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

  const handleArchiveAttempt = async (attemptId) => {
    if (!user?.id) return

    try {
      await archiveQuizAttempt({ attemptId, userId: user.id })
      setAttempts((currentAttempts) =>
        currentAttempts.filter((attempt) => attempt.id !== attemptId),
      )
      if (attemptId === activeAttemptId) {
        setActiveAttemptId(null)
        setSearchParams({}, { replace: true })
      }
    } catch (error) {
      setPageError(getErrorMessage(error))
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
              variant="outline"
              size="sm"
              onClick={chat.openNotePicker}
              disabled={chat.isUpdatingAttachedNote}
            >
              <FileText data-icon="inline-start" />
              <span className="hidden sm:inline">
                {chat.attachedNote ? chat.attachedNote.title : "Attach note"}
              </span>
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
          attempts={attempts}
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
        <QuizPanel
          activeAttempt={activeAttempt}
          answers={answers}
          canGenerateQuiz={canGenerateQuiz}
          chat={chat}
          difficulty={difficulty}
          formats={formats}
          handleAnswerChange={handleAnswerChange}
          handleGenerateQuiz={handleGenerateQuiz}
          handleSubmitQuiz={handleSubmitQuiz}
          hasAvailableModels={hasAvailableModels}
          isGenerating={isGenerating}
          isGrading={isGrading}
          questionCount={questionCount}
          quizContextState={quizContextState}
          setDifficulty={setDifficulty}
          setFormats={setFormats}
          setQuestionCount={setQuestionCount}
          setTopic={setTopic}
          topic={topic}
        />
      </div>

      <ChatNotePicker
        isLoading={chat.isLoadingAvailableNotes}
        notes={chat.availableNotes}
        onClose={chat.closeNotePicker}
        onSelectNote={handleSelectNote}
        open={chat.isNotePickerOpen}
        selectedNoteId={chat.attachedNote?.id ?? ""}
      />
    </WorkspaceShell>
  )
}
