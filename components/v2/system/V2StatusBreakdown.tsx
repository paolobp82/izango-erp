"use client"

import styles from "./V2System.module.css"

export type V2StatusBreakdownItem = {
  name: string
  value: number | string
  color: string
  percentage: number
}

export type V2StatusBreakdownProps = {
  items: V2StatusBreakdownItem[]
}

export function V2StatusBreakdown({ items }: V2StatusBreakdownProps) {
  return (
    <div className={styles.statusBreakdownList}>
      {items.map((item) => (
        <div className={styles.statusBreakdownRow} key={item.name}>
          <div className={styles.statusBreakdownLabel}>
            <span
              className={styles.statusBreakdownDot}
              style={{ background: item.color }}
            />
            <span>{item.name}</span>
          </div>
          <span className={styles.statusBreakdownValue}>{item.value}</span>
          <div className={styles.statusBreakdownTrack}>
            <div
              className={styles.statusBreakdownBar}
              style={{
                width: `${item.percentage}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
