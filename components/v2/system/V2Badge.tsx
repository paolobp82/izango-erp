import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2BadgeVariant = "neutral" | "success" | "warning" | "error" | "information" | "primary" | "danger" | "info" | "outlined"
export type V2BadgeSize = "sm" | "md"

export type V2BadgeProps = {
  children: ReactNode
  variant?: V2BadgeVariant
  /** @deprecated Alias for variant */
  tone?: V2BadgeVariant
  size?: V2BadgeSize
  dot?: boolean
}

const variantClass: Record<V2BadgeVariant, string> = {
  neutral: styles.badgeNeutral,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  error: styles.badgeDanger,
  danger: styles.badgeDanger,
  information: styles.badgeInfo,
  info: styles.badgeInfo,
  primary: styles.badgePrimary,
  outlined: styles.badgeOutlined,
}

const sizeClass: Record<V2BadgeSize, string> = {
  sm: styles.badgeSm,
  md: styles.badgeMd,
}

export function V2Badge({ children, dot = false, size = "md", tone, variant = "neutral" }: V2BadgeProps) {
  const resolvedVariant = tone || variant

  return (
    <span className={`${styles.badge} ${variantClass[resolvedVariant]} ${sizeClass[size]}`}>
      {dot ? <span className={styles.badgeDot} aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  )
}
