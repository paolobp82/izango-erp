"use client"

import type { ReactNode } from "react"
import StatusBadge from "./StatusBadge"

type FinancialSummaryItem = {
  label: string
  value: ReactNode
  helper?: ReactNode
  status?: {
    label: string
    type?: string
  }
}

type FinancialSummaryPatternProps = {
  title?: string
  items: FinancialSummaryItem[]
  footer?: ReactNode
}

export default function FinancialSummaryPattern({ title, items, footer }: FinancialSummaryPatternProps) {
  return (
    <section
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
        overflow: "hidden",
      }}
    >
      {title && (
        <header style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: 14, fontWeight: 900 }}>{title}</h3>
        </header>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0 }}>
        {items.map((item) => (
          <article key={item.label} style={{ padding: 16, borderRight: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>{item.label}</div>
              {item.status && <StatusBadge label={item.status.label} type={item.status.type} />}
            </div>
            <div style={{ color: "#0F172A", fontSize: 22, lineHeight: 1.1, fontWeight: 900 }}>{item.value}</div>
            {item.helper && <div style={{ marginTop: 8, color: "#64748B", fontSize: 12 }}>{item.helper}</div>}
          </article>
        ))}
      </div>
      {footer && <footer style={{ padding: 14, borderTop: "1px solid #F1F5F9" }}>{footer}</footer>}
    </section>
  )
}
