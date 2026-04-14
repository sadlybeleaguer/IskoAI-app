import { formatRelativeTime } from "@/utils/chat"
import { cn } from "@/utils/cn"

export function ChatSidebar({
  activeThreadId,
  groupedThreads,
  isLoadingThreads,
  onSelectThread,
}) {
  return (
    <div className="flex flex-col gap-4 py-3">
      {isLoadingThreads ? (
        <p className="px-3 text-sm text-muted-foreground">Loading chats...</p>
      ) : null}

      {!isLoadingThreads && !groupedThreads.length ? (
        <p className="px-3 text-sm text-muted-foreground">
          Chats will appear here after the first saved message.
        </p>
      ) : null}

      {groupedThreads.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 py-1 text-xs text-muted-foreground">{group.label}</p>
          {group.items.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                activeThreadId === thread.id
                  ? "bg-background text-foreground"
                  : "text-foreground hover:bg-muted",
              )}
              onClick={() => onSelectThread(thread.id)}
            >
              <span className="min-w-0 flex-1 truncate text-sm">{thread.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(thread.updated_at)}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
