"use client"

import type { ReactNode } from "react"
import EmptyState from "./EmptyState"

type TimelineItem = {
  id: string
  title: string
  description?: ReactNode
  meta?: ReactNode
  markerColor?: string
}

type TimelinePatternProps = {
  items: TimelineItem[]
  emptyTitle?: string
  emptyDescription?: string
}

export default function TimelinePattern({
  items,
  emptyTitle = "Sin actividad",
  emptyDescription = "Aún no hay eventos registrados.",
}: TimelinePatternProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0 }}>
      {items.map((item, index) => (
        <li key={item.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 12 }}>
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: item.markerColor || "#0F6E56",
                marginTop: 5,
                zIndex: 1,
              }}
            />
            {index < items.length - 1 && (
              <span style={{ position: "absolute", top: 18, bottom: 0, width: 1, background: "#E2E8F0" }} />
            )}
          </div>
          <article style={{ paddingBottom: index < items.length - 1 ? 18 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h4 style={{ margin: 0, color: "#0F172A", fontSize: 13, fontWeight: 900 }}>{item.title}</h4>
              {item.meta && <div style={{ color: "#64748B", fontSize: 12, whiteSpace: "nowrap" }}>{item.meta}</div>}
            </div>
            {item.description && (
              <div style={{ marginTop: 5, color: "#475569", fontSize: 12, lineHeight: 1.45 }}>
                {item.description}
              </div>
            )}
          </article>
        </li>
      ))}
    </ol>
  )
}
