import { useCallback, useState } from "react"

import { supabase } from "@/services/supabase"
import { getErrorMessage } from "@/utils/errors"

export function useAdminChatModels({ session }) {
  const [models, setModels] = useState([])
  const [modelsError, setModelsError] = useState("")
  const [modelsFeedback, setModelsFeedback] = useState({ type: "", message: "" })
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [updatingModelKey, setUpdatingModelKey] = useState("")

  const loadModels = useCallback(async () => {
    if (!session || !supabase) {
      setModels([])
      setModelsError("You must be signed in to manage models.")
      setIsLoadingModels(false)
      return
    }

    setIsLoadingModels(true)

    try {
      const { data, error } = await supabase
        .from("chat_models")
        .select("key, label, provider, enabled, sort_order, created_at, updated_at")
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true })

      if (error) {
        throw error
      }

      setModels(data ?? [])
      setModelsError("")
    } catch (error) {
      setModels([])
      setModelsError(getErrorMessage(error))
    } finally {
      setIsLoadingModels(false)
    }
  }, [session])

  const updateModelAvailability = useCallback(
    async (model) => {
      if (!session || !supabase) {
        setModelsFeedback({
          type: "error",
          message: "You must be signed in to manage models.",
        })
        return
      }

      setUpdatingModelKey(model.key)
      setModelsFeedback({ type: "", message: "" })

      try {
        const { data, error } = await supabase
          .from("chat_models")
          .update({ enabled: !model.enabled })
          .eq("key", model.key)
          .select("key, label, provider, enabled, sort_order, created_at, updated_at")
          .single()

        if (error) {
          throw error
        }

        const updatedModel = data

        setModels((currentModels) =>
          currentModels.map((currentModel) =>
            currentModel.key === updatedModel.key ? updatedModel : currentModel,
          ),
        )
        setModelsFeedback({
          type: "success",
          message: `${updatedModel.label} is now ${updatedModel.enabled ? "enabled" : "disabled"}.`,
        })
      } catch (error) {
        setModelsFeedback({ type: "error", message: getErrorMessage(error) })
      } finally {
        setUpdatingModelKey("")
      }
    },
    [session],
  )

  return {
    isLoadingModels,
    loadModels,
    models,
    modelsError,
    modelsFeedback,
    updateModelAvailability,
    updatingModelKey,
  }
}
