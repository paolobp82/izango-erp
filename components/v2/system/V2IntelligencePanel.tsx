"use client"

import { AlertCircle, Lightbulb, TrendingUp } from "lucide-react"
import styles from "./V2System.module.css"

export type V2IntelligenceItem = {
  type: "risk" | "opportunity" | "recommendation"
  label: string
  content: string
}

export type V2IntelligencePanelProps = {
  summary: string
  items: V2IntelligenceItem[]
}

export function V2IntelligencePanel({ summary, items }: V2IntelligencePanelProps) {
  return (
    <div className={styles.intelligenceCard}>
      <div className={styles.intelligenceSummary}>{summary}</div>
      <div className={styles.intelligenceItems}>
        {items.map((item) => {
          const isRisk = item.type === "risk"
          const isOpp = item.type === "opportunity"

          const Icon = isRisk ? AlertCircle : isOpp ? TrendingUp : Lightbulb
          const iconClass = isRisk
            ? styles.intelligenceIconRisk
            : isOpp
            ? styles.intelligenceIconOpp
            : styles.intelligenceIconRec

          return (
            <div className={styles.intelligenceItem} key={item.label}>
              <span className={`${styles.intelligenceIcon} ${iconClass}`}>
                <Icon size={14} />
              </span>
              <div className={styles.intelligenceContent}>
                <span className={styles.intelligenceLabel}>{item.label}</span>
                <p className={styles.intelligenceValue}>{item.content}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
