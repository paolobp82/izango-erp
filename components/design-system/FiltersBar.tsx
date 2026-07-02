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
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
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
