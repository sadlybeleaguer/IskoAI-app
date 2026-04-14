import { useEffect } from "react"

import { ModelManagementCard } from "@/components/admin/model-management-card"
import { AdminShell } from "@/components/layout/admin-shell"
import { useAuth } from "@/contexts/auth-context"
import { useAdminChatModels } from "@/hooks/use-admin-chat-models"

export function ChatModelsPage() {
  const { session, userEmail } = useAuth()
  const {
    isLoadingModels,
    loadModels,
    models,
    modelsError,
    modelsFeedback,
    updateModelAvailability,
    updatingModelKey,
  } = useAdminChatModels({ session })

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  return (
    <AdminShell
      headerContent={
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-medium">Chat models</h1>
          <p className="text-xs text-muted-foreground">
            Control which models appear in the chat model picker for users.
          </p>
        </div>
      }
      userEmail={userEmail}
    >
      <div className="grid gap-5 xl:max-w-3xl">
        <ModelManagementCard
          isLoadingModels={isLoadingModels}
          models={models}
          modelsError={modelsError}
          modelsFeedback={modelsFeedback}
          onRefresh={loadModels}
          onToggleAvailability={updateModelAvailability}
          updatingModelKey={updatingModelKey}
        />
      </div>
    </AdminShell>
  )
}
