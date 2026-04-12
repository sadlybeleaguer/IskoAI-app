import { Archive, RefreshCcw, Search, Trash2, UserCog } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${className}`}
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${className}`}
    >
      {value}
    </span>
  )
}

function FilterSelect({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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

export function UserListPanel({
  currentUserId,
  feedback,
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
  setRoleFilter,
  setSearchTerm,
  setStatusFilter,
  statusFilter,
  statusOptions,
  usersError,
}) {
  return (
    <Card className="border-white/60 bg-white/82 py-0 shadow-[0_30px_120px_-44px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="gap-4 border-b border-border/70 px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-2xl tracking-tight">
              Managed users
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl leading-6">
              Use the search and filters to review active accounts, archived
              accounts, and elevated access.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {filteredUsers.length} shown
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full px-3"
              onClick={onRefresh}
              disabled={isLoadingUsers}
            >
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="role-filter">Role</Label>
            <FilterSelect
              id="role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              options={[{ value: "all", label: "All roles" }, ...roleOptions]}
            />
          </div>

          <div className="space-y-2">
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

      <CardContent className="space-y-4 px-6 py-6">
        {feedback.message ? (
          <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
            <AlertTitle>
              {feedback.type === "error" ? "Request failed" : "Success"}
            </AlertTitle>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        ) : null}

        {usersError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load users</AlertTitle>
            <AlertDescription>{usersError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoadingUsers ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-5 py-10 text-center text-sm text-muted-foreground">
            Loading user profiles...
          </div>
        ) : null}

        {!isLoadingUsers && !filteredUsers.length ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-5 py-10 text-center text-sm text-muted-foreground">
            No users matched the current filters.
          </div>
        ) : null}

        {!isLoadingUsers &&
          filteredUsers.map((user) => {
            const isSelf = user.id === currentUserId
            const isArchived = user.status === "archived"

            return (
              <div
                key={user.id}
                className="rounded-[28px] border border-border/70 bg-background/78 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {user.full_name || "No name set"}
                      </h2>
                      <RoleBadge value={user.role} />
                      <StatusBadge value={user.status} />
                      {isSelf ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary ring-1 ring-primary/20">
                          Current session
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{user.email}</p>
                      <p>Created {formatDate(user.created_at)}</p>
                      <p>Updated {formatDate(user.updated_at)}</p>
                      {user.archived_at ? (
                        <p>Archived {formatDate(user.archived_at)}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                    >
                      <UserCog className="size-4" />
                      Edit
                    </Button>

                    {isArchived ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRestore(user)}
                        disabled={isSubmitting}
                      >
                        <RefreshCcw className="size-4" />
                        Restore
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onArchive(user)}
                        disabled={isSubmitting || isSelf}
                      >
                        <Archive className="size-4" />
                        Archive
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(user)}
                      disabled={isSubmitting || isSelf}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
      </CardContent>
    </Card>
  )
}
