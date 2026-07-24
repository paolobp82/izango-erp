"use client"

import { useId, useState, useRef, type ReactNode, type KeyboardEvent } from "react"
import styles from "./V2System.module.css"

export type V2TooltipPlacement = "top" | "bottom" | "left" | "right"

export type V2TooltipProps = {
  children: ReactNode
  content: string
  placement?: V2TooltipPlacement
  delay?: number
  disabled?: boolean
}

export function V2Tooltip({
  children,
  content,
  delay = 200,
  disabled = false,
  placement = "top",
}: V2TooltipProps) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    if (disabled || !content) return
    timeoutRef.current = setTimeout(() => {
      setVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setVisible(false)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      hideTooltip()
    }
  }

  const placementClassMap: Record<V2TooltipPlacement, string> = {
    top: styles.tooltipTop,
    bottom: styles.tooltipBottom,
    left: styles.tooltipLeft,
    right: styles.tooltipRight,
  }

  return (
    <span
      aria-describedby={visible ? tooltipId : undefined}
      className={styles.tooltipWrap}
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onKeyDown={handleKeyDown}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {visible && !disabled ? (
        <span
          className={`${styles.tooltip} ${placementClassMap[placement] || styles.tooltipTop}`}
          id={tooltipId}
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
