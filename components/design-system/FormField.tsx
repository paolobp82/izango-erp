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
      <span style={{ color: "#334155", fontSize: 12, fontWeight: 800 }}>
        {label}
        {required && <span style={{ color: "#EF4444", marginLeft: 4 }}>*</span>}
      </span>
      {children}
      {error ? (
        <span style={{ color: "#B91C1C", fontSize: 11, lineHeight: 1.35 }}>{error}</span>
      ) : help ? (
        <span style={{ color: "#64748B", fontSize: 11, lineHeight: 1.35 }}>{help}</span>
      ) : null}
    </label>
  )
}
