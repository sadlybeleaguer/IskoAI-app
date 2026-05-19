import { MessageSquarePlus, FileText, Ghost } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useCallback, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatComposer, ChatModelMenu } from "@/components/chat/chat-composer"
import { ChatEmptyState, ChatThreadView } from "@/components/chat/chat-content"
import { ChatNotePicker } from "@/components/chat/chat-note-picker"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatNotesPanel } from "@/components/chat/chat-notes-panel"
import { QuizAttemptDialog } from "@/components/quiz/quiz-attempt-dialog"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useChatWorkspace } from "@/hooks/use-chat-workspace"
import {
  applyQuizGrades,
  createQuizAttemptWithQuestions,
  generateQuiz,
  gradeQuiz,
  saveQuizAnswers,
} from "@/services/db.service"
import { cn } from "@/utils/cn"
import { getErrorMessage } from "@/utils/errors"

const defaultQuizFormats = ["multiple_choice", "true_false", "short_answer"]

function normalizeQuizAnswerMap(attempt) {
  const nextAnswers = {}

  for (const question of attempt?.questions ?? []) {
    nextAnswers[question.id] = question.answer?.answer ?? ""
  }

  return nextAnswers
}

export function ChatWorkspaceShellPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const preferredThreadId = searchParams.get("threadId")
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false)
  const [quizAttempt, setQuizAttempt] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [isGradingQuiz, setIsGradingQuiz] = useState(false)
  const [quizError, setQuizError] = useState("")

  const handleQuizPrompt = useCallback(
    async ({ attachedNote, content, selectedModelKey, thread }) => {
      if (!user?.id || !thread?.id || !selectedModelKey || isGeneratingQuiz) {
        return
      }

      setIsGeneratingQuiz(true)
      setQuizError("")

      const sourcePrompt = content.trim()

      try {
        const quiz = await generateQuiz({
          difficulty: "standard",
          formats: defaultQuizFormats,
          model: selectedModelKey,
          questionCount: 6,
          sourcePrompt,
          threadId: thread.id,
          topic: sourcePrompt,
        })
        const attempt = await createQuizAttemptWithQuestions({
          attachedNoteId: attachedNote?.id ?? null,
          difficulty: "standard",
          formats: defaultQuizFormats,
          questionCount: 6,
          questions: quiz.questions,
          threadId: thread.id,
          title: quiz.title,
          topic: sourcePrompt,
          userId: user.id,
        })

        setQuizAttempt(attempt)
        setQuizAnswers(normalizeQuizAnswerMap(attempt))
        setIsQuizDialogOpen(true)
      } catch (error) {
        setQuizError(getErrorMessage(error))
      } finally {
        setIsGeneratingQuiz(false)
      }
    },
    [isGeneratingQuiz, user?.id],
  )

  const {
    activeThread,
    activeThreadId,
    archivedThreads,
    attachedNote,
    attachedFiles,
    attachFiles,
    availableNotes,
    availableModels,
    archiveThread,
    closeNotePicker,
    composerNotice,
    createNewChat,
    createFolder,
    deleteFolder,
    deleteThreadPermanent,
    deletingThreadId,
    draft,
    endOfMessagesRef,
    folders,
    getFolderFiles,
    folderThreads,
    groupedThreads,
    handleComposerKeyDown,
    hasSelectedThreadOnce,
    isLoadingMessages,
    isLoadingThreads,
    isLoadingArchived,
    isLoadingFolders,
    isSending,
    isStreamingActiveThread,
    messages,
    modelsError,
    moveThreadToFolder,
    pageError,
    hasAvailableModels,
    isLoadingAttachedFiles,
    isLoadingAvailableNotes,
    isLoadingFolderFiles,
    isLoadingModels,
    isEphemeral,
    selectedModelKey,
    selectedModelLabel,
    selectedTool,
    isNotePickerOpen,
    isUploadingFiles,
    isUploadingFolderFiles,
    loadAvailableNotes,
    loadFolderFiles,
    selectThread,
    removeAttachedFile,
    removeFolderFile,
    removingFileId,
    removingFolderFileId,
    restoreThread,
    sendMessage,
    setAttachedNote,
    setDraft,
    setIsEphemeral,
    setSelectedModelKey,
    setSelectedTool,
    openNotePicker,
    stopStreaming,
    streamingMessageId,
    uploadFolderFiles,
    validateFiles,
    isUpdatingAttachedNote,
    updateFolder,
    updatingFolderId,
  } = useChatWorkspace(user?.id, preferredThreadId, {
    onQuizPrompt: handleQuizPrompt,
  })

  const handleCreateNewChat = () => {
    setSearchParams({}, { replace: true })
    createNewChat()
  }

  const handleSelectThread = (threadId) => {
    setSearchParams({ threadId }, { replace: true })
    selectThread(threadId)
  }

  const handleToggleEphemeral = () => {
    if (!isEphemeral) {
      setSearchParams({}, { replace: true })
      createNewChat()
      setIsEphemeral(true)
    } else {
      setIsEphemeral(false)
    }
  }

  const handleSelectedToolChange = useCallback(
    (nextTool) => {
      if (nextTool === "Quiz") {
        void setSelectedTool(nextTool)
        navigate("/quiz")
        return
      }

      void setSelectedTool(nextTool)
    },
    [navigate, setSelectedTool],
  )

  const handleQuizAnswerChange = (questionId, value) => {
    setQuizAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: value,
    }))
  }

  const handleSubmitQuiz = async () => {
    if (!user?.id || !quizAttempt || !selectedModelKey || isGradingQuiz) {
      return
    }

    const submittedAnswers = quizAttempt.questions.map((question) => ({
      answer: quizAnswers[question.id] ?? "",
      questionId: question.id,
    }))

    if (submittedAnswers.some((answer) => !answer.answer.trim())) {
      setQuizError("Answer every question before submitting the quiz.")
      return
    }

    setIsGradingQuiz(true)
    setQuizError("")

    try {
      await saveQuizAnswers({
        answers: submittedAnswers,
        attemptId: quizAttempt.id,
        userId: user.id,
      })
      const grades = await gradeQuiz({
        answers: submittedAnswers,
        attemptId: quizAttempt.id,
        model: selectedModelKey,
      })
      const { answers: gradedAnswers, attempt: gradedAttempt } = await applyQuizGrades({
        attemptId: quizAttempt.id,
        grades,
        userId: user.id,
      })
      const answersByQuestionId = new Map(
        gradedAnswers.map((answer) => [answer.question_id, answer]),
      )
      const nextAttempt = {
        ...gradedAttempt,
        questions: quizAttempt.questions.map((question) => ({
          ...question,
          answer: answersByQuestionId.get(question.id) ?? question.answer,
        })),
      }

      setQuizAttempt(nextAttempt)
      setQuizAnswers(normalizeQuizAnswerMap(nextAttempt))
    } catch (error) {
      setQuizError(getErrorMessage(error))
    } finally {
      setIsGradingQuiz(false)
    }
  }

  const modelStatusMessage =
    !isLoadingModels && !hasAvailableModels
      ? "No chat models are enabled right now. Contact an admin to restore availability."
      : ""

  const alerts =
    pageError || modelsError || quizError ? (
      <div className="flex flex-col gap-3">
        {modelsError ? (
          <Alert variant="destructive">
            <AlertTitle>Models unavailable</AlertTitle>
            <AlertDescription>{modelsError}</AlertDescription>
          </Alert>
        ) : null}
        {pageError ? (
          <Alert variant="destructive">
            <AlertTitle>Chat unavailable</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}
        {quizError ? (
          <Alert variant="destructive">
            <AlertTitle>Quiz unavailable</AlertTitle>
            <AlertDescription>{quizError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    ) : null

  const temporaryChatToggle = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-9 gap-2 px-3",
        isEphemeral && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
      )}
      onClick={handleToggleEphemeral}
      title={isEphemeral ? "Turn off temporary chat" : "Temporary chat"}
    >
      <Ghost className="size-4" />
      <span className="hidden sm:inline">Temporary</span>
    </Button>
  )

  return (
    <WorkspaceShell
      alerts={alerts}
      headerContent={
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <ChatModelMenu
              isLoadingModels={isLoadingModels}
              models={availableModels}
              selectedModelKey={selectedModelKey}
              selectedModelLabel={selectedModelLabel}
              setSelectedModelKey={setSelectedModelKey}
            />
            <div className="truncate text-xs text-muted-foreground">Active model</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {quizAttempt ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 px-3"
                onClick={() => setIsQuizDialogOpen(true)}
              >
                <span className="hidden sm:inline">
                  {quizAttempt.status === "graded" ? "Review quiz" : "Take quiz"}
                </span>
                <span className="sm:hidden">Quiz</span>
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 gap-2 px-3",
                isNotesPanelOpen && "bg-muted text-foreground"
              )}
              onClick={() => setIsNotesPanelOpen(!isNotesPanelOpen)}
            >
              <FileText className="size-4" />
              <span className="hidden sm:inline">Notes</span>
            </Button>
          </div>
        </div>
      }
      pageKey="chat"
      primaryAction={{
        label: "New chat",
        icon: MessageSquarePlus,
        onClick: handleCreateNewChat,
      }}
      sidebarContent={
        <ChatSidebar
          activeThreadId={activeThreadId}
          archivedThreads={archivedThreads}
          createFolder={createFolder}
          deleteFolder={deleteFolder}
          deleteThreadPermanent={deleteThreadPermanent}
          deletingThreadId={deletingThreadId}
          folders={folders}
          getFolderFiles={getFolderFiles}
          folderThreads={folderThreads}
          groupedThreads={groupedThreads}
          isLoadingArchived={isLoadingArchived}
          isLoadingAvailableNotes={isLoadingAvailableNotes}
          isLoadingFolderFiles={isLoadingFolderFiles}
          isLoadingFolders={isLoadingFolders}
          isLoadingThreads={isLoadingThreads}
          isUploadingFolderFiles={isUploadingFolderFiles}
          loadAvailableNotes={loadAvailableNotes}
          loadFolderFiles={loadFolderFiles}
          moveThreadToFolder={moveThreadToFolder}
          onArchiveThread={(threadId) => {
            if (preferredThreadId === threadId || activeThreadId === threadId) {
              setSearchParams({}, { replace: true })
            }
            void archiveThread(threadId)
          }}
          onRestoreThread={restoreThread}
          onSelectThread={handleSelectThread}
          availableNotes={availableNotes}
          removeFolderFile={removeFolderFile}
          removingFolderFileId={removingFolderFileId}
          updateFolder={updateFolder}
          uploadFolderFiles={uploadFolderFiles}
          updatingFolderId={updatingFolderId}
          validateFiles={validateFiles}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.035),_transparent_52%)]">
          {activeThread ? (
            <>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="mx-auto flex w-full max-w-5xl px-4 pt-4 sm:px-6 lg:px-8">
                    {temporaryChatToggle}
                  </div>
                  <ChatThreadView
                    activeThread={activeThread}
                    attachedFiles={attachedFiles}
                    endOfMessagesRef={endOfMessagesRef}
                    hasSelectedThreadOnce={hasSelectedThreadOnce}
                    isEphemeral={isEphemeral}
                    isLoadingMessages={isLoadingMessages}
                    messages={messages}
                    onNewChat={handleCreateNewChat}
                    onRemoveAttachedFile={removeAttachedFile}
                    removingFileId={removingFileId}
                    streamingMessageId={streamingMessageId}
                  />
                </ScrollArea>
              </div>

              <div className="border-t border-border/70 bg-background/88 shadow-[0_-18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/76">
                <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
                  <ChatComposer
                    attachedNote={attachedNote}
                    attachedFiles={attachedFiles}
                    composerNotice={composerNotice}
                    draft={draft}
                    isEphemeral={isEphemeral}
                    isLoadingModels={isLoadingModels}
                    isLoadingAttachedFiles={isLoadingAttachedFiles}
                    isUploadingFiles={isUploadingFiles}
                    isUpdatingAttachedNote={isUpdatingAttachedNote}
                    isSending={isSending}
                    isStreaming={isStreamingActiveThread}
                    hasAvailableModels={hasAvailableModels}
                    modelStatusMessage={modelStatusMessage}
                    onAttachFiles={attachFiles}
                    onOpenNotePicker={openNotePicker}
                    onKeyDown={handleComposerKeyDown}
                    onPromptClick={setDraft}
                    onRemoveAttachedFile={removeAttachedFile}
                    onRemoveAttachedNote={() => setAttachedNote(null)}
                    onStopStreaming={stopStreaming}
                    onSubmit={sendMessage}
                    removingFileId={removingFileId}
                    selectedModelLabel={selectedModelLabel}
                    selectedTool={selectedTool}
                    setDraft={setDraft}
                    setSelectedTool={handleSelectedToolChange}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="mx-auto flex w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
                  {temporaryChatToggle}
                </div>
                <ChatEmptyState>
                  <ChatComposer
                    attachedNote={attachedNote}
                    attachedFiles={attachedFiles}
                    composerNotice={composerNotice}
                    draft={draft}
                    isEmptyState
                    isEphemeral={isEphemeral}
                    isLoadingModels={isLoadingModels}
                    isLoadingAttachedFiles={isLoadingAttachedFiles}
                    isUploadingFiles={isUploadingFiles}
                    isUpdatingAttachedNote={isUpdatingAttachedNote}
                    isSending={isSending}
                    isStreaming={isStreamingActiveThread}
                    hasAvailableModels={hasAvailableModels}
                    modelStatusMessage={modelStatusMessage}
                    onAttachFiles={attachFiles}
                    onOpenNotePicker={openNotePicker}
                    onKeyDown={handleComposerKeyDown}
                    onPromptClick={setDraft}
                    onRemoveAttachedFile={removeAttachedFile}
                    onRemoveAttachedNote={() => setAttachedNote(null)}
                    onStopStreaming={stopStreaming}
                    onSubmit={sendMessage}
                    removingFileId={removingFileId}
                    selectedModelLabel={selectedModelLabel}
                    selectedTool={selectedTool}
                    setDraft={setDraft}
                    setSelectedTool={handleSelectedToolChange}
                  />
                </ChatEmptyState>
              </ScrollArea>
            </div>
          )}

          <ChatNotePicker
            isLoading={isLoadingAvailableNotes}
            notes={availableNotes}
            onClose={closeNotePicker}
            onSelectNote={setAttachedNote}
            open={isNotePickerOpen}
            selectedNoteId={attachedNote?.id ?? ""}
          />
          <QuizAttemptDialog
            answers={quizAnswers}
            attempt={quizAttempt}
            isGrading={isGradingQuiz}
            onAnswerChange={handleQuizAnswerChange}
            onOpenChange={setIsQuizDialogOpen}
            onSubmitQuiz={handleSubmitQuiz}
            open={isQuizDialogOpen}
          />
        </div>

        {isNotesPanelOpen && <ChatNotesPanel />}
      </div>
    </WorkspaceShell>
  )
}
