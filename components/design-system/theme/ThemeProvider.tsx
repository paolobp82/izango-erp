"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { IzangoThemeName } from "./tokens"

type ThemeContextValue = {
  theme: IzangoThemeName
  setTheme: (theme: IzangoThemeName) => void
  toggleTheme: () => void
}

const STORAGE_KEY = "izango-theme"
const ThemeContext = createContext<ThemeContextValue | null>(null)

function preferredTheme(): IzangoThemeName {
  if (typeof window === "undefined") return "light"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<IzangoThemeName>(() => preferredTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((current) => (current === "light" ? "dark" : "light")),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error("useTheme debe usarse dentro de ThemeProvider")
  return value
}
