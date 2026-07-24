"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2MetricCardProps = {
  label: string
  value: string | number
  subtext?: string
  icon?: ReactNode
}

export function V2MetricCard({ label, value, subtext, icon }: V2MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      {icon && <div className={styles.metricIcon}>{icon}</div>}
      <div className={styles.metricContent}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricValue}>{value}</span>
        {subtext && <span className={styles.metricSubtext}>{subtext}</span>}
      </div>
    </div>
  )
}
