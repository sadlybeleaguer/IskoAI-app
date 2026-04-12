import { useCallback, useEffect, useMemo, useState } from "react"
import { Menu, UserPlus } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { DashboardMetrics } from "@/components/admin/dashboard-metrics"
import { UserEditorCard } from "@/components/admin/user-editor-card"
import { UserListPanel } from "@/components/admin/user-list-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { invokeManageUsers } from "@/lib/admin"
import { supabase } from "@/lib/supabase"

const roleOptions = [
  { value: "user", label: "User" },
  { value: "superadmin", label: "Superadmin" },
]

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
]

const emptyDraft = {
  userId: "",
  email: "",
  fullName: "",
  password: "",
  role: "user",
  status: "active",
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }

  return "Unable to complete the request."
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { profile, refreshProfile, session, userEmail } = useAuth()
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState("")
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signOutError, setSignOutError] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [formMode, setFormMode] = useState("create")
  const [draft, setDraft] = useState(emptyDraft)
  const [isNavOpen, setIsNavOpen] = useState(false)

  const loadUsers = useCallback(async () => {
    if (!supabase) {
      setUsers([])
      setUsersError("Supabase is not configured.")
      setIsLoadingUsers(false)
      return
    }

    setIsLoadingUsers(true)

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, status, archived_at, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) {
      setUsers([])
      setUsersError(error.message)
      setIsLoadingUsers(false)
      return
    }

    setUsers(data ?? [])
    setUsersError("")
    setIsLoadingUsers(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      archived: users.filter((user) => user.status === "archived").length,
      superadmins: users.filter((user) => user.role === "superadmin").length,
    }),
    [users],
  )

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false
      }

      if (statusFilter !== "all" && user.status !== statusFilter) {
        return false
      }

      if (!query) {
        return true
      }

      return [user.full_name, user.email, user.role, user.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [roleFilter, searchTerm, statusFilter, users])

  const isEditingSelf = formMode === "edit" && draft.userId === profile?.id

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    setIsSigningOut(true)
    setSignOutError("")

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      navigate("/sign-in", { replace: true })
    } catch (error) {
      setSignOutError(getErrorMessage(error))
    } finally {
      setIsSigningOut(false)
    }
  }

  const resetForm = () => {
    setFormMode("create")
    setDraft(emptyDraft)
  }

  const handleNewUser = () => {
    resetForm()
    setFeedback({ type: "", message: "" })
  }

  const startEditing = (user) => {
    setFormMode("edit")
    setDraft({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      password: "",
      role: user.role,
      status: user.status,
    })
    setFeedback({ type: "", message: "" })
  }

  const handleDraftChange = (field) => (event) => {
    setDraft((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    try {
      if (formMode === "create") {
        await invokeManageUsers(session, {
          action: "create",
          email: draft.email,
          fullName: draft.fullName,
          password: draft.password,
          role: draft.role,
          status: draft.status,
        })

        setFeedback({ type: "success", message: "User created successfully." })
        resetForm()
      } else {
        await invokeManageUsers(session, {
          action: "update",
          userId: draft.userId,
          email: draft.email,
          fullName: draft.fullName,
          role: draft.role,
          status: draft.status,
        })

        setFeedback({ type: "success", message: "User updated successfully." })

        if (draft.userId === profile?.id) {
          await refreshProfile()
        }
      }

      await loadUsers()
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = async (user) => {
    if (!window.confirm(`Archive ${user.email}? This blocks sign-in until restored.`)) {
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    try {
      await invokeManageUsers(session, { action: "archive", userId: user.id })

      if (draft.userId === user.id) {
        resetForm()
      }

      await loadUsers()
      setFeedback({ type: "success", message: `${user.email} was archived.` })
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestore = async (user) => {
    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    try {
      await invokeManageUsers(session, { action: "restore", userId: user.id })
      await loadUsers()
      setFeedback({ type: "success", message: `${user.email} was restored.` })
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (user) => {
    const confirmation = window.prompt(
      `Type ${user.email} to permanently delete this user.`,
      "",
    )

    if (confirmation !== user.email) {
      setFeedback({
        type: "error",
        message: "Delete confirmation did not match the user email.",
      })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    try {
      await invokeManageUsers(session, { action: "delete", userId: user.id })

      if (draft.userId === user.id) {
        resetForm()
      }

      await loadUsers()
      setFeedback({
        type: "success",
        message: `${user.email} was permanently deleted.`,
      })
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-sidebar lg:block">
          <AdminSidebar
            isSigningOut={isSigningOut}
            onSignOut={handleSignOut}
            userEmail={userEmail}
          />
        </aside>

        {isNavOpen ? (
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setIsNavOpen(false)}
          >
            <aside
              className="h-full w-[248px] border-r bg-sidebar"
              onClick={(event) => event.stopPropagation()}
            >
              <AdminSidebar
                isSigningOut={isSigningOut}
                isMobile
                onClose={() => setIsNavOpen(false)}
                onSignOut={handleSignOut}
                userEmail={userEmail}
              />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0">
          <header className="border-b bg-background">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setIsNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu data-icon="inline-start" />
              </Button>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-medium">Users</h1>
                <p className="text-sm text-muted-foreground">
                  Manage access, archive accounts, restore archived users, and
                  permanently delete accounts.
                </p>
              </div>

              <Button type="button" variant="outline" onClick={handleNewUser}>
                <UserPlus data-icon="inline-start" />
                New user
              </Button>
            </div>
          </header>

          <main className="flex flex-col gap-6 px-4 py-6 sm:px-6">
            {signOutError ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-out failed</AlertTitle>
                <AlertDescription>{signOutError}</AlertDescription>
              </Alert>
            ) : null}

            <DashboardMetrics stats={stats} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
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
          </main>
        </div>
      </div>
    </div>
  )
}
