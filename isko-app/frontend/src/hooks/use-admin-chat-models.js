import { useCallback, useState } from "react"

import { invokeManageUsers } from "@/services/db.service"
import { getErrorMessage } from "@/utils/errors"

export function useAdminChatModels({ session }) {
  const [models, setModels] = useState([])
  const [modelsError, setModelsError] = useState("")
  const [modelsFeedback, setModelsFeedback] = useState({ type: "", message: "" })
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [updatingModelKey, setUpdatingModelKey] = useState("")
  const isSignedIn = Boolean(session)

  const loadModels = useCallback(async () => {
    if (!isSignedIn) {
      setModels([])
      setModelsError("You must be signed in to manage models.")
      setIsLoadingModels(false)
      return
    }

    setIsLoadingModels(true)

    try {
      const result = await invokeManageUsers(null, { action: "listModels" })
      setModels(Array.isArray(result.models) ? result.models : [])
      setModelsError("")
    } catch (error) {
      setModels([])
      setModelsError(getErrorMessage(error))
    } finally {
      setIsLoadingModels(false)
    }
  }, [isSignedIn])

  const updateModelAvailability = useCallback(
    async (model) => {
      if (!isSignedIn) {
        setModelsFeedback({
          type: "error",
          message: "You must be signed in to manage models.",
        })
        return
      }

      setUpdatingModelKey(model.key)
      setModelsFeedback({ type: "", message: "" })

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
    [isSignedIn],
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
