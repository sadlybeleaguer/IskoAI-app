import { useState } from "react"
import { Plus, Archive, ChevronDown, ChevronRight } from "lucide-react"

import { ChatFolderDialog } from "./chat-folder-dialog"
import { ChatFolderItem } from "./chat-folder-item"
import { ChatThreadItem } from "./chat-thread-item"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function ChatSidebarSkeleton() {
  return (
    <div className="grid gap-4 px-3" role="status" aria-label="Loading chats">
      <div className="grid gap-2">
        <Skeleton className="h-3 w-20" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="grid gap-2 rounded-lg px-1 py-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        ))}
      </div>
      <div className="grid gap-2 border-t border-border/50 pt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  )
}

function ChatArchiveSkeleton() {
  return (
    <div className="grid gap-2 py-2" role="status" aria-label="Loading archive">
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function ChatSidebar({
  activeThreadId,
  archivedThreads = [],
  createFolder,
  deleteFolder,
  deleteThreadPermanent,
  deletingThreadId,
  folders = [],
  getFolderFiles,
  folderThreads = new Map(),
  groupedThreads = [],
  isLoadingArchived,
  isLoadingAvailableNotes,
  isLoadingFolderFiles,
  isLoadingFolders,
  isLoadingThreads,
  isUploadingFolderFiles,
  loadAvailableNotes,
  loadFolderFiles,
  moveThreadToFolder,
  onArchiveThread,
  onRestoreThread,
  onSelectThread,
  availableNotes = [],
  removeFolderFile,
  removingFolderFileId = "",
  updateFolder,
  uploadFolderFiles,
  updatingFolderId,
  validateFiles,
}) {
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false)
  const [isFoldersSectionExpanded, setIsFoldersSectionExpanded] = useState(true)
  const [isChatsSectionExpanded, setIsChatsSectionExpanded] = useState(true)
  const [editingFolder, setEditingFolder] = useState(null)
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)

  const openCreateFolderDialog = () => {
    setEditingFolder(null)
    setIsFolderDialogOpen(true)
  }

  const openFolderSettings = (folder) => {
    setEditingFolder(folder)
    setIsFolderDialogOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-2 py-3">
      {/* Folders Section */}
      <div className="flex flex-col gap-0.5">
        <div className="group flex items-center justify-between px-2">
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center gap-2 rounded-lg py-2 text-left text-sm font-semibold text-foreground/90 transition-colors hover:bg-muted/50",
            )}
            onClick={() => setIsFoldersSectionExpanded(!isFoldersSectionExpanded)}
          >
            {isFoldersSectionExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground/70" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground/70" />
            )}
            <span>Folders</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openCreateFolderDialog()
            }}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="New Folder"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {isFoldersSectionExpanded && (
          <div className="flex flex-col gap-1 px-2 pt-1">
            {isLoadingFolders ? (
              <div className="px-2 py-1"><Skeleton className="h-4 w-20" /></div>
            ) : folders.length === 0 ? (
              <p className="px-6 py-2 text-xs text-muted-foreground/60 italic">
                No folders created
              </p>
            ) : (
              folders.map((folder) => (
                <ChatFolderItem
                  key={folder.id}
                  folder={folder}
                  onDelete={deleteFolder}
                  onOpenSettings={openFolderSettings}
                  onUpdate={updateFolder}
                  updatingFolderId={updatingFolderId}
                >
                  {(folderThreads.get(folder.id) || []).map((thread) => (
                    <ChatThreadItem
                      key={thread.id}
                      activeThreadId={activeThreadId}
                      deletingThreadId={deletingThreadId}
                      folders={folders}
                      onArchive={onArchiveThread}
                      onDeletePermanent={deleteThreadPermanent}
                      onMoveToFolder={moveThreadToFolder}
                      onSelect={onSelectThread}
                      thread={thread}
                    />
                  ))}
                  {(!folderThreads.has(folder.id) || folderThreads.get(folder.id).length === 0) && (
                    <p className="py-2 text-center text-xs text-muted-foreground/60 italic">
                      Empty folder
                    </p>
                  )}
                </ChatFolderItem>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chats (Recents) Section */}
      <div className="flex flex-col gap-0.5">
        <div className="px-2">
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm font-semibold text-foreground/90 transition-colors hover:bg-muted/50",
            )}
            onClick={() => setIsChatsSectionExpanded(!isChatsSectionExpanded)}
          >
            {isChatsSectionExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground/70" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground/70" />
            )}
            <span>Chats</span>
          </button>
        </div>

        {isChatsSectionExpanded && (
          <div className="flex flex-col gap-1 px-2 pt-1">
            {isLoadingThreads ? (
              <ChatSidebarSkeleton />
            ) : groupedThreads.length === 0 ? (
              <p className="px-6 py-2 text-xs text-muted-foreground/60 italic">
                No recent chats
              </p>
            ) : (
              groupedThreads.map((group) => (
                <div key={group.label} className="flex flex-col gap-0.5">
                  <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    {group.label}
                  </p>
                  {group.items.map((thread) => (
                    <ChatThreadItem
                      key={thread.id}
                      activeThreadId={activeThreadId}
                      deletingThreadId={deletingThreadId}
                      folders={folders}
                      onArchive={onArchiveThread}
                      onDeletePermanent={deleteThreadPermanent}
                      onMoveToFolder={moveThreadToFolder}
                      onSelect={onSelectThread}
                      thread={thread}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Archive Section */}
      <div className="flex flex-col gap-1 pt-4 border-t border-border/50 px-2">
          <button
            type="button"
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50",
              isArchiveExpanded && "bg-muted/30"
            )}
            onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
          >
            {isArchiveExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground/70" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground/70" />
            )}
            <Archive className="size-4 text-muted-foreground/70" />
            <span className="flex-1">Archive</span>
            {archivedThreads.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] group-hover:bg-background">
                {archivedThreads.length}
              </span>
            )}
          </button>

          {isArchiveExpanded && (
            <div className="relative flex flex-col gap-0.5 pl-2 ml-[15px] border-l border-border/40 py-1">
              {isLoadingArchived ? (
                <ChatArchiveSkeleton />
              ) : archivedThreads.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground italic pl-2">No archived chats</p>
              ) : (
                archivedThreads.map((thread) => (
                  <ChatThreadItem
                    key={thread.id}
                    isArchived
                    activeThreadId={activeThreadId}
                    deletingThreadId={deletingThreadId}
                    onDeletePermanent={deleteThreadPermanent}
                    onRestore={onRestoreThread}
                    onSelect={onSelectThread}
                    thread={thread}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <ChatFolderDialog
        availableNotes={availableNotes}
        createFolder={createFolder}
        folder={editingFolder}
        getFolderFiles={getFolderFiles}
        isLoadingFolderFiles={isLoadingFolderFiles(editingFolder?.id ?? "")}
        isLoadingNotes={isLoadingAvailableNotes}
        isUploadingFiles={isUploadingFolderFiles(editingFolder?.id ?? "")}
        loadAvailableNotes={loadAvailableNotes}
        loadFolderFiles={loadFolderFiles}
        onOpenChange={(open) => {
          setIsFolderDialogOpen(open)
          if (!open) {
            setEditingFolder(null)
          }
        }}
        open={isFolderDialogOpen}
        removeFolderFile={removeFolderFile}
        removingFileId={removingFolderFileId}
        updateFolder={updateFolder}
        uploadFolderFiles={uploadFolderFiles}
        validateFiles={validateFiles}
      />
    </>
  )
}
