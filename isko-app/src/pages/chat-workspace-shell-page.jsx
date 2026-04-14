import { MessageSquarePlus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatComposer, ChatModelMenu } from "@/components/chat/chat-composer"
import { ChatEmptyState, ChatThreadView } from "@/components/chat/chat-content"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { WorkspaceShell } from "@/components/layout/workspace-shell"
import { useAuth } from "@/contexts/auth-context"
import { useChatWorkspace } from "@/hooks/use-chat-workspace"

export function ChatWorkspaceShellPage() {
  const { user } = useAuth()
  const {
    activeThread,
    activeThreadId,
    availableModels,
    composerNotice,
    createNewChat,
    draft,
    endOfMessagesRef,
    groupedThreads,
    handleComposerKeyDown,
    isLoadingMessages,
    isLoadingThreads,
    isPendingThread,
    isSending,
    messages,
    modelsError,
    pageError,
    hasAvailableModels,
    isLoadingModels,
    selectedModelKey,
    selectedModelLabel,
    selectedTool,
    selectThread,
    sendMessage,
    setComposerNotice,
    setDraft,
    setSelectedModelKey,
    setSelectedTool,
  } = useChatWorkspace(user?.id)

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
        onClick: createNewChat,
      }}
      sidebarContent={
        <ChatSidebar
          activeThreadId={activeThreadId}
          groupedThreads={groupedThreads}
          isLoadingThreads={isLoadingThreads}
          onSelectThread={selectThread}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          {activeThread ? (
            <ChatThreadView
              activeThread={activeThread}
              endOfMessagesRef={endOfMessagesRef}
              isLoadingMessages={isLoadingMessages}
              isPendingThread={isPendingThread}
              messages={messages}
              onNewChat={createNewChat}
            />
          ) : (
            <ChatEmptyState selectedModelLabel={selectedModelLabel}>
              <ChatComposer
                composerNotice={composerNotice}
                draft={draft}
                isEmptyState
                isLoadingModels={isLoadingModels}
                isSending={isSending}
                hasAvailableModels={hasAvailableModels}
                modelStatusMessage={modelStatusMessage}
                onComposerNotice={setComposerNotice}
                onKeyDown={handleComposerKeyDown}
                onPromptClick={setDraft}
                onSubmit={sendMessage}
                selectedModelLabel={selectedModelLabel}
                selectedTool={selectedTool}
                setDraft={setDraft}
                setSelectedTool={setSelectedTool}
              />
            </ChatEmptyState>
          )}
        </ScrollArea>

        {activeThread ? (
          <div className="border-t bg-background">
            <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
              <ChatComposer
                composerNotice={composerNotice}
                draft={draft}
                isLoadingModels={isLoadingModels}
                isSending={isSending}
                hasAvailableModels={hasAvailableModels}
                modelStatusMessage={modelStatusMessage}
                onComposerNotice={setComposerNotice}
                onKeyDown={handleComposerKeyDown}
                onPromptClick={setDraft}
                onSubmit={sendMessage}
                selectedModelLabel={selectedModelLabel}
                selectedTool={selectedTool}
                setDraft={setDraft}
                setSelectedTool={setSelectedTool}
              />
            </div>
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  )
}
