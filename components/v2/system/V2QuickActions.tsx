"use client"

import type { CSSProperties, ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2QuickActionsProps = {
  children: ReactNode
  cols?: number
}

// cols se expone como custom property (no como inline gridTemplateColumns) para que
// los breakpoints de .quickActionsGrid puedan reducir columnas en tablet/mobile sin !important.
export function V2QuickActions({ children, cols = 2 }: V2QuickActionsProps) {
  return (
    <div className={styles.quickActionsGrid} style={{ "--v2-quick-cols": cols } as CSSProperties}>
      {children}
    </div>
  )
}
