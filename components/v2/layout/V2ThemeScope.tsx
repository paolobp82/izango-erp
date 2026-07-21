"use client"

import type { ReactNode } from "react"
import { useTheme } from "@/components/design-system"
import styles from "./V2ThemeScope.module.css"

export function V2ThemeScope({ children }: { children: ReactNode }) {
  const { theme } = useTheme()

  return (
    <div className={`${styles.themeScope} izango-v2`} data-v2-theme={theme}>
      {children}
    </div>
  )
}
