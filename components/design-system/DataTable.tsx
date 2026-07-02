"use client"

import type { ReactNode } from "react"

type Align = "left" | "center" | "right"

export type DataTableColumn<T> = {
  key: keyof T | string
  header: ReactNode
  render?: (row: T, index: number) => ReactNode
  align?: Align
  width?: number | string
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: keyof T | ((row: T, index: number) => string | number)
  empty?: ReactNode
}

function cellValue<T>(row: T, key: keyof T | string) {
  const value = (row as Record<string, unknown>)[String(key)]
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

export default function DataTable<T>({ columns, rows, rowKey, empty }: DataTableProps<T>) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead style={{ background: "#F8FAFC" }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{
                    width: column.width,
                    textAlign: column.align || "left",
                    padding: "12px 14px",
                    color: "#475569",
                    fontSize: 11,
                    fontWeight: 800,
                    borderBottom: "1px solid #E2E8F0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 28, textAlign: "center" }}>
                  {empty || <span style={{ color: "#94A3B8", fontSize: 13 }}>Sin datos para mostrar</span>}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const key = typeof rowKey === "function" ? rowKey(row, index) : cellValue(row, rowKey)
                return (
                  <tr key={key} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        style={{
                          padding: "13px 14px",
                          textAlign: column.align || "left",
                          color: "#0F172A",
                          fontSize: 13,
                          verticalAlign: "middle",
                        }}
                      >
                        {column.render ? column.render(row, index) : cellValue(row, column.key)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
