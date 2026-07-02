"use client"

import type { ReactNode } from "react"
import DataTable, { type DataTableColumn } from "./DataTable"
import Drawer from "./Drawer"
import EmptyState from "./EmptyState"

type MasterDetailPatternProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: keyof T | ((row: T, index: number) => string | number)
  detailOpen: boolean
  detailTitle: string
  detailSubtitle?: string
  detail: ReactNode
  detailFooter?: ReactNode
  onCloseDetail?: () => void
  empty?: ReactNode
}

export default function MasterDetailPattern<T>({
  columns,
  rows,
  rowKey,
  detailOpen,
  detailTitle,
  detailSubtitle,
  detail,
  detailFooter,
  onCloseDetail,
  empty,
}: MasterDetailPatternProps<T>) {
  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        empty={empty || <EmptyState title="Sin registros" description="No hay elementos para mostrar." />}
      />
      <Drawer
        open={detailOpen}
        title={detailTitle}
        subtitle={detailSubtitle}
        footer={detailFooter}
        onClose={onCloseDetail}
      >
        {detail}
      </Drawer>
    </>
  )
}
