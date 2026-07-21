"use client"

import type { ReactNode } from "react"
import { V2SectionCard } from "./V2SectionCard"
import styles from "./V2System.module.css"

export type V2ChartCardProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  empty?: boolean
  emptyText?: string
}

export function V2ChartCard({
  title,
  description,
  action,
  children,
  empty = false,
  emptyText = "Sin datos disponibles",
}: V2ChartCardProps) {
  return (
    <V2SectionCard action={action} description={description} title={title}>
      <div className={styles.chartCardFrame}>
        {empty ? (
          <div className={styles.chartEmpty}>{emptyText}</div>
        ) : (
          children
        )}
      </div>
    </V2SectionCard>
  )
}
