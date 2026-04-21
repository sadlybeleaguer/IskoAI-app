import { supabase } from "@/services/supabase"

export const defaultChatModels = [
  {
    key: "MiniMaxAI/MiniMax-M2.7:together",
    label: "MiniMaxAI/MiniMax-M2.7:together",
    provider: "huggingface-router",
  },
  {
    key: "openrouter/free",
    label: "OpenRouter Free Router",
    provider: "openrouter",
  },
  {
    key: "google/gemma-4-26b-a4b-it:free",
    label: "Google Gemma 4 26B A4B (Free)",
    provider: "openrouter",
  },
  {
    key: "openai/gpt-oss-20b:free",
    label: "OpenAI GPT-OSS 20B (Free)",
    provider: "openrouter",
  },
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
    .select("key, label, provider")
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
