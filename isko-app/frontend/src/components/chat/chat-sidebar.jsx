import { useState } from "react"
import { FolderPlus, Archive, ChevronDown, ChevronRight } from "lucide-react"

import { ChatFolderItem } from "./chat-folder-item"
import { ChatThreadItem } from "./chat-thread-item"

export function ChatSidebar({
  activeThreadId,
  archivedThreads = [],
  createFolder,
  deleteFolder,
  deleteThreadPermanent,
  deletingThreadId,
  folders = [],
  folderThreads = new Map(),
  groupedThreads = [],
  isLoadingArchived,
  isLoadingFolders,
  isLoadingThreads,
  moveThreadToFolder,
  onArchiveThread,
  onRestoreThread,
  onSelectThread,
  updateFolder,
  updatingFolderId,
}) {
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-6 py-3">
      {/* Action Header */}
      <div className="flex items-center justify-between px-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Your Chats
        </h2>
        <button
          type="button"
          onClick={() => {
            const title = window.prompt("Folder name:")
            if (title?.trim()) createFolder(title.trim())
          }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <FolderPlus className="size-3.5" />
          <span>New Folder</span>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {isLoadingThreads || isLoadingFolders ? (
          <p className="px-3 text-sm text-muted-foreground">Loading chats...</p>
        ) : null}

        {!isLoadingThreads && !groupedThreads.length && !folders.length ? (
          <p className="px-3 text-sm text-muted-foreground">
            Chats will appear here after the first saved message.
          </p>
        ) : null}

        {/* Custom Folders */}
        {folders.map((folder) => (
          <ChatFolderItem
            key={folder.id}
            folder={folder}
            onDelete={deleteFolder}
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
        ))}

        {/* Unfoldered Threads (Standard Grouping) */}
        {groupedThreads.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
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
        ))}

        {/* Archive Section */}
        <div className="flex flex-col gap-1 pt-4 border-t border-border/50">
          <button
            type="button"
            className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
          >
            {isArchiveExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            <Archive className="size-3.5" />
            <span className="flex-1">Archive</span>
            {archivedThreads.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] group-hover:bg-background">
                {archivedThreads.length}
              </span>
            )}
          </button>

          {isArchiveExpanded && (
            <div className="flex flex-col gap-1 pl-4 pt-1">
              {isLoadingArchived ? (
                <p className="py-2 text-xs text-muted-foreground italic">Loading archive...</p>
              ) : archivedThreads.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground italic">No archived chats</p>
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
    </div>
  )
}
