"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { V2IconButton } from "./V2IconButton"
import styles from "./V2System.module.css"

export type V2DrawerSide = "right" | "left" | "bottom"
export type V2DrawerSize = "sm" | "md" | "lg" | "xl" | "full"

export type V2DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  side?: V2DrawerSide
  size?: V2DrawerSize
  closeLabel?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}

export function V2Drawer({
  children,
  closeLabel = "Cerrar panel",
  closeOnBackdrop = true,
  closeOnEscape = true,
  description,
  footer,
  onClose,
  open,
  side = "right",
  size = "md",
  title,
}: V2DrawerProps) {
  const titleId = useId()
  const descId = useId()
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousActiveElement.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    if (drawerRef.current) {
      drawerRef.current.focus()
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

  const sideClassMap: Record<V2DrawerSide, string> = {
    right: styles.drawerSideRight,
    left: styles.drawerSideLeft,
    bottom: styles.drawerSideBottom,
  }

  const sizeClassMap: Record<V2DrawerSize, string> = {
    sm: styles.drawerSm,
    md: styles.drawerMd,
    lg: styles.drawerLg,
    xl: styles.drawerXl,
    full: styles.drawerFull,
  }

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose()
    }
  }

  return (
    <div className={styles.drawerOverlay} onClick={handleBackdropClick} role="presentation">
      <div
        aria-describedby={description ? descId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`${styles.drawerContainer} ${sideClassMap[side] || styles.drawerSideRight} ${sizeClassMap[size] || styles.drawerMd}`}
        onClick={(e) => e.stopPropagation()}
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.drawerHeader}>
          <div className={styles.drawerHeaderTitles}>
            <h2 className={styles.drawerTitle} id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className={styles.drawerDescription} id={descId}>
                {description}
              </p>
            ) : null}
          </div>
          <V2IconButton compact label={closeLabel} onClick={onClose}>
            <X size={18} />
          </V2IconButton>
        </header>
        <div className={styles.drawerContent}>{children}</div>
        {footer ? <footer className={styles.drawerFooter}>{footer}</footer> : null}
      </div>
    </div>
  )
}
