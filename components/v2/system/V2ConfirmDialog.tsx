"use client"

import type { ReactNode } from "react"
import { AlertTriangle, AlertCircle, Info } from "lucide-react"
import { V2Button } from "./V2Button"
import { V2Modal } from "./V2Modal"
import styles from "./V2System.module.css"

export type V2ConfirmTone = "neutral" | "warning" | "danger"

export type V2ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: V2ConfirmTone
  loading?: boolean
  disabled?: boolean
  children?: ReactNode
}

export function V2ConfirmDialog({
  cancelLabel = "Cancelar",
  children,
  confirmLabel = "Confirmar",
  disabled = false,
  loading = false,
  onClose,
  onConfirm,
  open,
  title,
  description,
  tone = "neutral",
}: V2ConfirmDialogProps) {
  const handleConfirm = () => {
    if (loading || disabled) return
    onConfirm()
  }

  const iconMap: Record<V2ConfirmTone, ReactNode> = {
    neutral: <Info className={styles.confirmIconNeutral} size={24} />,
    warning: <AlertTriangle className={styles.confirmIconWarning} size={24} />,
    danger: <AlertCircle className={styles.confirmIconDanger} size={24} />,
  }

  const confirmVariantMap: Record<V2ConfirmTone, "primary" | "secondary" | "danger"> = {
    neutral: "primary",
    warning: "secondary",
    danger: "danger",
  }

  const footer = (
    <div className={styles.confirmDialogActions}>
      <V2Button disabled={loading} onClick={onClose} variant="secondary">
        {cancelLabel}
      </V2Button>
      <V2Button
        disabled={disabled}
        loading={loading}
        onClick={handleConfirm}
        variant={confirmVariantMap[tone]}
      >
        {confirmLabel}
      </V2Button>
    </div>
  )

  return (
    <V2Modal
      description={description}
      footer={footer}
      onClose={onClose}
      open={open}
      size="sm"
      title={title}
    >
      <div className={styles.confirmDialogBody}>
        <div className={styles.confirmIconWrapper}>{iconMap[tone]}</div>
        {children ? <div className={styles.confirmContent}>{children}</div> : null}
      </div>
    </V2Modal>
  )
}
