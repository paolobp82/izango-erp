import type { ButtonHTMLAttributes, ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2IconButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "destructive"
export type V2IconButtonSize = "sm" | "md" | "lg"

export type V2IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  label?: string
  "aria-label"?: string
  variant?: V2IconButtonVariant
  size?: V2IconButtonSize
  compact?: boolean
  loading?: boolean
}

const variantClass: Record<V2IconButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDestructive,
  destructive: styles.buttonDestructive,
}

const sizeClass: Record<V2IconButtonSize, string> = {
  sm: styles.iconButtonSm,
  md: styles.iconButtonMd,
  lg: styles.iconButtonLg,
}

export function V2IconButton({
  children,
  className = "",
  compact = false,
  disabled = false,
  label,
  "aria-label": ariaLabel,
  loading = false,
  size = "md",
  variant = "ghost",
  type = "button",
  ...props
}: V2IconButtonProps) {
  const accessibleName = ariaLabel || label || "Boton de accion"
  const resolvedSize = compact ? "sm" : size
  const isDisabled = disabled || loading

  return (
    <button
      aria-label={accessibleName}
      className={`${styles.iconButton} ${variantClass[variant]} ${sizeClass[resolvedSize]} ${className}`}
      disabled={isDisabled}
      title={accessibleName}
      type={type}
      {...props}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true">...</span> : children}
    </button>
  )
}
