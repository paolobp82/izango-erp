"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2TimelineItem = {
  id: string | number
  date: string
  title: string
  subtitle?: ReactNode
  badge?: ReactNode
  meta?: ReactNode
}

export type V2ActivityTimelineProps = {
  items: V2TimelineItem[]
  emptyState?: ReactNode
}

export function V2ActivityTimeline({ items, emptyState }: V2ActivityTimelineProps) {
  if (items.length === 0) {
    return <>{emptyState || <div className={styles.chartEmpty}>Sin actividad reciente.</div>}</>
  }

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <div className={styles.timelineItem} key={item.id}>
              <div className={styles.timelineLeft}>
                <span className={styles.timelineDate}>{item.date}</span>
              </div>
              <div className={styles.timelineMiddle}>
                <span className={styles.timelineDot} />
                {!isLast && <span className={styles.timelineLine} />}
              </div>
              <div className={styles.timelineRight}>
                <div className={styles.timelineCard}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.timelineCode}>{item.title}</span>
                    {item.badge}
                  </div>
                  {item.subtitle && (
                    <p className={styles.timelineTitle}>{item.subtitle}</p>
                  )}
                  {item.meta && (
                    <div className={styles.timelineMeta}>{item.meta}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
