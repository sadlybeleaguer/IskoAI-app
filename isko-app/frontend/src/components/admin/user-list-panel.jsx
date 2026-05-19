import { Archive, RefreshCcw, Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function formatDate(value) {
  if (!value) {
    return "Unknown"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function RoleBadge({ value }) {
  const className =
    value === "superadmin"
      ? "bg-sky-500/12 text-sky-700 ring-sky-500/20"
      : "bg-slate-500/12 text-slate-700 ring-slate-500/20"

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ${className}`}
    >
      {value}
    </span>
  )
}

function StatusBadge({ value }) {
  const className =
    value === "active"
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20"
      : "bg-amber-500/12 text-amber-700 ring-amber-500/20"

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ${className}`}
    >
      {value}
    </span>
  )
}

function FilterSelect({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      value={value}
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function UserListSkeleton() {
  return (
    <div className="grid gap-3" role="status" aria-label="Loading user profiles">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="grid flex-1 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-4 w-52 max-w-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-16 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserListPanel({
  currentUserId,
  filteredUsers,
  isLoadingUsers,
  isSubmitting,
  onArchive,
  onDelete,
  onEdit,
  onRefresh,
  onRestore,
  roleFilter,
  roleOptions,
  searchTerm,
  selectedUserId,
  setRoleFilter,
  setSearchTerm,
  setStatusFilter,
  statusFilter,
  statusOptions,
}) {
  const listContent = (
    <>
      {isLoadingUsers ? <UserListSkeleton /> : null}

      {!isLoadingUsers && !filteredUsers.length ? (
        <div className="rounded-lg border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
          No users matched the current filters.
        </div>
      ) : null}

      {!isLoadingUsers &&
        filteredUsers.map((user) => {
          const isSelf = user.id === currentUserId
          const isArchived = user.status === "archived"
          const isSelected = selectedUserId === user.id

          const handleCardKeyDown = (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onEdit(user)
            }
          }

          const handleActionClick = (callback) => (event) => {
            event.stopPropagation()
            callback(user)
          }

          return (
            <div
              key={user.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onEdit(user)}
              onKeyDown={handleCardKeyDown}
              className={cn(
                "rounded-lg border bg-background p-4 transition-colors outline-none",
                "cursor-pointer hover:border-primary/35 hover:bg-muted/20 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
                isSelected && "border-primary/40 bg-primary/5 ring-1 ring-primary/15",
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-medium">
                      {user.full_name || "No name set"}
                    </h2>
                    <RoleBadge value={user.role} />
                    <StatusBadge value={user.status} />
                    {isSelf ? (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-primary/20">
                        Current session
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1",
                        isSelected
                          ? "bg-primary/10 text-primary ring-primary/20"
                          : "bg-muted text-muted-foreground ring-border",
                      )}
                    >
                      {isSelected ? "Editing" : "Click to edit"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <p>{user.email}</p>
                    <p>Created {formatDate(user.created_at)}</p>
                    <p>Updated {formatDate(user.updated_at)}</p>
                    {user.archived_at ? (
                      <p>Archived {formatDate(user.archived_at)}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isArchived ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleActionClick(onRestore)}
                      disabled={isSubmitting}
                    >
                      <RefreshCcw data-icon="inline-start" />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleActionClick(onArchive)}
                      disabled={isSubmitting || isSelf}
                    >
                      <Archive data-icon="inline-start" />
                      Archive
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleActionClick(onDelete)}
                    disabled={isSubmitting || isSelf}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
    </>
  )

  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.08)] xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <CardHeader className="gap-4 border-b px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-base font-medium">Managed users</CardTitle>
            <CardDescription className="mt-1 max-w-2xl leading-6">
              Use the search and filters to review active accounts, archived
              accounts, and elevated access.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center px-1 text-sm text-muted-foreground">
              {isLoadingUsers ? <Skeleton className="h-4 w-16" /> : `${filteredUsers.length} shown`}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoadingUsers}
            >
              <RefreshCcw data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search-users">Search users</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-users"
                className="pl-9"
                placeholder="Search by name, email, role, or status"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role-filter">Role</Label>
            <FilterSelect
              id="role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              options={[{ value: "all", label: "All roles" }, ...roleOptions]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status-filter">Status</Label>
            <FilterSelect
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[{ value: "all", label: "All statuses" }, ...statusOptions]}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-5 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
        <div className="flex flex-col gap-4 xl:hidden">
          {listContent}
        </div>

        <ScrollArea className="hidden xl:block xl:min-h-0 xl:flex-1">
          <div className="flex flex-col gap-4 pr-4">
            {listContent}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
