"use client"

import type { CSSProperties, ReactNode } from "react"

type MasterPageProps = {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
  maxWidth?: number | string
  style?: CSSProperties
}

export default function MasterPage({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  maxWidth = "100%",
  style,
}: MasterPageProps) {
  return (
    <main
      style={{
        width: "100%",
        maxWidth,
        margin: "0 auto",
        padding: "24px",
        color: "#0F172A",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0,
                color: "#0F6E56",
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, fontWeight: 900 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: "8px 0 0", color: "#64748B", fontSize: 14, lineHeight: 1.45 }}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{actions}</div>}
      </header>

      {children}
    </main>
  )
}
