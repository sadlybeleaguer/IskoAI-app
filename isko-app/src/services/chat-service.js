import { supabase } from "@/services/supabase"

const threadSelect =
  "id, user_id, title, selected_tool, attached_note_id, attached_note_title, folder_id, archived_at, created_at, updated_at"
const folderSelect =
  "id, user_id, title, system_prompt, selected_tool, attached_note_id, attached_note_title, archived_at, created_at, updated_at"
const messageSelect =
  "id, thread_id, user_id, role, content, created_at"

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }

  return supabase
}

function isMissingRelationError(error) {
  return (
    error?.code === "PGRST205" ||
    /could not find the table|relation .* does not exist/i.test(error?.message ?? "")
  )
}

export async function listChatThreads(userId) {
  const client = requireClient()

  const activeThreadsQuery = client
    .from("active_chat_threads")
    .select(threadSelect)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  const { data, error } = await activeThreadsQuery

  if (isMissingRelationError(error)) {
    const fallbackResult = await client
      .from("chat_threads")
      .select(threadSelect)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message)
    }

    return fallbackResult.data ?? []
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function listArchivedChatThreads(userId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .select(threadSelect)
    .eq("user_id", userId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function listChatFolders(userId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folders")
    .select(folderSelect)
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function createChatFolder({
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folders")
    .insert({
      title,
      user_id: userId,
    })
    .select(folderSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatFolder({
  folderId,
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_folders")
    .update({
      title,
    })
    .eq("id", folderId)
    .eq("user_id", userId)
    .select(folderSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteChatFolder({
  folderId,
  userId,
}) {
  const client = requireClient()

  // First, unassign threads from this folder
  await client
    .from("chat_threads")
    .update({ folder_id: null })
    .eq("folder_id", folderId)
    .eq("user_id", userId)

  const { error } = await client
    .from("chat_folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateChatThreadFolder({
  threadId,
  folderId,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      folder_id: folderId,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function listChatMessages(userId, threadId) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_messages")
    .select(messageSelect)
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function createChatThread({
  attachedNoteId = null,
  selectedTool = "",
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .insert({
      attached_note_id: attachedNoteId,
      selected_tool: selectedTool,
      user_id: userId,
      title,
    })
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatThreadTool({
  selectedTool,
  threadId,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      selected_tool: selectedTool,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatThreadAttachment({
  attachedNoteId,
  threadId,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      attached_note_id: attachedNoteId,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function archiveChatThread({
  threadId,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function unarchiveChatThread({
  threadId,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_threads")
    .update({
      archived_at: null,
    })
    .eq("id", threadId)
    .eq("user_id", userId)
    .select(threadSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteChatThreadPermanent({
  threadId,
  userId,
}) {
  const client = requireClient()

  const { error } = await client
    .from("chat_threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function createChatMessage({
  threadId,
  userId,
  role,
  content,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      user_id: userId,
      role,
      content,
    })
    .select(messageSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateChatMessage({
  messageId,
  userId,
  content,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("chat_messages")
    .update({
      content,
    })
    .eq("id", messageId)
    .eq("user_id", userId)
    .select(messageSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
