import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2ErrorStateProps = {
  title?: string
  description?: string
  errorCode?: string
  action?: ReactNode
  compact?: boolean
}

export function V2ErrorState({
  action,
  compact = false,
  description = "No se pudieron cargar los datos. Por favor reintente o contacte a soporte.",
  errorCode,
  title = "Error al cargar informacion",
}: V2ErrorStateProps) {
  return (
    <div className={`${styles.errorState} ${compact ? styles.errorStateCompact : ""}`} role="alert">
      <div className={styles.errorIcon} aria-hidden="true">⚠️</div>
      <div className={styles.errorContent}>
        <div className={styles.errorHeaderRow}>
          <h3 className={styles.heading3}>{title}</h3>
          {errorCode ? <span className={styles.errorCodeBadge}>ERR-{errorCode}</span> : null}
        </div>
        <p className={styles.bodyCompact}>{description}</p>
      </div>
      {action ? <div className={styles.errorAction}>{action}</div> : null}
    </div>
  )
}
