"use client"

import type { CSSProperties, ReactNode } from "react"
import Drawer from "./Drawer"
import { Button, Card, Modal } from "./base"

export function SimpleForm({ children, onSubmit, actions }: { children: ReactNode; onSubmit?: () => void; actions?: ReactNode }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
      style={{ display: "grid", gap: "var(--iz-space-4)" }}
    >
      {children}
      {actions ? <StickyActions>{actions}</StickyActions> : null}
    </form>
  )
}

export function SectionForm({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <Card style={{ display: "grid", gap: "var(--iz-space-4)" }}>
      <div>
        <h3 className="iz-heading" style={{ margin: 0 }}>{title}</h3>
        {description ? <p className="iz-body" style={{ margin: "4px 0 0", color: "var(--iz-color-text-muted)" }}>{description}</p> : null}
      </div>
      <div style={{ display: "grid", gap: "var(--iz-space-3)" }}>{children}</div>
    </Card>
  )
}

export function Wizard({
  steps,
  currentStep,
  children,
}: {
  steps: { id: string; label: ReactNode }[]
  currentStep: string
  children: ReactNode
}) {
  const activeIndex = Math.max(steps.findIndex((step) => step.id === currentStep), 0)
  return (
    <div style={{ display: "grid", gap: "var(--iz-space-5)" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {steps.map((step, index) => (
          <div key={step.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: index <= activeIndex ? "var(--iz-color-brand-700)" : "var(--iz-color-text-muted)", fontWeight: 800, fontSize: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: "var(--iz-radius-full)", display: "inline-grid", placeItems: "center", background: index <= activeIndex ? "var(--iz-color-brand-50)" : "var(--iz-color-surface-muted)" }}>{index + 1}</span>
            {step.label}
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}

export function DrawerForm({ open, title, subtitle, onClose, children, actions }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  return (
    <Drawer open={open} title={title} subtitle={subtitle} onClose={onClose}>
      <div style={{ display: "grid", gap: "var(--iz-space-4)" }}>
        {children}
        {actions ? <StickyActions>{actions}</StickyActions> : null}
      </div>
    </Drawer>
  )
}

export function ModalForm({ open, title, onClose, children, actions }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div style={{ display: "grid", gap: "var(--iz-space-4)" }}>
        {children}
        {actions ? <StickyActions>{actions}</StickyActions> : null}
      </div>
    </Modal>
  )
}

export function StickyActions({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "sticky", bottom: 0, display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: "var(--iz-space-3)", background: "var(--iz-color-surface)", ...style }}>
      {children}
    </div>
  )
}

export function ValidationMessage({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "var(--iz-color-danger)", fontSize: 12 }}>{children}</p>
}

export function DirtyState({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, border: "1px solid var(--iz-color-warning-soft)", borderRadius: "var(--iz-radius-md)", background: "var(--iz-color-warning-soft)", color: "var(--iz-color-warning)" }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>Hay cambios sin guardar</span>
      <span style={{ display: "inline-flex", gap: 8 }}>
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>Descartar</Button>
        <Button type="button" size="sm" onClick={onSave}>Guardar</Button>
      </span>
    </div>
  )
}

export function ReadonlyField({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <div className="iz-label" style={{ color: "var(--iz-color-text-muted)" }}>{label}</div>
      <div style={{ marginTop: 4, color: "var(--iz-color-text)", fontSize: 13, fontWeight: 700 }}>{value || "-"}</div>
    </div>
  )
}
