"use client"

import { useEffect, type ReactNode } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react"
import { V2Button } from "./V2Button"
import { V2IconButton } from "./V2IconButton"
import styles from "./V2System.module.css"

export type V2ToastTone = "info" | "success" | "warning" | "error"

export type V2ToastAction = {
  label: string
  onClick: () => void
}

export type V2ToastProps = {
  title: string
  description?: string
  tone?: V2ToastTone
  action?: V2ToastAction
  onDismiss?: () => void
  duration?: number
  open?: boolean
}

export function V2Toast({
  action,
  description,
  duration,
  onDismiss,
  open = true,
  title,
  tone = "info",
}: V2ToastProps) {
  useEffect(() => {
    if (!open || !duration || duration <= 0 || !onDismiss) return
    const timer = setTimeout(() => {
      onDismiss()
    }, duration)
    return () => clearTimeout(timer)
  }, [open, duration, onDismiss])

  if (!open) return null

  const iconMap: Record<V2ToastTone, ReactNode> = {
    info: <Info className={styles.toastIconInfo} size={18} />,
    success: <CheckCircle2 className={styles.toastIconSuccess} size={18} />,
    warning: <AlertTriangle className={styles.toastIconWarning} size={18} />,
    error: <AlertCircle className={styles.toastIconError} size={18} />,
  }

  const toneClassMap: Record<V2ToastTone, string> = {
    info: styles.toastToneInfo,
    success: styles.toastToneSuccess,
    warning: styles.toastToneWarning,
    error: styles.toastToneError,
  }

  const role = tone === "warning" || tone === "error" ? "alert" : "status"

  return (
    <article aria-atomic="true" className={`${styles.toast} ${toneClassMap[tone]}`} role={role}>
      <div className={styles.toastIconWrap}>{iconMap[tone]}</div>
      <div className={styles.toastContent}>
        <h4 className={styles.toastTitle}>{title}</h4>
        {description ? <p className={styles.toastDescription}>{description}</p> : null}
        {action ? (
          <div className={styles.toastActionWrap}>
            <V2Button onClick={action.onClick} size="sm" variant="secondary">
              {action.label}
            </V2Button>
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <V2IconButton compact label="Cerrar notificacion" onClick={onDismiss}>
          <X size={14} />
        </V2IconButton>
      ) : null}
    </article>
  )
}

export type V2ToastViewportProps = {
  children: ReactNode
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left"
}

export function V2ToastViewport({ children, position = "bottom-right" }: V2ToastViewportProps) {
  const positionClassMap: Record<NonNullable<V2ToastViewportProps["position"]>, string> = {
    "top-right": styles.toastViewportTopRight,
    "bottom-right": styles.toastViewportBottomRight,
    "top-left": styles.toastViewportTopLeft,
    "bottom-left": styles.toastViewportBottomLeft,
  }

  return <section aria-label="Notificaciones" className={`${styles.toastViewport} ${positionClassMap[position]}`}>{children}</section>
}
