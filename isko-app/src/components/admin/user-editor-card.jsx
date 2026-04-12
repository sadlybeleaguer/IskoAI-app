import { ArrowUpRight, UserPlus } from "lucide-react"

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
import { Separator } from "@/components/ui/separator"

function FilterSelect({ id, value, onChange, options, disabled = false }) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function UserEditorCard({
  draft,
  formMode,
  isEditingSelf,
  isSubmitting,
  onDraftChange,
  onReset,
  onSubmit,
  roleOptions,
  statusOptions,
}) {
  return (
    <Card className="border-white/60 bg-white/84 py-0 shadow-[0_30px_120px_-44px_rgba(15,23,42,0.4)] backdrop-blur">
      <CardHeader className="gap-3 border-b border-border/70 px-6 py-6">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          {formMode === "create" ? (
            <UserPlus className="size-5" />
          ) : (
            <ArrowUpRight className="size-5" />
          )}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl tracking-tight">
            {formMode === "create" ? "Create user" : "Edit user"}
          </CardTitle>
          <CardDescription className="leading-6">
            {formMode === "create"
              ? "Provision a new account with a password, role, and initial status."
              : "Update profile details and access level. Archive and delete actions stay in the user list."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6 py-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              placeholder="Jane Doe"
              value={draft.fullName}
              onChange={onDraftChange("fullName")}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="name@company.com"
              value={draft.email}
              onChange={onDraftChange("email")}
              disabled={isSubmitting}
              required
            />
          </div>

          {formMode === "create" ? (
            <div className="space-y-2">
              <Label htmlFor="user-password">Temporary password</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="At least 8 characters"
                value={draft.password}
                onChange={onDraftChange("password")}
                disabled={isSubmitting}
                minLength={8}
                required
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <FilterSelect
                id="user-role"
                value={draft.role}
                onChange={onDraftChange("role")}
                options={roleOptions}
                disabled={isSubmitting || isEditingSelf}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-status">Status</Label>
              <FilterSelect
                id="user-status"
                value={draft.status}
                onChange={onDraftChange("status")}
                options={statusOptions}
                disabled={isSubmitting || isEditingSelf}
              />
            </div>
          </div>

          {isEditingSelf ? (
            <Alert>
              <AlertTitle>Self-protection enabled</AlertTitle>
              <AlertDescription>
                Your own account can update name and email, but role and status
                changes are blocked by policy.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              className="h-11 flex-1 rounded-2xl"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : formMode === "create"
                  ? "Create user"
                  : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={onReset}
              disabled={isSubmitting}
            >
              Clear
            </Button>
          </div>
        </form>

        <Separator />

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Browser reads are limited by RLS, and every mutation runs through
            the protected <code>manage-users</code> Edge Function.
          </p>
          <p>
            Archived users are banned from signing in until restored. Permanent
            delete removes both the auth account and the linked profile.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
