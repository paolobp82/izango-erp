import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2DataTableColumn<T> = {
  id?: string
  key?: string
  header: ReactNode
  accessor?: keyof T
  cell?: (row: T, rowIndex: number) => ReactNode
  render?: (row: T) => ReactNode
  align?: "left" | "center" | "right"
  width?: string | number
  minWidth?: string | number
  hideOnMobile?: boolean
}

export type V2DataTableProps<T> = {
  columns: V2DataTableColumn<T>[]
  rows: T[]
  getRowId?: (row: T, rowIndex: number) => string
  /** @deprecated Alias for getRowId */
  getRowKey?: (row: T) => string
  caption?: string
  density?: "compact" | "comfortable"
  stickyHeader?: boolean
  loading?: boolean
  emptyState?: ReactNode
  /** @deprecated Alias for emptyState */
  empty?: ReactNode
  errorState?: ReactNode
  selectedRowId?: string
  onRowClick?: (row: T) => void
}

export function V2DataTable<T>({
  caption,
  columns,
  density = "comfortable",
  empty,
  emptyState,
  errorState,
  getRowId,
  getRowKey,
  loading = false,
  onRowClick,
  rows,
  selectedRowId,
  stickyHeader = false,
}: V2DataTableProps<T>) {
  const resolvedEmptyState = emptyState || empty

  if (errorState) {
    return <div className={styles.tableStateWrapper}>{errorState}</div>
  }

  if (loading) {
    return (
      <div className={styles.tableShell}>
        <div className={styles.tableScroll}>
          <table className={`${styles.table} ${density === "compact" ? styles.tableCompact : ""}`}>
            {caption ? <caption className={styles.tableCaption}>{caption}</caption> : null}
            <thead>
              <tr>
                {columns.map((column, idx) => (
                  <th key={column.id || column.key || idx} scope="col" style={{ textAlign: column.align || "left" }}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <td key={column.id || column.key || colIndex} style={{ textAlign: column.align || "left" }}>
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

  if (rows.length === 0 && resolvedEmptyState) {
    return <div className={styles.tableStateWrapper}>{resolvedEmptyState}</div>
  }

  return (
    <div className={`${styles.tableShell} ${stickyHeader ? styles.tableStickyHeader : ""}`}>
      <div className={styles.tableScroll}>
        <table className={`${styles.table} ${density === "compact" ? styles.tableCompact : ""}`}>
          {caption ? <caption className={styles.tableCaption}>{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column, idx) => {
                const colKey = column.id || column.key || String(idx)
                return (
                  <th
                    className={column.hideOnMobile ? styles.hideOnMobile : ""}
                    key={colKey}
                    scope="col"
                    style={{
                      textAlign: column.align || "left",
                      width: column.width,
                      minWidth: column.minWidth,
                    }}
                  >
                    {column.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowId = getRowId
                ? getRowId(row, rowIndex)
                : getRowKey
                ? getRowKey(row)
                : String(rowIndex)

              const isSelected = selectedRowId === rowId
              const isClickable = Boolean(onRowClick)

              return (
                <tr
                  className={`${isSelected ? styles.tableSelected : ""} ${isClickable ? styles.tableClickable : ""}`}
                  key={rowId}
                  onClick={isClickable ? () => onRowClick!(row) : undefined}
                >
                  {columns.map((column, colIndex) => {
                    const colKey = column.id || column.key || String(colIndex)
                    let content: ReactNode = null

                    if (column.cell) {
                      content = column.cell(row, rowIndex)
                    } else if (column.render) {
                      content = column.render(row)
                    } else if (column.accessor) {
                      content = String(row[column.accessor] ?? "")
                    }

                    return (
                      <td
                        className={column.hideOnMobile ? styles.hideOnMobile : ""}
                        key={colKey}
                        style={{ textAlign: column.align || "left" }}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Legacy alias */
export { V2DataTable as V2Table }
