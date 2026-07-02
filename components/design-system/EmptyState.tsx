"use client"

import type { ReactNode } from "react"

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export default function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div
      style={{
        minHeight: 180,
        border: "1px dashed #CBD5E1",
        borderRadius: 14,
        background: "#FFFFFF",
        display: "grid",
        placeItems: "center",
        padding: 28,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        {icon && (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "#ECFDF5",
              color: "#0F6E56",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            {icon}
          </div>
        )}
        <h3 style={{ margin: 0, color: "#0F172A", fontSize: 16, fontWeight: 900 }}>{title}</h3>
        {description && (
          <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: 13, lineHeight: 1.45 }}>
            {description}
          </p>
        )}
        {action && <div style={{ marginTop: 16 }}>{action}</div>}
      </div>
    </div>
  )
}
