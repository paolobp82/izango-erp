"use client"

import styles from "./V2System.module.css"

export type V2TrendIndicatorProps = {
  value: string | number
  trend: "positive" | "negative" | "neutral"
}

export function V2TrendIndicator({ value, trend }: V2TrendIndicatorProps) {
  const trendClass =
    trend === "positive"
      ? styles.trendPositive
      : trend === "negative"
      ? styles.trendNegative
      : styles.trendNeutral

  return (
    <span className={`${styles.trendIndicator} ${trendClass}`}>
      {value}
    </span>
  )
}
