"use client"

import type { ReactNode } from "react"

type DrawerProps = {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onClose?: () => void
  width?: number
}

export default function Drawer({ open, title, subtitle, children, footer, onClose, width = 420 }: DrawerProps) {
  if (!open) return null

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--iz-color-overlay)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          height: "100%",
          background: "var(--iz-color-surface)",
          boxShadow: "var(--iz-shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={{ padding: "20px 22px", borderBottom: "1px solid var(--iz-color-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--iz-color-text)" }}>{title}</h2>
              {subtitle && (
                <p style={{ margin: "6px 0 0", color: "var(--iz-color-text-muted)", fontSize: 13, lineHeight: 1.4 }}>
                  {subtitle}
                </p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid var(--iz-color-border)",
                  background: "var(--iz-color-surface)",
                  color: "var(--iz-color-text-muted)",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                x
              </button>
            )}
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: 22 }}>{children}</div>
        {footer && <footer style={{ padding: 18, borderTop: "1px solid var(--iz-color-border)" }}>{footer}</footer>}
      </aside>
    </div>
  )
}
