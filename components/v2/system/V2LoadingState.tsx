import styles from "./V2System.module.css"

export type V2LoadingStateProps = {
  title?: string
  description?: string
  rows?: number
  variant?: "table" | "card" | "inline"
  ariaLabel?: string
}

export function V2LoadingState({
  ariaLabel = "Cargando datos...",
  description,
  rows = 3,
  title = "Cargando informacion...",
  variant = "card",
}: V2LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div aria-busy="true" aria-label={ariaLabel} className={styles.loadingStateInline}>
        <span className={styles.skeleton} style={{ height: 16, width: 16, borderRadius: "50%" }} />
        <span className={styles.caption}>{title}</span>
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div aria-busy="true" aria-label={ariaLabel} className={styles.loadingStateCard}>
        <div className={styles.loadingStateHeader}>
          <span className={styles.skeleton} style={{ height: 16, width: "35%", borderRadius: 4 }} />
          {description ? <span className={styles.skeleton} style={{ height: 12, width: "60%", borderRadius: 4, marginTop: 4 }} /> : null}
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {Array.from({ length: rows }).map((_, index) => (
            <span className={styles.skeleton} key={index} style={{ height: 32, width: "100%", borderRadius: 4 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div aria-busy="true" aria-label={ariaLabel} className={styles.loadingStateCard}>
      <span className={styles.skeleton} style={{ height: 20, width: "40%", borderRadius: 4 }} />
      <span className={styles.skeleton} style={{ height: 14, width: "75%", borderRadius: 4, marginTop: 8 }} />
      <span className={styles.skeleton} style={{ height: 48, width: "100%", borderRadius: 6, marginTop: 16 }} />
    </div>
  )
}
