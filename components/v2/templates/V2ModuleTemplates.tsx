"use client"

import type { ReactNode } from "react"
import { V2DataTable, V2SectionCard, type V2TableColumn } from "@/components/v2/system"
import styles from "./V2ModuleTemplates.module.css"

// 1. ListPageTemplate V2
export function V2ListPageTemplate({
  header,
  summary,
  toolbar,
  table,
}: {
  header: ReactNode
  summary?: ReactNode
  toolbar?: ReactNode
  table: ReactNode
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      {summary}
      {toolbar}
      {table}
    </div>
  )
}

// 2. Detail360Template V2
export function V2Detail360Template({
  header,
  tabs,
  children,
}: {
  header: ReactNode
  tabs?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      {tabs}
      {children}
    </div>
  )
}

// 3. ModuleDashboardTemplate V2
export function V2ModuleDashboardTemplate({
  header,
  summary,
  widgets,
}: {
  header: ReactNode
  summary?: ReactNode
  widgets: ReactNode
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      {summary}
      <div className={styles.widgetsGrid}>{widgets}</div>
    </div>
  )
}

// 4. KanbanPageTemplate V2
export function V2KanbanPageTemplate({
  header,
  toolbar,
  columns,
}: {
  header: ReactNode
  toolbar?: ReactNode
  columns: ReactNode
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      {toolbar}
      <div className={styles.kanbanScroll}>{columns}</div>
    </div>
  )
}

// 5. WorkCenterTemplate V2
export function V2WorkCenterTemplate({
  header,
  summary,
  queue,
  detail,
}: {
  header: ReactNode
  summary?: ReactNode
  queue: ReactNode
  detail?: ReactNode
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      {summary}
      <div className={styles.workCenterGrid}>
        {queue}
        {detail}
      </div>
    </div>
  )
}

// 6. FullFormTemplate V2
export function V2FullFormTemplate({
  header,
  navigator,
  children,
  actions,
}: {
  header: ReactNode
  navigator?: ReactNode
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      <div className={navigator ? styles.fullFormGrid : styles.pageLayout}>
        {navigator}
        {children}
      </div>
      {actions}
    </div>
  )
}

// 7. FinancialTableTemplate V2
export function V2FinancialTableTemplate<T>({
  header,
  summary,
  columns,
  rows,
  getRowKey,
}: {
  header: ReactNode
  summary?: ReactNode
  columns: V2TableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      {summary}
      <V2DataTable columns={columns} getRowKey={getRowKey} rows={rows} />
    </div>
  )
}

// 8. SettingsPageTemplate V2
export function V2SettingsPageTemplate({
  header,
  tabs,
  children,
}: {
  header: ReactNode
  tabs?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={styles.pageLayout}>
      {header}
      {tabs}
      <V2SectionCard title="Configuración">{children}</V2SectionCard>
    </div>
  )
}
