"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2KpiTrendDirection = "up" | "down" | "neutral" | "positive" | "negative"
export type V2KpiTone = "neutral" | "primary" | "success" | "warning" | "error"

export type V2KpiTrendObject = {
  direction: V2KpiTrendDirection
  value: string
  label?: string
}

export type V2KpiCardProps = {
  label: string
  value: ReactNode
  description?: string
  /** @deprecated Alias for description */
  meta?: string
  icon?: ReactNode
  trend?: V2KpiTrendDirection | V2KpiTrendObject
  variation?: string
  indicatorColor?: string
  trendLabel?: string
  tone?: V2KpiTone
  loading?: boolean
  density?: "compact" | "normal"
}

const toneClassMap: Record<V2KpiTone, string> = {
  neutral: styles.kpiToneNeutral,
  primary: styles.kpiTonePrimary,
  success: styles.kpiToneSuccess,
  warning: styles.kpiToneWarning,
  error: styles.kpiToneError,
}

export function V2KpiCard({
  density = "normal",
  description,
  icon,
  indicatorColor,
  label,
  loading = false,
  meta,
  tone = "neutral",
  trend,
  trendLabel,
  value,
  variation,
}: V2KpiCardProps) {
  const isCompact = density === "compact"
  const resolvedDescription = description || meta

  let trendDirection: V2KpiTrendDirection = "neutral"
  let trendText: string | undefined = trendLabel || variation

  if (typeof trend === "object" && trend !== null) {
    trendDirection = trend.direction
    trendText = trend.value ? `${trend.label ? `${trend.label}: ` : ""}${trend.value}` : trend.label
  } else if (typeof trend === "string") {
    trendDirection = trend
  }

  const resolvedTrendClass =
    trendDirection === "up" || trendDirection === "positive"
      ? styles.trendPositive
      : trendDirection === "down" || trendDirection === "negative"
      ? styles.trendNegative
      : styles.trendNeutral

  if (loading) {
    return (
      <article className={`${styles.premiumKpiCard} ${isCompact ? styles.premiumKpiCardCompact : ""}`}>
        <div className={styles.kpiTopRow}>
          <span className={styles.skeleton} style={{ height: 28, width: 28, borderRadius: 6 }} />
          <span className={styles.skeleton} style={{ height: 16, width: 48, borderRadius: 999 }} />
        </div>
        <div className={`${styles.kpiMainContent} ${isCompact ? styles.kpiMainContentCompact : ""}`}>
          <span className={styles.skeleton} style={{ height: 12, width: "60%" }} />
          <span className={styles.skeleton} style={{ height: 24, width: "80%", marginTop: 4 }} />
        </div>
      </article>
    )
  }

  return (
    <article className={`${styles.premiumKpiCard} ${toneClassMap[tone]} ${isCompact ? styles.premiumKpiCardCompact : ""}`}>
      <div className={styles.kpiTopRow}>
        {icon ? (
          <div aria-hidden="true" className={`${styles.kpiIconBox} ${isCompact ? styles.kpiIconBoxCompact : ""}`}>
            {icon}
          </div>
        ) : <div />}
        {trendText ? (
          <span className={`${styles.trendIndicator} ${resolvedTrendClass} ${isCompact ? styles.trendIndicatorCompact : ""}`}>
            {trendText}
          </span>
        ) : null}
      </div>

      <div className={`${styles.kpiMainContent} ${isCompact ? styles.kpiMainContentCompact : ""}`}>
        <span className={styles.kpiLabelText}>{label}</span>
        <div className={`${styles.kpiValueText} ${isCompact ? styles.kpiValueTextCompact : ""}`}>{value}</div>
      </div>

      {!isCompact && (resolvedDescription || indicatorColor) ? (
        <div className={styles.kpiBottomRow}>
          {resolvedDescription ? <p className={styles.kpiDescText}>{resolvedDescription}</p> : null}
          {indicatorColor ? (
            <span className={styles.kpiIndicatorDot} style={{ background: indicatorColor }} />
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
