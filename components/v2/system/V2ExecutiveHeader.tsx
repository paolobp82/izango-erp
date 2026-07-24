"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2ExecutiveHeaderProps = {
  eyebrow?: string
  title: string
  dateStr?: string
  timeStr?: string
  systemStatus?: "online" | "offline" | "maintenance"
  syncText?: string
  summaryBadge?: string
  summaryText?: ReactNode
  actions?: ReactNode
}

export function V2ExecutiveHeader({
  eyebrow = "IZANGO SIG",
  title,
  dateStr,
  timeStr,
  systemStatus = "online",
  syncText,
  summaryBadge = "Resumen Estratégico",
  summaryText,
  actions,
}: V2ExecutiveHeaderProps) {
  return (
    <header className={styles.executiveHeader}>
      <div className={styles.headerTop}>
        <div className={styles.headerTitleBlock}>
          {eyebrow && <span className={styles.headerEyebrow}>{eyebrow}</span>}
          <h1 className={styles.headerTitle}>{title}</h1>
          {(dateStr || timeStr) && (
            <p className={styles.headerDate}>
              {dateStr} {timeStr && `• ${timeStr}`}
            </p>
          )}
        </div>
        <div className={styles.headerMetaGrid}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Estado del sistema</span>
            {systemStatus === "online" ? (
              <span className={styles.metaValueActive}>
                <span className={styles.statusDotActive} />
                En línea
              </span>
            ) : (
              <span className={styles.metaValue}>{systemStatus}</span>
            )}
          </div>
          {syncText && (
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Sincronización</span>
              <span className={styles.metaValue}>{syncText}</span>
            </div>
          )}
          {actions && <div className={styles.headerActions}>{actions}</div>}
        </div>
      </div>
      {summaryText && (
        <div className={styles.headerSummaryBlock}>
          <div className={styles.summaryBadge}>{summaryBadge}</div>
          <p className={styles.summaryText}>{summaryText}</p>
        </div>
      )}
    </header>
  )
}
