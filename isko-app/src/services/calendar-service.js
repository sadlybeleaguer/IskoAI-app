import { supabase } from "@/services/supabase"

const calendarEventSelect =
  "id, user_id, title, description, starts_at, ends_at, is_all_day, created_at, updated_at"

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }

  return supabase
}

function isMissingRpcError(error) {
  return (
    error?.code === "PGRST202" ||
    /could not find the function .* in the schema cache/i.test(error?.message ?? "")
  )
}

export async function listCalendarEvents({
  userId,
  rangeStart,
  rangeEnd,
}) {
  const client = requireClient()

  const { data, error } = await client.rpc("list_calendar_events_for_range", {
    range_end: rangeEnd,
    range_start: rangeStart,
  })

  if (isMissingRpcError(error)) {
    const fallbackResult = await client
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("user_id", userId)
      .lte("starts_at", rangeEnd)
      .gte("ends_at", rangeStart)
      .order("starts_at", { ascending: true })

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message)
    }

    return fallbackResult.data ?? []
  }

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).filter((event) => event.user_id === userId)
}

export async function createCalendarEvent({
  description,
  endsAt,
  isAllDay,
  startsAt,
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("calendar_events")
    .insert({
      user_id: userId,
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      is_all_day: isAllDay,
    })
    .select(calendarEventSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateCalendarEvent({
  description,
  endsAt,
  eventId,
  isAllDay,
  startsAt,
  title,
  userId,
}) {
  const client = requireClient()

  const { data, error } = await client
    .from("calendar_events")
    .update({
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      is_all_day: isAllDay,
    })
    .eq("id", eventId)
    .eq("user_id", userId)
    .select(calendarEventSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteCalendarEvent({ eventId, userId }) {
  const client = requireClient()

  const { error } = await client
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}
