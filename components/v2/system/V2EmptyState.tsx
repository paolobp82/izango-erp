import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2EmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  /** @deprecated Alias for primaryAction */
  action?: ReactNode
  compact?: boolean
}

export function V2EmptyState({
  action,
  compact = false,
  description,
  icon,
  primaryAction,
  secondaryAction,
  title,
}: V2EmptyStateProps) {
  const resolvedPrimary = primaryAction || action

  return (
    <div className={`${styles.emptyState} ${compact ? styles.emptyStateCompact : ""}`}>
      {icon ? <div aria-hidden="true" className={styles.emptyIcon}>{icon}</div> : null}
      <div className={styles.emptyContent}>
        <h3 className={styles.heading3}>{title}</h3>
        {description ? <p className={styles.bodyCompact}>{description}</p> : null}
      </div>
      {resolvedPrimary || secondaryAction ? (
        <div className={styles.emptyActions}>
          {resolvedPrimary}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
