"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2QuickActionsProps = {
  children: ReactNode
  cols?: number
}

export function V2QuickActions({ children, cols = 2 }: V2QuickActionsProps) {
  return (
    <div
      className={styles.quickActionsGrid}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  )
}
