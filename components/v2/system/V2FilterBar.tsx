import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2FilterBarProps = {
  children?: ReactNode
  /** @deprecated Alias for children */
  primary?: ReactNode
  actions?: ReactNode
  /** @deprecated Alias for actions */
  secondary?: ReactNode
  activeCount?: number
  onClear?: () => void
  clearLabel?: string
  ariaLabel?: string
}

export function V2FilterBar({
  actions,
  activeCount,
  ariaLabel = "Filtros de datos",
  children,
  clearLabel = "Limpiar filtros",
  onClear,
  primary,
  secondary,
}: V2FilterBarProps) {
  const resolvedChildren = children || primary
  const resolvedActions = actions || secondary
  const hasActiveFilters = Boolean(activeCount && activeCount > 0)

  return (
    <section aria-label={ariaLabel} className={styles.filterBar}>
      <div className={styles.filterBarControls}>
        {resolvedChildren}
        {hasActiveFilters && onClear ? (
          <button
            aria-label={clearLabel}
            className={styles.filterBarClearBtn}
            onClick={onClear}
            type="button"
          >
            <span>{clearLabel}</span>
            <span className={styles.filterBarBadge}>{activeCount}</span>
          </button>
        ) : null}
      </div>
      {resolvedActions ? <div className={styles.filterBarActions}>{resolvedActions}</div> : null}
    </section>
  )
}

/** Legacy alias */
export { V2FilterBar as V2Toolbar }
