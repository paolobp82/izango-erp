"use client"

import type { ReactNode } from "react"

type SummaryTone = "default" | "success" | "warning" | "danger" | "info"

type SummaryItem = {
  label: string
  value: ReactNode
  subtitle?: ReactNode
  tone?: SummaryTone
}

type ExecutiveSummaryProps = {
  items: SummaryItem[]
  columns?: number
}

const TONES: Record<SummaryTone, { border: string; value: string; bg: string }> = {
  default: { border: "#E2E8F0", value: "#0F172A", bg: "#FFFFFF" },
  success: { border: "#03E373", value: "#0F6E56", bg: "#FFFFFF" },
  warning: { border: "#F59E0B", value: "#B45309", bg: "#FFFFFF" },
  danger: { border: "#EF4444", value: "#B91C1C", bg: "#FFFFFF" },
  info: { border: "#3B82F6", value: "#1D4ED8", bg: "#FFFFFF" },
}

export default function ExecutiveSummary({ items, columns = 4 }: ExecutiveSummaryProps) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 14,
      }}
    >
      {items.map((item) => {
        const tone = TONES[item.tone || "default"]
        return (
          <article
            key={item.label}
            style={{
              minHeight: 104,
              background: tone.bg,
              border: "1px solid #E2E8F0",
              borderLeft: `4px solid ${tone.border}`,
              borderRadius: 14,
              padding: "16px 18px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 10 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 900, color: tone.value }}>
              {item.value}
            </div>
            {item.subtitle && (
              <div style={{ marginTop: 8, color: "#64748B", fontSize: 12, lineHeight: 1.35 }}>
                {item.subtitle}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
