import { useEffect } from "react"

import { ModelMetrics } from "@/components/admin/model-metrics"
import { ModelManagementCard } from "@/components/admin/model-management-card"
import { AdminShell } from "@/components/layout/admin-shell"
import { useAuth } from "@/context/auth-context"
import { useAdminChatModels } from "@/hooks/use-admin-chat-models"

export function ChatModelsPage() {
  const { session, userEmail } = useAuth()
  const {
    filteredModels,
    isLoadingModels,
    loadModels,
    modelsError,
    providerFilter,
    providerOptions,
    searchTerm,
    stats,
    setProviderFilter,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
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
          <h1 className="text-base font-medium tracking-tight">Chat models</h1>
          <p className="text-sm text-muted-foreground">
            Review model availability and control what users can select in chat.
          </p>
        </div>
      }
      userEmail={userEmail}
    >
      <div className="flex flex-col gap-5 xl:min-h-0 xl:flex-1">
        <ModelMetrics isLoading={isLoadingModels} stats={stats} />

        <section className="min-w-0 xl:min-h-0 xl:flex-1">
          <ModelManagementCard
            filteredModels={filteredModels}
            isLoadingModels={isLoadingModels}
            modelsError={modelsError}
            onRefresh={loadModels}
            onToggleAvailability={updateModelAvailability}
            providerFilter={providerFilter}
            providerOptions={providerOptions}
            searchTerm={searchTerm}
            setProviderFilter={setProviderFilter}
            setSearchTerm={setSearchTerm}
            setStatusFilter={setStatusFilter}
            statusFilter={statusFilter}
            updatingModelKey={updatingModelKey}
          />
        </section>
      </div>
    </AdminShell>
  )
}
