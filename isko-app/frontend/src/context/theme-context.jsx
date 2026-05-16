/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const themeStorageKey = "isko-theme-mode"
const themeModes = ["light", "dark", "system"]
const darkSchemeQuery = "(prefers-color-scheme: dark)"

const ThemeContext = createContext(null)

function getStoredThemeMode() {
  if (typeof window === "undefined") {
    return "system"
  }

  const storedMode = window.localStorage.getItem(themeStorageKey)
  return themeModes.includes(storedMode) ? storedMode : "system"
}

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light"
  }

  return window.matchMedia(darkSchemeQuery).matches ? "dark" : "light"
}

function applyResolvedTheme(resolvedTheme) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  document.documentElement.style.colorScheme = resolvedTheme
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(getStoredThemeMode)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode

  useEffect(() => {
    const mediaQuery = window.matchMedia(darkSchemeQuery)

    const handleSystemThemeChange = (event) => {
      setSystemTheme(event.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange)
    }
  }, [])

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  const setThemeMode = (nextMode) => {
    if (!themeModes.includes(nextMode)) {
      return
    }

    window.localStorage.setItem(themeStorageKey, nextMode)
    setThemeModeState(nextMode)
  }

  const value = useMemo(
    () => ({
      resolvedTheme,
      setThemeMode,
      systemTheme,
      themeMode,
      themeModes,
    }),
    [resolvedTheme, systemTheme, themeMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
