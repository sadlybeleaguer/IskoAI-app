import { createElement } from "react"
import { Loader2, TriangleAlert } from "lucide-react"

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
import { cn } from "@/lib/utils"

const iconContainerVariants = {
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

const actionVariants = {
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  warning:
    "bg-amber-600 text-white hover:bg-amber-600/90 dark:bg-amber-500 dark:text-amber-950",
}

export function ActionConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  description,
  icon: Icon = TriangleAlert,
  isSubmitting = false,
  onConfirm,
  onOpenChange,
  open,
  title,
  tone = "destructive",
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSubmitting) {
          return
        }

        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <div
            className={cn(
              "mb-2 flex size-10 items-center justify-center rounded-lg border",
              iconContainerVariants[tone] ?? iconContainerVariants.destructive,
            )}
          >
            {createElement(Icon, { "data-icon": "inline-start" })}
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(actionVariants[tone] ?? actionVariants.destructive)}
            disabled={isSubmitting}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            {isSubmitting ? `${confirmLabel}...` : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
