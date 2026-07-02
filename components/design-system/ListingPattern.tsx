"use client"

import type { ReactNode } from "react"
import ArchiveTabs from "./ArchiveTabs"
import DataTable, { type DataTableColumn } from "./DataTable"
import Drawer from "./Drawer"
import EmptyState from "./EmptyState"
import ExecutiveSummary from "./ExecutiveSummary"
import FiltersBar from "./FiltersBar"
import PagePattern from "./PagePattern"

type ListingPatternProps<T> = {
  title: string
  description?: string
  actions?: ReactNode
  summaryItems?: Parameters<typeof ExecutiveSummary>[0]["items"]
  filters?: ReactNode
  filterActions?: ReactNode
  tabs?: Parameters<typeof ArchiveTabs>[0]["tabs"]
  activeTab?: string
  onTabChange?: (value: string) => void
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: keyof T | ((row: T, index: number) => string | number)
  emptyTitle?: string
  emptyDescription?: string
  drawer?: {
    open: boolean
    title: string
    subtitle?: string
    content: ReactNode
    footer?: ReactNode
    onClose?: () => void
  }
}

export default function ListingPattern<T>({
  title,
  description,
  actions,
  summaryItems,
  filters,
  filterActions,
  tabs,
  activeTab,
  onTabChange,
  columns,
  rows,
  rowKey,
  emptyTitle = "Sin registros",
  emptyDescription = "No hay datos para mostrar con los filtros actuales.",
  drawer,
}: ListingPatternProps<T>) {
  return (
    <PagePattern
      title={title}
      description={description}
      actions={actions}
      summary={summaryItems ? <ExecutiveSummary items={summaryItems} /> : undefined}
      filters={filters ? <FiltersBar actions={filterActions}>{filters}</FiltersBar> : undefined}
      tabs={tabs && activeTab ? <ArchiveTabs tabs={tabs} value={activeTab} onChange={onTabChange} /> : undefined}
    >
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />

      {drawer && (
        <Drawer
          open={drawer.open}
          title={drawer.title}
          subtitle={drawer.subtitle}
          footer={drawer.footer}
          onClose={drawer.onClose}
        >
          {drawer.content}
        </Drawer>
      )}
    </PagePattern>
  )
}
