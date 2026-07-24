"use client"

import { X } from "lucide-react"
import styles from "./V2Filters.module.css"

export type V2ActiveFilterChipProps = {
  id: string
  label: string
  valueLabel: string
  onRemove: (id: string) => void
}

export function V2ActiveFilterChip({ id, label, valueLabel, onRemove }: V2ActiveFilterChipProps) {
  return (
    <div className={styles.chip}>
      <span className={styles.chipLabel}>{label}:</span>
      <span className={styles.chipValue}>{valueLabel}</span>
      <button
        type="button"
        className={styles.chipCloseBtn}
        onClick={() => onRemove(id)}
        aria-label={`Quitar filtro ${label}`}
      >
        <X size={10} strokeWidth={3} />
      </button>
    </div>
  )
}
