import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

import { invokeManageUsers } from "@/services/db.service"
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
  const [pendingUserAction, setPendingUserAction] = useState(null)
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState("")
  const isSignedIn = Boolean(session)

  const setSuccessFeedback = useCallback((message) => {
    setFeedback({ type: "success", message })
    toast.success(message)
  }, [])

  const setErrorFeedback = useCallback((message) => {
    setFeedback({ type: "error", message })
    toast.error(message)
  }, [])

  const loadUsers = useCallback(async () => {
    if (!isSignedIn) {
      setUsers([])
      const message = "You must be signed in to manage users."

      setUsersError(message)
      toast.error(message)
      setIsLoadingUsers(false)
      return
    }

    setIsLoadingUsers(true)

    try {
      const result = await invokeManageUsers(null, { action: "listUsers" })
      setUsers(Array.isArray(result.users) ? result.users : [])
      setUsersError("")
    } catch (error) {
      const message = getErrorMessage(error)

      setUsers([])
      setUsersError(message)
      toast.error(message)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [isSignedIn])

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

  const resetForm = useCallback(() => {
    setFormMode("create")
    setDraft(emptyDraft)
  }, [])

  const clearPendingUserAction = useCallback(() => {
    setPendingUserAction(null)
    setDeleteConfirmationValue("")
  }, [])

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

        setSuccessFeedback("User created successfully.")
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

        setSuccessFeedback("User updated successfully.")

        if (draft.userId === profileId) {
          await refreshProfile()
        }
      }

      await loadUsers()
    } catch (error) {
      setErrorFeedback(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = (user) => {
    setPendingUserAction({ action: "archive", user })
    setDeleteConfirmationValue("")
  }

  const handleRestore = async (user) => {
    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    try {
      await invokeManageUsers(session, { action: "restore", userId: user.id })
      await loadUsers()
      setSuccessFeedback(`${user.email} was restored.`)
    } catch (error) {
      setErrorFeedback(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (user) => {
    setPendingUserAction({ action: "delete", user })
    setDeleteConfirmationValue("")
  }

  const handleConfirmationOpenChange = useCallback(
    (open) => {
      if (!open && !isSubmitting) {
        clearPendingUserAction()
      }
    },
    [clearPendingUserAction, isSubmitting],
  )

  const handleDeleteConfirmationChange = useCallback((event) => {
    setDeleteConfirmationValue(event.target.value)
  }, [])

  const confirmPendingUserAction = useCallback(async () => {
    if (!pendingUserAction?.user) {
      return
    }

    const { action, user } = pendingUserAction

    if (action === "delete" && deleteConfirmationValue.trim() !== user.email) {
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    try {
      await invokeManageUsers(session, { action, userId: user.id })

      if (draft.userId === user.id) {
        resetForm()
      }

      clearPendingUserAction()
      await loadUsers()
      setSuccessFeedback(
        action === "delete"
          ? `${user.email} was permanently deleted.`
          : `${user.email} was archived.`,
      )
    } catch (error) {
      setErrorFeedback(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }, [
    clearPendingUserAction,
    deleteConfirmationValue,
    draft.userId,
    loadUsers,
    pendingUserAction,
    resetForm,
    setErrorFeedback,
    setSuccessFeedback,
    session,
  ])

  return {
    confirmPendingUserAction,
    deleteConfirmationValue,
    draft,
    feedback,
    filteredUsers,
    formMode,
    handleConfirmationOpenChange,
    isEditingSelf,
    isConfirmationOpen: Boolean(pendingUserAction),
    isLoadingUsers,
    isSubmitting,
    loadUsers,
    pendingUserAction,
    roleFilter,
    searchTerm,
    stats,
    statusFilter,
    usersError,
    handleArchive,
    handleDeleteConfirmationChange,
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
