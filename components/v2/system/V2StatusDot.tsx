import styles from "./V2System.module.css"

type V2StatusDotTone = "neutral" | "success" | "warning" | "danger" | "info"

type V2StatusDotProps = {
  tone?: V2StatusDotTone
}

const dotClass: Record<V2StatusDotTone, string> = {
  neutral: styles.dotNeutral,
  success: styles.dotSuccess,
  warning: styles.dotWarning,
  danger: styles.dotDanger,
  info: styles.dotInfo,
}

export function V2StatusDot({ tone = "neutral" }: V2StatusDotProps) {
  return <span aria-hidden="true" className={`${styles.statusDot} ${dotClass[tone]}`} />
}
