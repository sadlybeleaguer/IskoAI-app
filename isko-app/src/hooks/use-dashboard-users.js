import { useCallback, useMemo, useState } from "react"

import { invokeManageUsers } from "@/services/admin-service"
import { supabase } from "@/services/supabase"
import { getErrorMessage } from "@/utils/errors"

export const roleOptions = [
  { value: "user", label: "User" },
  { value: "superadmin", label: "Superadmin" },
]

export const statusOptions = [
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

export function useDashboardUsers({ profileId, refreshProfile, session }) {
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState("")
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [formMode, setFormMode] = useState("create")
  const [draft, setDraft] = useState(emptyDraft)

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

  const isEditingSelf = formMode === "edit" && draft.userId === profileId

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

        if (draft.userId === profileId) {
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

  return {
    draft,
    feedback,
    filteredUsers,
    formMode,
    isEditingSelf,
    isLoadingUsers,
    isSubmitting,
    loadUsers,
    roleFilter,
    searchTerm,
    stats,
    statusFilter,
    usersError,
    handleArchive,
    handleDelete,
    handleDraftChange,
    handleNewUser,
    handleRestore,
    handleSubmit,
    resetForm,
    setRoleFilter,
    setSearchTerm,
    setStatusFilter,
    startEditing,
  }
}
