"use client"

import type { ReactNode } from "react"

type FormFieldProps = {
  label: string
  children: ReactNode
  help?: ReactNode
  error?: ReactNode
  required?: boolean
}

export default function FormField({ label, children, help, error, required }: FormFieldProps) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span style={{ color: "var(--iz-color-text)", fontSize: 12, fontWeight: 800 }}>
        {label}
        {required && <span style={{ color: "var(--iz-color-danger)", marginLeft: 4 }}>*</span>}
      </span>
      {children}
      {error ? (
        <span style={{ color: "var(--iz-color-danger)", fontSize: 11, lineHeight: 1.35 }}>{error}</span>
      ) : help ? (
        <span style={{ color: "var(--iz-color-text-muted)", fontSize: 11, lineHeight: 1.35 }}>{help}</span>
      ) : null}
    </label>
  )
}
