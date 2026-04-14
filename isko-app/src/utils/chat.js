export const starterPrompts = [
  "Draft an onboarding checklist for a new product hire.",
  "Summarize a meeting into decisions, risks, and next steps.",
  "Turn a rough idea into a one-page project brief.",
]

export const suggestedPrompts = [
  {
    title: "Overcome procrastination",
    hint: "give me tips",
    prompt: "Help me overcome procrastination and keep the advice practical.",
  },
  {
    title: "Explain options trading",
    hint: "if I'm familiar with buying and selling stocks",
    prompt:
      "Explain options trading to someone who already understands buying and selling stocks.",
  },
  {
    title: "Show me a code snippet",
    hint: "of a website's sticky header",
    prompt: "Show me a concise code snippet for a website's sticky header.",
  },
]

export const cannedReplies = [
  "I can turn that into a tighter draft, a checklist, or a handoff note. Pick the format and I will keep it concise.",
  "Here is the cleanest next move: define the outcome, list the hard constraints, and cut anything that does not affect the first release.",
  "If you want a usable answer quickly, I would structure it around decisions, risks, owners, and the immediate next action.",
]

export function getThreadTitle(content) {
  return content.trim().replace(/\s+/g, " ").slice(0, 40) || "Untitled chat"
}

export function formatRelativeTime(value) {
  const elapsedMs = Date.now() - new Date(value).valueOf()
  const minutes = Math.floor(elapsedMs / 60000)

  if (minutes < 1) {
    return "now"
  }

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h`
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return `${days}d`
  }

  const weeks = Math.floor(days / 7)

  if (weeks < 5) {
    return `${weeks}w`
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

function getThreadGroupLabel(value) {
  const now = new Date()
  const date = new Date(value)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const differenceInDays = Math.floor(
    (startOfToday.valueOf() - startOfDate.valueOf()) / 86400000,
  )

  if (differenceInDays <= 0) {
    return "Today"
  }

  if (differenceInDays <= 7) {
    return "Previous 7 days"
  }

  if (differenceInDays <= 30) {
    return "Previous 30 days"
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date)
  }

  return String(date.getFullYear())
}

export function sortThreads(threads) {
  return [...threads].sort(
    (left, right) =>
      new Date(right.updated_at).valueOf() - new Date(left.updated_at).valueOf(),
  )
}

export function groupThreads(threads) {
  return threads.reduce((groups, thread) => {
    const label = getThreadGroupLabel(thread.updated_at)
    const existingGroup = groups.find((group) => group.label === label)

    if (existingGroup) {
      existingGroup.items.push(thread)
      return groups
    }

    groups.push({ label, items: [thread] })
    return groups
  }, [])
}

export function buildReply(content) {
  const prompt = content.trim()
  const fallback = cannedReplies[prompt.length % cannedReplies.length]

  if (prompt.length < 80) {
    return `${fallback} If you want, I can expand this into a working draft next.`
  }

  return `${fallback} I would keep the first pass short, then iterate once the structure is locked.`
}

export function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
