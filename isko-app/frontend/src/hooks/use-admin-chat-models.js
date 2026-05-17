import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

import { invokeManageUsers } from "@/services/db.service"
import { getErrorMessage } from "@/utils/errors"

export function useAdminChatModels({ session }) {
  const [models, setModels] = useState([])
  const [modelsError, setModelsError] = useState("")
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [updatingModelKey, setUpdatingModelKey] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [providerFilter, setProviderFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const isSignedIn = Boolean(session)

  const stats = useMemo(() => {
    const enabled = models.filter((model) => model.enabled).length
    const providers = new Set(models.map((model) => model.provider).filter(Boolean)).size

    return {
      total: models.length,
      enabled,
      disabled: models.length - enabled,
      providers,
    }
  }, [models])

  const providerOptions = useMemo(() => {
    return [...new Set(models.map((model) => model.provider).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
      .map((provider) => ({
        value: provider,
        label:
          provider === "openrouter"
            ? "OpenRouter"
            : provider === "huggingface-router"
              ? "Hugging Face Router"
              : provider,
      }))
  }, [models])

  const filteredModels = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return models.filter((model) => {
      if (providerFilter !== "all" && model.provider !== providerFilter) {
        return false
      }

      if (statusFilter !== "all") {
        const nextStatus = model.enabled ? "enabled" : "disabled"

        if (nextStatus !== statusFilter) {
          return false
        }
      }

      if (!query) {
        return true
      }

      return [model.label, model.key, model.provider, model.enabled ? "enabled" : "disabled"]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [models, providerFilter, searchTerm, statusFilter])

  const loadModels = useCallback(async () => {
    if (!isSignedIn) {
      setModels([])
      const message = "You must be signed in to manage models."

      setModelsError(message)
      toast.error(message)
      setIsLoadingModels(false)
      return
    }

    setIsLoadingModels(true)

    try {
      const result = await invokeManageUsers(null, { action: "listModels" })
      setModels(Array.isArray(result.models) ? result.models : [])
      setModelsError("")
    } catch (error) {
      const message = getErrorMessage(error)

      setModels([])
      setModelsError(message)
      toast.error(message)
    } finally {
      setIsLoadingModels(false)
    }
  }, [isSignedIn])

  const updateModelAvailability = useCallback(
    async (model) => {
      if (!isSignedIn) {
        toast.error("You must be signed in to manage models.")
        return
      }

      setUpdatingModelKey(model.key)

      try {
        const result = await invokeManageUsers(null, {
          action: "updateModelAvailability",
          enabled: !model.enabled,
          modelKey: model.key,
        })
        const updatedModel = result.model

        if (!updatedModel?.key) {
          throw new Error("The model update response was missing the model record.")
        }

        setModels((currentModels) =>
          currentModels.map((currentModel) =>
            currentModel.key === updatedModel.key ? updatedModel : currentModel,
          ),
        )
        toast.success(
          `${updatedModel.label} is now ${updatedModel.enabled ? "enabled" : "disabled"}.`,
        )
      } catch (error) {
        toast.error(getErrorMessage(error))
      } finally {
        setUpdatingModelKey("")
      }
    },
    [isSignedIn],
  )

  return {
    filteredModels,
    isLoadingModels,
    loadModels,
    models,
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
  }
}
