"use client"

import type { ReactNode } from "react"

type FiltersBarProps = {
  children: ReactNode
  actions?: ReactNode
}

export default function FiltersBar({ children, actions }: FiltersBarProps) {
  return (
    <section
      style={{
        background: "var(--iz-color-surface)",
        border: "1px solid var(--iz-color-border)",
        borderRadius: "var(--iz-radius-lg)",
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        boxShadow: "var(--iz-shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          minWidth: 0,
          flex: 1,
        }}
      >
        {children}
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{actions}</div>}
    </section>
  )
}
