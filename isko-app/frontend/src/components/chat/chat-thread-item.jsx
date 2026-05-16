import { MoreHorizontal, Archive, RefreshCw, Trash2, FolderInput } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRelativeTime } from "@/utils/chat"
import { cn } from "@/lib/utils"

export function ChatThreadItem({
  activeThreadId,
  deletingThreadId,
  folders = [],
  isArchived = false,
  onArchive,
  onDeletePermanent,
  onMoveToFolder,
  onRestore,
  onSelect,
  thread,
}) {
  const isActive = activeThreadId === thread.id
  const isDeleting = deletingThreadId === thread.id

  return (
    <div
      className={cn(
        "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 transition-colors",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-foreground hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center rounded-lg px-2 py-1.5 text-left"
        onClick={() => onSelect(thread.id)}
      >
        <span className="min-w-0 flex-1 truncate text-sm">{thread.title}</span>
      </button>
      <div className="flex items-center justify-end gap-1.5 pr-2 text-xs text-muted-foreground">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "hidden size-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 group-hover:flex data-[state=open]:flex hover:bg-background hover:text-foreground focus-visible:outline-none",
                isActive && "flex"
              )}
              aria-label="Thread actions"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isArchived ? (
              <>
                <DropdownMenuItem onClick={() => onRestore(thread.id)}>
                  <RefreshCw className="mr-2 size-4" />
                  <span>Restore</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeletePermanent(thread.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 size-4" />
                  <span>Delete permanently</span>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="mr-2 size-4" />
                    <span>Move to folder</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem onClick={() => onMoveToFolder(thread.id, null)}>
                      <span className={cn(!thread.folder_id && "font-bold")}>No folder</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => onMoveToFolder(thread.id, folder.id)}
                      >
                        <span className={cn(thread.folder_id === folder.id && "font-bold")}>
                          {folder.title}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onArchive(thread.id)}
                  disabled={isDeleting}
                >
                  <Archive className="mr-2 size-4" />
                  <span>Archive</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeletePermanent(thread.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 size-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
