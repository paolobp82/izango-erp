import type { SelectHTMLAttributes } from "react"
import styles from "./V2System.module.css"

export type V2SelectOption = {
  label: string
  value: string
  disabled?: boolean
}

export type V2SelectSize = "sm" | "md" | "lg"

export type V2SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label?: string
  description?: string
  hint?: string
  error?: string
  options: V2SelectOption[]
  size?: V2SelectSize
  compact?: boolean
  fullWidth?: boolean
}

const sizeClass: Record<V2SelectSize, string> = {
  sm: styles.selectSm,
  md: styles.selectMd,
  lg: styles.selectLg,
}

export function V2Select({
  className = "",
  compact = false,
  description,
  disabled = false,
  error,
  fullWidth = true,
  hint,
  id,
  label,
  options,
  size = "md",
  ...props
}: V2SelectProps) {
  const selectId = id || (label ? `v2-select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined)
  const resolvedDescription = description || hint
  const resolvedSize = compact ? "sm" : size
  const descId = selectId ? `${selectId}-desc` : undefined
  const errorId = selectId ? `${selectId}-error` : undefined

  const ariaDescribedBy = [
    error ? errorId : null,
    resolvedDescription ? descId : null,
  ].filter(Boolean).join(" ") || undefined

  return (
    <div className={`${styles.field} ${fullWidth ? styles.fieldFullWidth : ""}`}>
      {label ? (
        <label className={`${styles.label} ${error ? styles.fieldError : ""}`} htmlFor={selectId}>
          {label}
        </label>
      ) : null}

      <div className={styles.selectWrap}>
        <select
          aria-describedby={ariaDescribedBy}
          aria-invalid={Boolean(error)}
          className={`${styles.select} ${sizeClass[resolvedSize]} ${error ? styles.inputError : ""} ${className}`}
          disabled={disabled}
          id={selectId}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} disabled={option.disabled} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={styles.selectChevron} aria-hidden="true">▾</span>
      </div>

      {error ? (
        <span className={`${styles.fieldHint} ${styles.fieldError}`} id={errorId}>
          {error}
        </span>
      ) : resolvedDescription ? (
        <span className={styles.fieldHint} id={descId}>
          {resolvedDescription}
        </span>
      ) : null}
    </div>
  )
}
