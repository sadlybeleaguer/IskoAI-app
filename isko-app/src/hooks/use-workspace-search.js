import { useDeferredValue, useEffect, useMemo, useState } from "react"

import { loadWorkspaceSearchRecords } from "@/services/workspace-search-service"

const resultTypeLabels = {
  note: "Notes",
  chat: "Chats",
  calendar: "Calendar",
}

const resultLimit = 24

function normalizeQuery(value) {
  return value.trim().toLowerCase()
}

function splitQueryTerms(value) {
  return normalizeQuery(value).split(/\s+/).filter(Boolean)
}

function getRecordScore(record, normalizedQuery, queryTerms) {
  if (!normalizedQuery) {
    return -1
  }

  const title = record.title.toLowerCase()
  const subtitle = record.subtitle.toLowerCase()
  const searchValue = record.searchValue.toLowerCase()

  if (queryTerms.some((term) => !searchValue.includes(term))) {
    return -1
  }

  let score = 0

  if (title === normalizedQuery) {
    score += 300
  }

  if (title.startsWith(normalizedQuery)) {
    score += 180
  } else if (title.includes(normalizedQuery)) {
    score += 120
  }

  if (subtitle.includes(normalizedQuery)) {
    score += 40
  }

  queryTerms.forEach((term) => {
    if (title.startsWith(term)) {
      score += 40
    } else if (title.includes(term)) {
      score += 25
    }

    if (subtitle.includes(term)) {
      score += 10
    }
  })

  return score
}

function groupResults(records) {
  return records.reduce((groups, record) => {
    const currentGroup = groups.find((group) => group.type === record.type)

    if (currentGroup) {
      currentGroup.items.push(record)
      return groups
    }

    groups.push({
      type: record.type,
      label: resultTypeLabels[record.type] ?? record.type,
      items: [record],
    })

    return groups
  }, [])
}

export function useWorkspaceSearch(userId, isOpen) {
  const [query, setQuery] = useState("")
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (isOpen) {
      return
    }

    setQuery("")
    setErrorMessage("")
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !userId) {
      if (!userId) {
        setRecords([])
        setIsLoading(false)
      }
      return
    }

    let isMounted = true

    const loadRecords = async () => {
      setIsLoading(true)

      try {
        const nextResults = await loadWorkspaceSearchRecords(userId)

        if (!isMounted) {
          return
        }

        setRecords(nextResults.records)
        setErrorMessage(
          nextResults.errors.length
            ? `Some results could not load: ${nextResults.errors.map((error) => error.label).join(", ")}.`
            : "",
        )
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRecords([])
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load search results.",
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadRecords()

    return () => {
      isMounted = false
    }
  }, [isOpen, userId])

  const filteredResults = useMemo(() => {
    const normalizedQuery = normalizeQuery(deferredQuery)
    const queryTerms = splitQueryTerms(deferredQuery)

    if (!normalizedQuery) {
      return []
    }

    return records
      .map((record) => ({
        ...record,
        score: getRecordScore(record, normalizedQuery, queryTerms),
      }))
      .filter((record) => record.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score
        }

        if (right.sortValue !== left.sortValue) {
          return right.sortValue - left.sortValue
        }

        return left.title.localeCompare(right.title)
      })
      .slice(0, resultLimit)
  }, [deferredQuery, records])

  const groupedResults = useMemo(
    () => groupResults(filteredResults),
    [filteredResults],
  )

  return {
    errorMessage,
    flatResults: filteredResults,
    groupedResults,
    isLoading,
    query,
    setQuery,
  }
}
