import { useEffect } from "react"
import { Brain } from "lucide-react"

import { DashboardMetrics } from "@/components/admin/dashboard-metrics"
import { UserActionDialog } from "@/components/admin/user-action-dialog"
import { UserEditorCard } from "@/components/admin/user-editor-card"
import { UserListPanel } from "@/components/admin/user-list-panel"
import { AdminShell } from "@/components/layout/admin-shell"
import { useAuth } from "@/context/auth-context"
import {
  roleOptions,
  statusOptions,
  useDashboardUsers,
} from "@/hooks/use-dashboard-users"

function getGreetingByHour(date = new Date()) {
  const hour = date.getHours()

  if (hour < 12) {
    return "Good morning"
  }

  if (hour < 18) {
    return "Good afternoon"
  }

  return "Good evening"
}

function getDisplayName(profile, userEmail) {
  const fullName = profile?.full_name?.trim()

  if (fullName) {
    return fullName.split(/\s+/)[0]
  }

  return userEmail?.split("@")[0] || "there"
}

export function DashboardPage() {
  const { profile, refreshProfile, session, userEmail } = useAuth()
  const {
    confirmPendingUserAction,
    deleteConfirmationValue,
    draft,
    filteredUsers,
    formMode,
    handleArchive,
    handleConfirmationOpenChange,
    handleDeleteConfirmationChange,
    handleDelete,
    handleDraftChange,
    handleRestore,
    handleSubmit,
    isEditingSelf,
    isConfirmationOpen,
    isLoadingUsers,
    isSubmitting,
    loadUsers,
    pendingUserAction,
    resetForm,
    roleFilter,
    searchTerm,
    setRoleFilter,
    setSearchTerm,
    setStatusFilter,
    startEditing,
    stats,
    statusFilter,
  } = useDashboardUsers({
    profileId: profile?.id,
    refreshProfile,
    session,
  })
  const greeting = getGreetingByHour()
  const displayName = getDisplayName(profile, userEmail)

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  return (
    <AdminShell
      headerContent={
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/20">
            <Brain className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-medium tracking-tight">
              {greeting}, {displayName}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Welcome to IskoAI Dashboard.
            </p>
          </div>
        </div>
      }
      userEmail={userEmail}
    >
      <div className="flex flex-col gap-5 xl:min-h-0 xl:flex-1">
        <DashboardMetrics isLoading={isLoadingUsers} stats={stats} />

        <div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.4fr)_22rem]">
          <section className="min-w-0 xl:min-h-0">
            <UserListPanel
              currentUserId={profile?.id}
              filteredUsers={filteredUsers}
              isLoadingUsers={isLoadingUsers}
              isSubmitting={isSubmitting}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onEdit={startEditing}
              onRefresh={loadUsers}
              onRestore={handleRestore}
              roleFilter={roleFilter}
              roleOptions={roleOptions}
              searchTerm={searchTerm}
              selectedUserId={formMode === "edit" ? draft.userId : ""}
              setRoleFilter={setRoleFilter}
              setSearchTerm={setSearchTerm}
              setStatusFilter={setStatusFilter}
              statusFilter={statusFilter}
              statusOptions={statusOptions}
            />
          </section>

          <aside className="min-w-0 xl:min-h-0">
            <UserEditorCard
              draft={draft}
              formMode={formMode}
              isEditingSelf={isEditingSelf}
              isSubmitting={isSubmitting}
              onDraftChange={handleDraftChange}
              onReset={resetForm}
              onSubmit={handleSubmit}
              roleOptions={roleOptions}
              statusOptions={statusOptions}
            />
          </aside>
        </div>

        <UserActionDialog
          action={pendingUserAction?.action ?? ""}
          confirmationValue={deleteConfirmationValue}
          isSubmitting={isSubmitting}
          onConfirmationChange={handleDeleteConfirmationChange}
          onConfirm={confirmPendingUserAction}
          onOpenChange={handleConfirmationOpenChange}
          open={isConfirmationOpen}
          user={pendingUserAction?.user ?? null}
        />
      </div>
    </AdminShell>
  )
}
