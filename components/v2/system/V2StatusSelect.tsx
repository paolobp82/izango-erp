"use client"

import type { SelectHTMLAttributes } from "react"
import styles from "./V2System.module.css"

export type V2StatusSelectTone = "neutral" | "info" | "warning" | "success" | "danger"

export type V2StatusSelectOption = {
  label: string
  value: string
}

export type V2StatusSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  options: V2StatusSelectOption[]
  tone: V2StatusSelectTone
}

const toneClass: Record<V2StatusSelectTone, string> = {
  neutral: styles.statusSelectNeutral,
  info: styles.statusSelectInfo,
  warning: styles.statusSelectWarning,
  success: styles.statusSelectSuccess,
  danger: styles.statusSelectDanger,
}

// Select nativo (mantiene teclado/accesibilidad/onChange estandar) con la
// apariencia resuelta por tokens del tema en vez de hex fijos: el color
// semantico llega via `tone`, nunca via estilos inline en el consumidor.
export function V2StatusSelect({ className = "", options, tone, ...props }: V2StatusSelectProps) {
  return (
    <span className={styles.statusSelectWrap}>
      <select className={`${styles.statusSelect} ${toneClass[tone]} ${className}`} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className={styles.statusSelectChevron}>▾</span>
    </span>
  )
}
