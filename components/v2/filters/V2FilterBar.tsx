"use client"

import type { ReactNode } from "react"
import { Filter, Search } from "lucide-react"
import { V2Button, V2Input } from "../system"
import styles from "./V2Filters.module.css"

export type V2FilterBarProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  activeFiltersCount: number
  onToggleDrawer: () => void
  quickFilters?: ReactNode
  onClearFilters?: () => void
  showClearButton?: boolean
  hideDrawerButton?: boolean
  searchPlaceholder?: string
}

export function V2FilterBar({
  searchValue,
  onSearchChange,
  activeFiltersCount,
  onToggleDrawer,
  quickFilters,
  onClearFilters,
  showClearButton = false,
  hideDrawerButton = false,
  searchPlaceholder,
}: V2FilterBarProps) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterBarLeft}>
        {!hideDrawerButton && (
          <div className={styles.btnFiltrosWrapper}>
            <V2Button
              variant="secondary"
              size="compact"
              icon={<Filter size={14} />}
              onClick={onToggleDrawer}
              style={{ width: "100%", height: "32px" }}
            >
              Filtros
              {activeFiltersCount > 0 && (
                <span className={styles.filterBadge}>
                  {activeFiltersCount}
                </span>
              )}
            </V2Button>
          </div>
        )}

        <div className={styles.searchWrapper}>
          <V2Input
            compact
            icon={<Search size={14} />}
            placeholder={searchPlaceholder || "Buscar..."}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: "100%", height: "32px" }}
          />
        </div>
      </div>

      <div className={styles.filterBarRight}>
        {quickFilters}

        {showClearButton && onClearFilters && (
          <div className={styles.clearBtnWrapper}>
            <V2Button
              variant="ghost"
              size="compact"
              style={{ color: "var(--v2-muted)", height: "32px", whiteSpace: "nowrap" }}
              onClick={onClearFilters}
            >
              Limpiar
            </V2Button>
          </div>
        )}
      </div>
    </div>
  )
}
