"use client"

import type { ReactNode } from "react"

type WizardStep = {
  id: string
  title: string
  description?: string
}

type WizardPatternProps = {
  steps: WizardStep[]
  activeStep: string
  children: ReactNode
  footer?: ReactNode
}

export default function WizardPattern({ steps, activeStep, children, footer }: WizardPatternProps) {
  const activeIndex = Math.max(steps.findIndex((step) => step.id === activeStep), 0)

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
      <header
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          gap: 0,
          borderBottom: "1px solid #E2E8F0",
          background: "#F8FAFC",
        }}
      >
        {steps.map((step, index) => {
          const active = step.id === activeStep
          const completed = index < activeIndex
          return (
            <div key={step.id} style={{ padding: "14px 16px", borderBottom: active ? "2px solid #03E373" : 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: active || completed ? "#0F6E56" : "#E2E8F0",
                  color: active || completed ? "#FFFFFF" : "#64748B",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 900,
                  marginBottom: 8,
                }}
              >
                {index + 1}
              </div>
              <div style={{ color: active ? "#0F172A" : "#475569", fontSize: 13, fontWeight: 900 }}>
                {step.title}
              </div>
              {step.description && (
                <div style={{ marginTop: 4, color: "#64748B", fontSize: 11, lineHeight: 1.35 }}>
                  {step.description}
                </div>
              )}
            </div>
          )
        })}
      </header>
      <div style={{ padding: 20 }}>{children}</div>
      {footer && <footer style={{ padding: 16, borderTop: "1px solid #E2E8F0" }}>{footer}</footer>}
    </section>
  )
}
