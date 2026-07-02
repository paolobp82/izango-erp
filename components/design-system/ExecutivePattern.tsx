"use client"

import type { ReactNode } from "react"
import ExecutiveSummary from "./ExecutiveSummary"

type ExecutiveBlock = {
  title: string
  content: ReactNode
  action?: ReactNode
}

type ExecutivePatternProps = {
  summaryItems?: Parameters<typeof ExecutiveSummary>[0]["items"]
  alerts?: ReactNode
  quickActions?: ReactNode
  blocks?: ExecutiveBlock[]
}

export default function ExecutivePattern({ summaryItems, alerts, quickActions, blocks = [] }: ExecutivePatternProps) {
  return (
    <section style={{ display: "grid", gap: 18 }}>
      {summaryItems && <ExecutiveSummary items={summaryItems} />}
      {(alerts || quickActions) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: quickActions ? "minmax(0, 1fr) auto" : "1fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          {alerts}
          {quickActions}
        </div>
      )}
      {blocks.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          {blocks.map((block) => (
            <article
              key={block.title}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                overflow: "hidden",
              }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#0F172A" }}>{block.title}</h3>
                {block.action}
              </header>
              <div style={{ padding: 16 }}>{block.content}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
