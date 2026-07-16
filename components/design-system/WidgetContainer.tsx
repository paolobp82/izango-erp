"use client"

import type { ReactNode } from "react"
import EmptyState from "./EmptyState"
import { Button, Card, ErrorState, LoadingState, Toolbar } from "./base"

type WidgetContainerProps = {
  title: ReactNode
  period?: ReactNode
  config?: ReactNode
  toolbar?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  loading?: boolean
  error?: ReactNode
  empty?: boolean
  emptyTitle?: string
  resizable?: boolean
}

export default function WidgetContainer({
  title,
  period,
  config,
  toolbar,
  actions,
  footer,
  children,
  loading,
  error,
  empty,
  emptyTitle = "Sin información para mostrar",
  resizable,
}: WidgetContainerProps) {
  return (
    <Card style={{ display: "grid", gap: "var(--iz-space-4)", resize: resizable ? "both" : undefined, overflow: resizable ? "auto" : undefined }}>
      <Toolbar>
        <div>
          <h3 className="iz-heading" style={{ margin: 0 }}>{title}</h3>
          {period ? <div className="iz-caption" style={{ marginTop: 4, color: "var(--iz-color-text-muted)" }}>{period}</div> : null}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {config ? <Button type="button" variant="secondary" size="sm">{config}</Button> : null}
          {actions}
        </div>
      </Toolbar>
      {toolbar}
      {loading ? <LoadingState /> : error ? <ErrorState detail={error} /> : empty ? <EmptyState title={emptyTitle} /> : children}
      {footer ? <div style={{ borderTop: "1px solid var(--iz-color-border)", paddingTop: "var(--iz-space-3)" }}>{footer}</div> : null}
    </Card>
  )
}

export type { WidgetContainerProps }
