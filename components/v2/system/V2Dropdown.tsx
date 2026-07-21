"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import styles from "./V2System.module.css"

type V2DropdownItem = {
  icon?: ReactNode
  label: string
  onSelect: () => void
}

type V2DropdownProps = {
  items: V2DropdownItem[]
  trigger: ReactNode
}

export function V2Dropdown({ items, trigger }: V2DropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className={styles.dropdownWrap}>
      <button className={styles.dropdownTrigger} onClick={() => setOpen((value) => !value)} type="button">
        {trigger}
      </button>
      {open ? (
        <span className={styles.dropdownMenu}>
          {items.map((item) => (
            <button
              className={styles.dropdownItem}
              key={item.label}
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  )
}
