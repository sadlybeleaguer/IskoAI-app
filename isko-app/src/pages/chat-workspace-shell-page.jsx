import { MessageSquarePlus } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatComposer, ChatModelMenu } from "@/components/chat/chat-composer"
import { ChatEmptyState, ChatThreadView } from "@/components/chat/chat-content"
import { ChatNotePicker } from "@/components/chat/chat-note-picker"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { useAuth } from "@/contexts/auth-context"
import { useChatWorkspace } from "@/hooks/use-chat-workspace"

export function ChatWorkspaceShellPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const preferredThreadId = searchParams.get("threadId")
  const {
    activeThread,
    activeThreadId,
    attachedNote,
    availableNotes,
    availableModels,
    closeNotePicker,
    composerNotice,
    createNewChat,
    deleteThread,
    deletingThreadId,
    draft,
    endOfMessagesRef,
    groupedThreads,
    handleComposerKeyDown,
    isLoadingMessages,
    isLoadingThreads,
    isSending,
    isStreamingActiveThread,
    messages,
    modelsError,
    pageError,
    hasAvailableModels,
    isLoadingAvailableNotes,
    isLoadingModels,
    selectedModelKey,
    selectedModelLabel,
    selectedTool,
    isNotePickerOpen,
    selectThread,
    sendMessage,
    setComposerNotice,
    setAttachedNote,
    setDraft,
    setSelectedModelKey,
    setSelectedTool,
    openNotePicker,
    stopStreaming,
    streamingMessageId,
    isUpdatingAttachedNote,
  } = useChatWorkspace(user?.id, preferredThreadId)

  const handleCreateNewChat = () => {
    setSearchParams({}, { replace: true })
    createNewChat()
  }

  const handleSelectThread = (threadId) => {
    setSearchParams({ threadId }, { replace: true })
    selectThread(threadId)
  }

  const handleDeleteThread = (threadId) => {
    if (preferredThreadId === threadId || activeThreadId === threadId) {
      setSearchParams({}, { replace: true })
    }

    void deleteThread(threadId)
  }

  const modelStatusMessage =
    !isLoadingModels && !hasAvailableModels
      ? "No chat models are enabled right now. Contact an admin to restore availability."
      : ""

  const alerts =
    pageError || modelsError ? (
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
      </div>
    ) : null

  return (
    <WorkspaceShell
      alerts={alerts}
      headerContent={
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
          deletingThreadId={deletingThreadId}
          groupedThreads={groupedThreads}
          isLoadingThreads={isLoadingThreads}
          onDeleteThread={handleDeleteThread}
          onSelectThread={handleSelectThread}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.035),_transparent_52%)]">
        {activeThread ? (
          <>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <ChatThreadView
                  activeThread={activeThread}
                  endOfMessagesRef={endOfMessagesRef}
                  isLoadingMessages={isLoadingMessages}
                  messages={messages}
                  onNewChat={handleCreateNewChat}
                  streamingMessageId={streamingMessageId}
                />
              </ScrollArea>
            </div>

            <div className="border-t border-border/70 bg-background/88 shadow-[0_-18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/76">
              <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
                <ChatComposer
                  attachedNote={attachedNote}
                  composerNotice={composerNotice}
                  draft={draft}
                  isLoadingModels={isLoadingModels}
                  isUpdatingAttachedNote={isUpdatingAttachedNote}
                  isSending={isSending}
                  isStreaming={isStreamingActiveThread}
                  hasAvailableModels={hasAvailableModels}
                  modelStatusMessage={modelStatusMessage}
                  onOpenNotePicker={openNotePicker}
                  onComposerNotice={setComposerNotice}
                  onKeyDown={handleComposerKeyDown}
                  onPromptClick={setDraft}
                  onRemoveAttachedNote={() => setAttachedNote(null)}
                  onStopStreaming={stopStreaming}
                  onSubmit={sendMessage}
                  selectedModelLabel={selectedModelLabel}
                  selectedTool={selectedTool}
                  setDraft={setDraft}
                  setSelectedTool={setSelectedTool}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <ChatEmptyState selectedModelLabel={selectedModelLabel}>
                <ChatComposer
                  attachedNote={attachedNote}
                  composerNotice={composerNotice}
                  draft={draft}
                  isEmptyState
                  isLoadingModels={isLoadingModels}
                  isUpdatingAttachedNote={isUpdatingAttachedNote}
                  isSending={isSending}
                  isStreaming={isStreamingActiveThread}
                  hasAvailableModels={hasAvailableModels}
                  modelStatusMessage={modelStatusMessage}
                  onOpenNotePicker={openNotePicker}
                  onComposerNotice={setComposerNotice}
                  onKeyDown={handleComposerKeyDown}
                  onPromptClick={setDraft}
                  onRemoveAttachedNote={() => setAttachedNote(null)}
                  onStopStreaming={stopStreaming}
                  onSubmit={sendMessage}
                  selectedModelLabel={selectedModelLabel}
                  selectedTool={selectedTool}
                  setDraft={setDraft}
                  setSelectedTool={setSelectedTool}
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
      </div>
    </WorkspaceShell>
  )
}
