"use client"

import { useMemo, useState, type ReactNode } from "react"
import EmptyState from "./EmptyState"
import { Button, Checkbox, ErrorState, Input, LoadingState, Toolbar } from "./base"

type Align = "left" | "center" | "right"
type SortDirection = "asc" | "desc"

export type DataTableColumn<T> = {
  key: keyof T | string
  header: ReactNode
  render?: (row: T, index: number) => ReactNode
  align?: Align
  width?: number | string
  sortable?: boolean
}

type DataTableFilter = {
  key: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

type DataTableAction<T> = {
  label: ReactNode
  onClick: (row: T) => void
}

type BulkAction<T> = {
  label: ReactNode
  onClick: (rows: T[]) => void
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: keyof T | ((row: T, index: number) => string | number)
  empty?: ReactNode
  loading?: boolean
  error?: ReactNode
  stickyHeader?: boolean
  search?: string
  onSearchChange?: (value: string) => void
  filters?: DataTableFilter[]
  actions?: DataTableAction<T>[]
  bulkActions?: BulkAction<T>[]
  selectedKeys?: Array<string | number>
  onSelectedKeysChange?: (keys: Array<string | number>) => void
  sortKey?: string
  sortDirection?: SortDirection
  onSort?: (key: string, direction: SortDirection) => void
  page?: number
  pageSize?: number
  totalRows?: number
  onPageChange?: (page: number) => void
}

function cellValue<T>(row: T, key: keyof T | string) {
  const value = (row as Record<string, unknown>)[String(key)]
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

function resolveKey<T>(row: T, index: number, rowKey: DataTableProps<T>["rowKey"]) {
  return typeof rowKey === "function" ? rowKey(row, index) : cellValue(row, rowKey)
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  loading,
  error,
  stickyHeader = true,
  search,
  onSearchChange,
  filters = [],
  actions,
  bulkActions,
  selectedKeys,
  onSelectedKeysChange,
  sortKey,
  sortDirection = "asc",
  onSort,
  page = 1,
  pageSize,
  totalRows,
  onPageChange,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1)
  const activePage = onPageChange ? page : internalPage
  const pageCount = pageSize ? Math.max(1, Math.ceil((totalRows ?? rows.length) / pageSize)) : 1
  const selectable = Boolean(onSelectedKeysChange)

  const visibleRows = useMemo(() => {
    if (!pageSize || onPageChange) return rows
    const start = (activePage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [activePage, onPageChange, pageSize, rows])

  function changePage(nextPage: number) {
    const clamped = Math.min(Math.max(nextPage, 1), pageCount)
    if (onPageChange) onPageChange(clamped)
    else setInternalPage(clamped)
  }

  function toggleSelection(key: string | number) {
    const current = selectedKeys ?? []
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    onSelectedKeysChange?.(next)
  }

  function selectedRows() {
    const selected = new Set(selectedKeys ?? [])
    return rows.filter((row, index) => selected.has(resolveKey(row, index, rowKey)))
  }

  return (
    <div style={{ background: "var(--iz-color-surface)", border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-lg)", overflow: "hidden", boxShadow: "var(--iz-shadow-sm)" }}>
      {(onSearchChange || filters.length > 0 || bulkActions?.length) && (
        <Toolbar style={{ padding: "var(--iz-space-4)", borderBottom: "1px solid var(--iz-color-border)" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1 }}>
            {onSearchChange ? <Input value={search ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar..." style={{ maxWidth: 260 }} /> : null}
            {filters.map((filter) => (
              <select key={filter.key} value={filter.value} onChange={(event) => filter.onChange(event.target.value)} style={{ border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-md)", background: "var(--iz-color-surface)", color: "var(--iz-color-text)", padding: "9px 11px", fontSize: 13 }}>
                <option value="">{filter.label}</option>
                {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ))}
          </div>
          {bulkActions?.length ? (
            <div style={{ display: "inline-flex", gap: 8 }}>
              {bulkActions.map((action, index) => <Button key={index} type="button" variant="secondary" size="sm" onClick={() => action.onClick(selectedRows())}>{action.label}</Button>)}
            </div>
          ) : null}
        </Toolbar>
      )}
      {loading ? (
        <div style={{ padding: 24 }}><LoadingState /></div>
      ) : error ? (
        <div style={{ padding: 24 }}><ErrorState detail={error} /></div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead style={{ background: "var(--iz-color-surface-muted)", position: stickyHeader ? "sticky" : undefined, top: stickyHeader ? 0 : undefined, zIndex: stickyHeader ? 1 : undefined }}>
              <tr>
                {selectable ? <th style={{ width: 44, padding: "12px 14px", borderBottom: "1px solid var(--iz-color-border)" }} /> : null}
                {columns.map((column) => {
                  const sortable = column.sortable || Boolean(onSort)
                  const active = sortKey === String(column.key)
                  return (
                    <th key={String(column.key)} style={{ width: column.width, textAlign: column.align || "left", padding: "12px 14px", color: "var(--iz-color-text-muted)", fontSize: 11, fontWeight: 800, borderBottom: "1px solid var(--iz-color-border)", whiteSpace: "nowrap" }}>
                      {sortable ? (
                        <button type="button" onClick={() => onSort?.(String(column.key), active && sortDirection === "asc" ? "desc" : "asc")} style={{ border: 0, background: "transparent", color: "inherit", font: "inherit", cursor: "pointer", padding: 0 }}>
                          {column.header} {active ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                        </button>
                      ) : column.header}
                    </th>
                  )
                })}
                {actions?.length ? <th style={{ width: 120, padding: "12px 14px", borderBottom: "1px solid var(--iz-color-border)" }}>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions?.length ? 1 : 0)} style={{ padding: 28, textAlign: "center" }}>
                    {empty || <EmptyState title="Sin datos para mostrar" />}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const key = resolveKey(row, index, rowKey)
                  return (
                    <tr key={key} style={{ borderBottom: "1px solid var(--iz-color-border)" }}>
                      {selectable ? (
                        <td style={{ padding: "13px 14px" }}>
                          <Checkbox checked={(selectedKeys ?? []).includes(key)} onChange={() => toggleSelection(key)} aria-label="Seleccionar fila" />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={String(column.key)} style={{ padding: "13px 14px", textAlign: column.align || "left", color: "var(--iz-color-text)", fontSize: 13, verticalAlign: "middle" }}>
                          {column.render ? column.render(row, index) : cellValue(row, column.key)}
                        </td>
                      ))}
                      {actions?.length ? (
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            {actions.map((action, actionIndex) => <Button key={actionIndex} type="button" variant="ghost" size="sm" onClick={() => action.onClick(row)}>{action.label}</Button>)}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      {pageSize ? (
        <Toolbar style={{ padding: "var(--iz-space-3) var(--iz-space-4)", borderTop: "1px solid var(--iz-color-border)" }}>
          <span className="iz-caption" style={{ color: "var(--iz-color-text-muted)" }}>Página {activePage} de {pageCount}</span>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <Button type="button" variant="secondary" size="sm" disabled={activePage <= 1} onClick={() => changePage(activePage - 1)}>Anterior</Button>
            <Button type="button" variant="secondary" size="sm" disabled={activePage >= pageCount} onClick={() => changePage(activePage + 1)}>Siguiente</Button>
          </div>
        </Toolbar>
      ) : null}
    </div>
  )
}
