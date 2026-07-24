"use client"

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2PopoverPlacement = "top" | "bottom" | "left" | "right"
export type V2PopoverAlign = "start" | "center" | "end"

export type V2PopoverProps = {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: V2PopoverPlacement
  align?: V2PopoverAlign
  offset?: number
  ariaLabel?: string
}

export function V2Popover({
  align = "start",
  ariaLabel = "Panel emergente",
  children,
  offset = 8,
  onOpenChange,
  open: controlledOpen,
  placement = "bottom",
  trigger,
}: V2PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = typeof controlledOpen === "boolean"
  const isOpen = isControlled ? controlledOpen : internalOpen

  const popoverId = useId()
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    const nextState = !isOpen
    if (!isControlled) {
      setInternalOpen(nextState)
    }
    onOpenChange?.(nextState)
  }

  const handleClose = useCallback(() => {
    if (!isControlled) {
      setInternalOpen(false)
    }
    onOpenChange?.(false)
  }, [isControlled, onOpenChange])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        handleClose()
      }
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isOpen, handleClose])

  const placementClassMap: Record<V2PopoverPlacement, string> = {
    top: styles.popoverPlacementTop,
    bottom: styles.popoverPlacementBottom,
    left: styles.popoverPlacementLeft,
    right: styles.popoverPlacementRight,
  }

  const alignClassMap: Record<V2PopoverAlign, string> = {
    start: styles.popoverAlignStart,
    center: styles.popoverAlignCenter,
    end: styles.popoverAlignEnd,
  }

  return (
    <div className={styles.popoverContainer} ref={popoverRef}>
      <div
        aria-controls={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={styles.popoverTriggerWrap}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleToggle()
          }
        }}
      >
        {trigger}
      </div>
      {isOpen ? (
        <section
          aria-label={ariaLabel}
          className={`${styles.popoverPanel} ${placementClassMap[placement]} ${alignClassMap[align]}`}
          id={popoverId}
          style={{ "--v2-popover-offset": `${offset}px` } as React.CSSProperties}
        >
          {children}
        </section>
      ) : null}
    </div>
  )
}
