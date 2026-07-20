import type { ButtonHTMLAttributes, ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "destructive"
export type V2ButtonSize = "sm" | "md" | "lg" | "compact" | "normal"

export type V2ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: V2ButtonVariant
  size?: V2ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  /** @deprecated Alias for leadingIcon */
  icon?: ReactNode
}

const variantClass: Record<V2ButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDestructive,
  destructive: styles.buttonDestructive,
}

const sizeClass: Record<V2ButtonSize, string> = {
  sm: styles.buttonSm,
  compact: styles.buttonSm,
  md: styles.buttonMd,
  normal: styles.buttonMd,
  lg: styles.buttonLg,
}

export function V2Button({
  children,
  className = "",
  disabled = false,
  fullWidth = false,
  icon,
  leadingIcon,
  trailingIcon,
  loading = false,
  size = "md",
  variant = "secondary",
  type = "button",
  ...props
}: V2ButtonProps) {
  const startIcon = leadingIcon || icon
  const isDisabled = disabled || loading

  return (
    <button
      className={`${styles.button} ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? styles.buttonFullWidth : ""} ${className}`}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true">...</span>
      ) : startIcon ? (
        <span className={styles.buttonIcon}>{startIcon}</span>
      ) : null}
      {children ? <span className={styles.buttonText}>{children}</span> : null}
      {!loading && trailingIcon ? <span className={styles.buttonIcon}>{trailingIcon}</span> : null}
    </button>
  )
}
