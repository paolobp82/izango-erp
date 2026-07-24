"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2SectionHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
}

export function V2SectionHeader({ title, description, actions }: V2SectionHeaderProps) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h3 className={styles.sectionHeaderTitle}>{title}</h3>
        {description && (
          <p className={styles.sectionHeaderDesc}>{description}</p>
        )}
      </div>
      {actions && <div className={styles.sectionHeaderActions}>{actions}</div>}
    </div>
  )
}
