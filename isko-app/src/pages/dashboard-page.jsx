import { useEffect } from "react"
import { UserPlus } from "lucide-react"

import { DashboardMetrics } from "@/components/admin/dashboard-metrics"
import { UserEditorCard } from "@/components/admin/user-editor-card"
import { UserListPanel } from "@/components/admin/user-list-panel"
import { Button } from "@/components/ui/button"
import { AdminShell } from "@/components/layout/admin-shell"
import { useAuth } from "@/contexts/auth-context"
import {
  roleOptions,
  statusOptions,
  useDashboardUsers,
} from "@/hooks/use-dashboard-users"

export function DashboardPage() {
  const { profile, refreshProfile, session, userEmail } = useAuth()
  const {
    draft,
    feedback,
    filteredUsers,
    formMode,
    handleArchive,
    handleDelete,
    handleDraftChange,
    handleNewUser,
    handleRestore,
    handleSubmit,
    isEditingSelf,
    isLoadingUsers,
    isSubmitting,
    loadUsers,
    resetForm,
    roleFilter,
    searchTerm,
    setRoleFilter,
    setSearchTerm,
    setStatusFilter,
    startEditing,
    stats,
    statusFilter,
    usersError,
  } = useDashboardUsers({
    profileId: profile?.id,
    refreshProfile,
    session,
  })

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  return (
    <AdminShell
      headerActions={
        <Button type="button" variant="outline" onClick={handleNewUser}>
          <UserPlus data-icon="inline-start" />
          New user
        </Button>
      }
      headerContent={
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-medium">Users</h1>
          <p className="text-xs text-muted-foreground">
            Manage access, archive accounts, restore archived users, and permanently delete accounts.
          </p>
        </div>
      }
      userEmail={userEmail}
    >
      <DashboardMetrics stats={stats} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_22rem]">
        <section className="min-w-0">
          <UserListPanel
            currentUserId={profile?.id}
            feedback={feedback}
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
            setRoleFilter={setRoleFilter}
            setSearchTerm={setSearchTerm}
            setStatusFilter={setStatusFilter}
            statusFilter={statusFilter}
            statusOptions={statusOptions}
            usersError={usersError}
          />
        </section>

        <aside className="min-w-0">
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
    </AdminShell>
  )
}
