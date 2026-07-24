"use client"

import { useState, type CSSProperties, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info"
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

const toneVars: Record<Tone, { bg: string; text: string; border: string }> = {
  neutral: { bg: "var(--iz-color-surface-muted)", text: "var(--iz-color-text)", border: "var(--iz-color-border)" },
  brand: { bg: "var(--iz-color-brand-50)", text: "var(--iz-color-brand-900)", border: "var(--iz-color-brand-100)" },
  success: { bg: "var(--iz-color-success-soft)", text: "var(--iz-color-success)", border: "var(--iz-color-success-soft)" },
  warning: { bg: "var(--iz-color-warning-soft)", text: "var(--iz-color-warning)", border: "var(--iz-color-warning-soft)" },
  danger: { bg: "var(--iz-color-danger-soft)", text: "var(--iz-color-danger)", border: "var(--iz-color-danger-soft)" },
  info: { bg: "var(--iz-color-info-soft)", text: "var(--iz-color-info)", border: "var(--iz-color-info-soft)" },
}

const fieldStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--iz-color-border)",
  borderRadius: "var(--iz-radius-md)",
  background: "var(--iz-color-surface)",
  color: "var(--iz-color-text)",
  fontFamily: "var(--iz-font-sans)",
  fontSize: "var(--iz-font-size-body)",
  padding: "9px 11px",
  outline: "none",
}

export function Button({
  variant = "primary",
  size = "md",
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: Size }) {
  const sizes: Record<Size, CSSProperties> = {
    sm: { minHeight: 30, padding: "6px 10px", fontSize: 12 },
    md: { minHeight: 36, padding: "8px 14px", fontSize: 13 },
    lg: { minHeight: 42, padding: "10px 18px", fontSize: 14 },
  }
  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: { background: "var(--iz-color-brand-400)", color: "var(--iz-color-on-brand)", border: "1px solid var(--iz-color-brand-400)" },
    secondary: { background: "var(--iz-color-surface)", color: "var(--iz-color-text)", border: "1px solid var(--iz-color-border)" },
    ghost: { background: "transparent", color: "var(--iz-color-text)", border: "1px solid transparent" },
    danger: { background: "var(--iz-color-danger)", color: "var(--iz-color-on-danger)", border: "1px solid var(--iz-color-danger)" },
  }
  return (
    <button
      {...props}
      style={{
        ...sizes[size],
        ...variants[variant],
        borderRadius: "var(--iz-radius-md)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--iz-font-sans)",
        fontWeight: 700,
        opacity: props.disabled ? "var(--iz-opacity-disabled)" : 1,
        ...style,
      }}
    />
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...fieldStyle, ...props.style }} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...fieldStyle, minHeight: 96, resize: "vertical", ...props.style }} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...fieldStyle, ...props.style }} />
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--iz-color-text)", fontSize: 13 }}>
      <input type="checkbox" {...props} />
      {label}
    </label>
  )
}

export function Radio({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--iz-color-text)", fontSize: 13 }}>
      <input type="radio" {...props} />
      {label}
    </label>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, background: "transparent", color: "var(--iz-color-text)", cursor: "pointer" }}
    >
      <span
        style={{
          width: 38,
          height: 22,
          borderRadius: "var(--iz-radius-full)",
          background: checked ? "var(--iz-color-brand-400)" : "var(--iz-color-border)",
          padding: 2,
          display: "inline-flex",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "var(--iz-radius-full)", background: "var(--iz-color-surface)" }} />
      </span>
      {label}
    </button>
  )
}

export function Badge({ tone = "neutral", children, style }: { tone?: Tone; children: ReactNode; style?: CSSProperties }) {
  const vars = toneVars[tone]
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "var(--iz-radius-full)",
        border: `1px solid ${vars.border}`,
        background: vars.bg,
        color: vars.text,
        fontSize: 11,
        fontWeight: 800,
        padding: "3px 9px",
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function Avatar({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
  return src ? (
    <span aria-label={name} role="img" style={{ width: size, height: size, borderRadius: "var(--iz-radius-full)", display: "inline-flex", backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: "var(--iz-radius-full)", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--iz-color-brand-50)", color: "var(--iz-color-brand-900)", fontSize: 12, fontWeight: 800 }}>
      {initials || "IZ"}
    </span>
  )
}

export function Tooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <span title={typeof label === "string" ? label : undefined} style={{ display: "inline-flex" }}>{children}</span>
}

export function Dropdown({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" onClick={() => setOpen((value) => !value)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>{trigger}</button>
      {open && (
        <span style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 30, minWidth: 180, background: "var(--iz-color-surface)", border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-lg)", boxShadow: "var(--iz-shadow-lg)", padding: 8 }}>
          {children}
        </span>
      )}
    </span>
  )
}

export function Card({ children, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} style={{ background: "var(--iz-color-surface)", border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-lg)", boxShadow: "var(--iz-shadow-sm)", padding: "var(--iz-space-5)", ...style }}>{children}</div>
}

export function Toolbar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", ...style }}>{children}</div>
}

export function Tabs({ items, value, onChange }: { items: { value: string; label: ReactNode }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--iz-color-border)", gap: 4 }}>
      {items.map((item) => (
        <button key={item.value} type="button" onClick={() => onChange(item.value)} style={{ padding: "10px 12px", border: 0, borderBottom: value === item.value ? "2px solid var(--iz-color-brand-400)" : "2px solid transparent", background: "transparent", color: value === item.value ? "var(--iz-color-brand-700)" : "var(--iz-color-text-muted)", fontWeight: 800, cursor: "pointer" }}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function Divider() {
  return <hr style={{ border: 0, borderTop: "1px solid var(--iz-color-border)", margin: "var(--iz-space-4) 0" }} />
}

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  const vars = toneVars[tone]
  return <div style={{ border: `1px solid ${vars.border}`, background: vars.bg, color: vars.text, borderRadius: "var(--iz-radius-md)", padding: "10px 12px", fontSize: 13 }}>{children}</div>
}

export function Toast({ tone = "success", children }: { tone?: Tone; children: ReactNode }) {
  return <Alert tone={tone}>{children}</Alert>
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: ReactNode; children: ReactNode; onClose: () => void }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--iz-color-overlay)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(560px, 100%)", background: "var(--iz-color-surface)", border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-xl)", boxShadow: "var(--iz-shadow-lg)", padding: 20 }}>
        <Toolbar><h2 className="iz-heading" style={{ margin: 0 }}>{title}</h2><Button variant="ghost" onClick={onClose}>Cerrar</Button></Toolbar>
        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </div>
  )
}

export const Dialog = Modal

export function Skeleton({ height = 16, width = "100%" }: { height?: number; width?: number | string }) {
  return <span style={{ display: "block", width, height, borderRadius: "var(--iz-radius-sm)", background: "linear-gradient(90deg, var(--iz-color-surface-muted), var(--iz-color-border), var(--iz-color-surface-muted))" }} />
}

export function ErrorState({ title = "No se pudo cargar la información", detail }: { title?: string; detail?: ReactNode }) {
  return <Alert tone="danger"><strong>{title}</strong>{detail ? <div style={{ marginTop: 4 }}>{detail}</div> : null}</Alert>
}

export function PermissionState({ message = "No tienes permiso para ver esta información." }: { message?: string }) {
  return <Alert tone="warning">{message}</Alert>
}

export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return <div style={{ display: "grid", gap: 8 }}><Skeleton /><Skeleton width="72%" /><span style={{ color: "var(--iz-color-text-muted)", fontSize: 12 }}>{label}</span></div>
}
