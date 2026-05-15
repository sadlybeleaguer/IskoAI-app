import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, FileText, MessageSquare, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"

const resultTypeIcons = {
  note: FileText,
  chat: MessageSquare,
  calendar: CalendarDays,
}

function SearchResultRow({
  index,
  isActive,
  onSelect,
  result,
}) {
  const Icon = resultTypeIcons[result.type] ?? Search

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        isActive ? "bg-muted text-foreground" : "hover:bg-muted/70",
      )}
      onMouseEnter={() => onSelect(index, false)}
      onClick={() => onSelect(index, true)}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-medium">{result.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {result.meta}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
          {result.subtitle}
        </span>
      </span>
    </button>
  )
}

export function WorkspaceSearch({
  errorMessage,
  flatResults,
  groupedResults,
  isLoading,
  onClose,
  onSelectResult,
  open,
  query,
  setQuery,
}) {
  const inputRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const hasQuery = Boolean(query.trim())

  const indexedGroups = useMemo(() => {
    let offset = 0

    return groupedResults.map((group) => {
      const items = group.items.map((item) => ({
        ...item,
        flatIndex: offset++,
      }))

      return {
        ...group,
        items,
      }
    })
  }, [groupedResults])

  useEffect(() => {
    if (!open) {
      return
    }

    setActiveIndex(0)

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      flatResults.length
        ? Math.min(currentIndex, flatResults.length - 1)
        : 0,
    )
  }, [flatResults.length])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) {
    return null
  }

  const handleSelectResult = (index, shouldNavigate) => {
    setActiveIndex(index)

    if (shouldNavigate) {
      const result = flatResults[index]

      if (result) {
        onSelectResult(result)
      }
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault()
      onClose()
      return
    }

    if (!flatResults.length) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((currentIndex) =>
        currentIndex >= flatResults.length - 1 ? 0 : currentIndex + 1,
      )
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((currentIndex) =>
        currentIndex <= 0 ? flatResults.length - 1 : currentIndex - 1,
      )
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const result = flatResults[activeIndex]

      if (result) {
        onSelectResult(result)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/45 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
              placeholder="Search notes, chats, and events"
              aria-label="Search workspace"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close search"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="border-b px-4 py-2 text-xs text-muted-foreground">
          Enter to open, arrow keys to move, Esc to close
        </div>

        <ScrollArea className="max-h-[min(32rem,calc(100vh-10rem))]">
          <div className="px-2 py-2">
            {!hasQuery ? (
              <div className="px-3 py-10 text-sm text-muted-foreground">
                Start typing to search across notes, chats, and calendar events.
              </div>
            ) : isLoading ? (
              <div className="px-3 py-10 text-sm text-muted-foreground">
                Loading search results...
              </div>
            ) : !flatResults.length ? (
              <div className="px-3 py-10 text-sm text-muted-foreground">
                No matching results.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {indexedGroups.map((group) => (
                  <div key={group.type} className="py-1">
                    <div className="px-3 pb-1 text-xs text-muted-foreground">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((result) => (
                        <SearchResultRow
                          key={`${result.type}:${result.id}`}
                          index={result.flatIndex}
                          isActive={activeIndex === result.flatIndex}
                          onSelect={handleSelectResult}
                          result={result}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {errorMessage ? (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  )
}
