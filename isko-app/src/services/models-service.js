import { supabase } from "@/services/supabase"

export const defaultChatModels = [
  { key: "gpt-5.4", label: "GPT-5.4" },
  { key: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { key: "gpt-4.1", label: "GPT-4.1" },
]

function isMissingRelationError(error) {
  return (
    error?.code === "PGRST205" ||
    /could not find the table|relation .* does not exist/i.test(error?.message ?? "")
  )
}

export async function listAvailableChatModels() {
  if (!supabase) {
    return defaultChatModels
  }

  const { data, error } = await supabase
    .from("chat_models")
    .select("key, label")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true })

  if (isMissingRelationError(error)) {
    return defaultChatModels
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}
