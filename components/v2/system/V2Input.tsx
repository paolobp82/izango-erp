import type { InputHTMLAttributes, ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2InputSize = "sm" | "md" | "lg"

export type V2InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string
  description?: string
  hint?: string
  error?: string
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  /** @deprecated Alias for leadingIcon */
  icon?: ReactNode
  size?: V2InputSize
  compact?: boolean
  fullWidth?: boolean
}

const sizeClass: Record<V2InputSize, string> = {
  sm: styles.inputSm,
  md: styles.inputMd,
  lg: styles.inputLg,
}

export function V2Input({
  className = "",
  compact = false,
  description,
  disabled = false,
  error,
  fullWidth = true,
  hint,
  icon,
  id,
  label,
  leadingIcon,
  readOnly = false,
  size = "md",
  trailingIcon,
  ...props
}: V2InputProps) {
  const inputId = id || (label ? `v2-input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined)
  const resolvedDescription = description || hint
  const startIcon = leadingIcon || icon
  const resolvedSize = compact ? "sm" : size
  const descId = inputId ? `${inputId}-desc` : undefined
  const errorId = inputId ? `${inputId}-error` : undefined

  const ariaDescribedBy = [
    error ? errorId : null,
    resolvedDescription ? descId : null,
  ].filter(Boolean).join(" ") || undefined

  return (
    <div className={`${styles.field} ${fullWidth ? styles.fieldFullWidth : ""}`}>
      {label ? (
        <label className={`${styles.label} ${error ? styles.fieldError : ""}`} htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <div className={styles.inputWrap}>
        {startIcon ? <span className={styles.leadingIcon}>{startIcon}</span> : null}
        <input
          aria-describedby={ariaDescribedBy}
          aria-invalid={Boolean(error)}
          className={`${styles.input} ${sizeClass[resolvedSize]} ${startIcon ? styles.inputHasIcon : ""} ${trailingIcon ? styles.inputHasTrailingIcon : ""} ${error ? styles.inputError : ""} ${className}`}
          disabled={disabled}
          id={inputId}
          readOnly={readOnly}
          {...props}
        />
        {trailingIcon ? <span className={styles.trailingIcon}>{trailingIcon}</span> : null}
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
