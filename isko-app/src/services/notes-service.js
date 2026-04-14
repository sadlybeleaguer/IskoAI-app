import { supabase } from "@/services/supabase"

const noteSelect =
  "id, user_id, title, content, archived_at, created_at, updated_at"

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

export async function listNotes(userId) {
  const client = requireClient()

  const activeNotesQuery = client
    .from("active_notes")
    .select(noteSelect)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  const { data, error } = await activeNotesQuery

  if (isMissingRelationError(error)) {
    const fallbackResult = await client
      .from("notes")
      .select(noteSelect)
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

export async function createNote({ userId, title = "", content = "" }) {
  const client = requireClient()

  const { data, error } = await client
    .from("notes")
    .insert({
      user_id: userId,
      title,
      content,
    })
    .select(noteSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateNote({
  noteId,
  userId,
  title,
  content,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("notes")
    .update({
      title,
      content,
    })
    .eq("id", noteId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .select(noteSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function archiveNote({ noteId, userId }) {
  const client = requireClient()

  const { error } = await client
    .from("notes")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("user_id", userId)
    .is("archived_at", null)

  if (error) {
    throw new Error(error.message)
  }
}
