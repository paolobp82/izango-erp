import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  disabled?: boolean
  previousLabel?: ReactNode
  nextLabel?: ReactNode
  summary?: string
  totalItems?: number
  pageSize?: number
  ariaLabel?: string
}

export function V2Pagination({
  ariaLabel = "Paginacion V2",
  disabled = false,
  nextLabel = "Sig.",
  onPageChange,
  page,
  pageCount,
  pageSize,
  previousLabel = "Ant.",
  summary,
  totalItems,
}: V2PaginationProps) {
  const safePageCount = Math.max(1, pageCount)
  const currentPage = Math.min(Math.max(1, page), safePageCount)

  const pages = Array.from({ length: safePageCount }, (_, index) => index + 1)

  let displaySummary = summary
  if (!displaySummary && totalItems !== undefined && pageSize !== undefined) {
    const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const end = Math.min(currentPage * pageSize, totalItems)
    displaySummary = `Mostrando ${start}-${end} de ${totalItems} registros`
  }

  return (
    <nav aria-label={ariaLabel} className={styles.pagination}>
      {displaySummary ? <span className={styles.paginationSummary}>{displaySummary}</span> : <div />}
      <div className={styles.paginationControls}>
        <button
          aria-label="Pagina anterior"
          className={styles.paginationButton}
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          {previousLabel}
        </button>

        {pages.map((item) => {
          const isCurrent = currentPage === item
          return (
            <button
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`Pagina ${item}`}
              className={`${styles.paginationButton} ${isCurrent ? styles.paginationActive : ""}`}
              disabled={disabled}
              key={item}
              onClick={() => onPageChange(item)}
              type="button"
            >
              {item}
            </button>
          )
        })}

        <button
          aria-label="Pagina siguiente"
          className={styles.paginationButton}
          disabled={disabled || currentPage >= safePageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          {nextLabel}
        </button>
      </div>
    </nav>
  )
}
