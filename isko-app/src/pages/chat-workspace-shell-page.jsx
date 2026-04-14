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
    pageError,
    selectedModel,
    selectedTool,
    selectThread,
    sendMessage,
    setComposerNotice,
    setDraft,
    setSelectedModel,
    setSelectedTool,
  } = useChatWorkspace(user?.id)

  const alerts = pageError ? (
    <Alert variant="destructive">
      <AlertTitle>Chat unavailable</AlertTitle>
      <AlertDescription>{pageError}</AlertDescription>
    </Alert>
  ) : null

  return (
    <WorkspaceShell
      alerts={alerts}
      headerContent={
        <div className="min-w-0">
          <ChatModelMenu
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
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
            <ChatEmptyState selectedModel={selectedModel}>
              <ChatComposer
                composerNotice={composerNotice}
                draft={draft}
                isEmptyState
                isSending={isSending}
                onComposerNotice={setComposerNotice}
                onKeyDown={handleComposerKeyDown}
                onPromptClick={setDraft}
                onSubmit={sendMessage}
                selectedModel={selectedModel}
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
                isSending={isSending}
                onComposerNotice={setComposerNotice}
                onKeyDown={handleComposerKeyDown}
                onPromptClick={setDraft}
                onSubmit={sendMessage}
                selectedModel={selectedModel}
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
