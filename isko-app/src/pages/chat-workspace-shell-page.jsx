import { MessageSquarePlus, FileText, Ghost } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatComposer, ChatModelMenu } from "@/components/chat/chat-composer"
import { ChatEmptyState, ChatThreadView } from "@/components/chat/chat-content"
import { ChatNotePicker } from "@/components/chat/chat-note-picker"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatNotesPanel } from "@/components/chat/chat-notes-panel"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useChatWorkspace } from "@/hooks/use-chat-workspace"
import { cn } from "@/utils/cn"

export function ChatWorkspaceShellPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const preferredThreadId = searchParams.get("threadId")
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false)
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
    folderThreads,
    groupedThreads,
    handleComposerKeyDown,
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
    isLoadingModels,
    isEphemeral,
    selectedModelKey,
    selectedModelLabel,
    selectedTool,
    isNotePickerOpen,
    isUploadingFiles,
    selectThread,
    removeAttachedFile,
    removingFileId,
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
    isUpdatingAttachedNote,
    updateFolder,
    updatingFolderId,
  } = useChatWorkspace(user?.id, preferredThreadId)

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
          folderThreads={folderThreads}
          groupedThreads={groupedThreads}
          isLoadingArchived={isLoadingArchived}
          isLoadingFolders={isLoadingFolders}
          isLoadingThreads={isLoadingThreads}
          moveThreadToFolder={moveThreadToFolder}
          onArchiveThread={(threadId) => {
            if (preferredThreadId === threadId || activeThreadId === threadId) {
              setSearchParams({}, { replace: true })
            }
            void archiveThread(threadId)
          }}
          onRestoreThread={restoreThread}
          onSelectThread={handleSelectThread}
          updateFolder={updateFolder}
          updatingFolderId={updatingFolderId}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.035),_transparent_52%)]">
          {activeThread ? (
            <>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <ChatThreadView
                    activeThread={activeThread}
                    attachedFiles={attachedFiles}
                    endOfMessagesRef={endOfMessagesRef}
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
                    onToggleEphemeral={handleToggleEphemeral}
                    onSubmit={sendMessage}
                    removingFileId={removingFileId}
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
                    onToggleEphemeral={handleToggleEphemeral}
                    onSubmit={sendMessage}
                    removingFileId={removingFileId}
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

        {isNotesPanelOpen && <ChatNotesPanel />}
      </div>
    </WorkspaceShell>
  )
}
