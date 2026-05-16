import { useState } from "react"
import { ChevronDown, ChevronRight, Folder, MoreVertical, Edit2, Trash2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export function ChatFolderItem({
  children,
  folder,
  onDelete,
  onUpdate,
  updatingFolderId,
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [newTitle, setNewTitle] = useState(folder.title)

  const isUpdating = updatingFolderId === folder.id

  const handleUpdate = (e) => {
    e?.preventDefault()
    if (newTitle.trim() && newTitle !== folder.title) {
      onUpdate(folder.id, newTitle.trim())
    }
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="group flex items-center gap-1 rounded-lg px-1 text-muted-foreground transition-colors hover:text-foreground">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 rounded-lg py-2 text-left text-xs font-medium uppercase tracking-wider"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
          <Folder className="size-3.5" />
          {isEditing ? (
            <form onSubmit={handleUpdate} className="flex-1 pr-2" onClick={(e) => e.stopPropagation()}>
              <Input
                autoFocus
                className="h-6 px-1 py-0 text-xs"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleUpdate}
              />
            </form>
          ) : (
            <span className="truncate">{folder.title}</span>
          )}
        </button>

        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden size-6 items-center justify-center rounded-md transition-colors hover:bg-muted group-hover:flex data-[state=open]:flex"
                aria-label="Folder actions"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 size-3.5" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(folder.id)}
                disabled={isUpdating}
              >
                <Trash2 className="mr-2 size-3.5" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-1 pl-4">
          {children}
        </div>
      )}
    </div>
  )
}
