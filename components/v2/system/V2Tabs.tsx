"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2TabItem = {
  id: string
  label: string
  disabled?: boolean
  icon?: ReactNode
}

export type V2TabsVariant = "underline" | "contained"

export type V2TabsProps = {
  items: V2TabItem[]
  value?: string
  /** @deprecated Alias for value */
  activeId?: string
  onValueChange?: (value: string) => void
  /** @deprecated Alias for onValueChange */
  onChange?: (id: string) => void
  variant?: V2TabsVariant
  ariaLabel?: string
}

export function V2Tabs({
  activeId,
  ariaLabel = "Secciones",
  items,
  onChange,
  onValueChange,
  value,
  variant = "underline",
}: V2TabsProps) {
  const currentValue = value !== undefined ? value : activeId
  const handleChange = (id: string) => {
    if (onValueChange) onValueChange(id)
    if (onChange) onChange(id)
  }

  return (
    <div
      aria-label={ariaLabel}
      className={`${styles.tabs} ${variant === "contained" ? styles.tabsContained : styles.tabsUnderline}`}
      role="tablist"
    >
      {items.map((item) => {
        const isSelected = currentValue === item.id

        return (
          <button
            aria-selected={isSelected}
            className={`${styles.tab} ${isSelected ? styles.tabActive : ""}`}
            disabled={item.disabled}
            key={item.id}
            onClick={() => handleChange(item.id)}
            role="tab"
            type="button"
          >
            {item.icon ? <span className={styles.tabIcon}>{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
