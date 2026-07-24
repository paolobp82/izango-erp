"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { V2IconButton } from "./V2IconButton"
import styles from "./V2System.module.css"

export type V2ModalSize = "sm" | "md" | "lg" | "xl" | "full"

export type V2ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: V2ModalSize
  closeLabel?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}

export function V2Modal({
  children,
  closeLabel = "Cerrar modal",
  closeOnBackdrop = true,
  closeOnEscape = true,
  description,
  footer,
  onClose,
  open,
  size = "md",
  title,
}: V2ModalProps) {
  const titleId = useId()
  const descId = useId()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousActiveElement.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    if (modalRef.current) {
      modalRef.current.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus()
      }
    }
  }, [open, closeOnEscape, onClose])

  if (!open) return null

  const sizeClassMap: Record<V2ModalSize, string> = {
    sm: styles.modalSm,
    md: styles.modalMd,
    lg: styles.modalLg,
    xl: styles.modalXl,
    full: styles.modalFull,
  }

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick} role="presentation">
      <div
        aria-describedby={description ? descId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`${styles.modalSurface} ${sizeClassMap[size] || styles.modalMd}`}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <div className={styles.modalHeaderTitles}>
            <h2 className={styles.modalTitle} id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className={styles.modalDescription} id={descId}>
                {description}
              </p>
            ) : null}
          </div>
          <V2IconButton compact label={closeLabel} onClick={onClose}>
            <X size={16} />
          </V2IconButton>
        </header>
        <div className={styles.modalBody}>{children}</div>
        {footer ? <footer className={styles.modalFooter}>{footer}</footer> : null}
      </div>
    </div>
  )
}
