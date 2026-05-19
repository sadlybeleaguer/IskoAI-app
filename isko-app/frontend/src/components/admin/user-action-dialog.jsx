import { Archive, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function UserActionDialog({
  action,
  confirmationValue,
  isSubmitting,
  onConfirmationChange,
  onConfirm,
  onOpenChange,
  open,
  user,
}) {
  const isDelete = action === "delete"
  const isArchive = action === "archive"
  const typedValue = confirmationValue.trim()
  const requiresTypedConfirmation = isDelete
  const emailMatches = typedValue === (user?.email ?? "")
  const showMismatch = requiresTypedConfirmation && typedValue.length > 0 && !emailMatches
  const confirmDisabled =
    isSubmitting || (requiresTypedConfirmation && !emailMatches)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <div
            className={cn(
              "mb-2 flex size-10 items-center justify-center rounded-lg border",
              isDelete
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {isDelete ? <Trash2 data-icon="inline-start" /> : <Archive data-icon="inline-start" />}
          </div>
          <AlertDialogTitle>
            {isDelete ? "Delete user permanently?" : "Archive user?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDelete
              ? `This permanently deletes ${user?.email ?? "this user"} and cannot be undone.`
              : `Archive ${user?.email ?? "this user"} to block sign-in until the account is restored.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isDelete ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-user-confirmation">Type the user email to continue</Label>
            <Input
              id="delete-user-confirmation"
              value={confirmationValue}
              onChange={onConfirmationChange}
              aria-invalid={showMismatch}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={user?.email ?? ""}
            />
            <p
              className={cn(
                "text-sm",
                showMismatch ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {showMismatch
                ? "The email must match exactly."
                : `Enter ${user?.email ?? "the user email"} to enable permanent deletion.`}
            </p>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              isArchive && "bg-amber-600 text-white hover:bg-amber-600/90 dark:bg-amber-500 dark:text-amber-950",
            )}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
            disabled={confirmDisabled}
          >
            {isSubmitting
              ? isDelete
                ? "Deleting..."
                : "Archiving..."
              : isDelete
                ? "Delete permanently"
                : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
