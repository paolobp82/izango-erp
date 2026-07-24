import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2TableColumn<T> = {
  align?: "left" | "right" | "center"
  header: string
  key: string
  render: (row: T) => ReactNode
}

type V2TableProps<T> = {
  columns: V2TableColumn<T>[]
  empty?: ReactNode
  getRowKey: (row: T) => string
  loading?: boolean
  rows: T[]
  selectedRowId?: string
}

export function V2Table<T>({ columns, empty, getRowKey, loading = false, rows, selectedRowId }: V2TableProps<T>) {
  if (loading) {
    return (
      <div className={styles.tableShell}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((row) => (
                <tr key={row}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      <span className={styles.skeleton} style={{ display: "block", height: 12, width: "72%" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return <>{empty}</>
  }

  return (
    <div className={styles.tableShell}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={{ textAlign: column.align || "left" }}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowKey = getRowKey(row)
              return (
                <tr className={selectedRowId === rowKey ? styles.tableSelected : ""} key={rowKey}>
                  {columns.map((column) => (
                    <td key={column.key} style={{ textAlign: column.align || "left" }}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
