"use client"

import type { ReactNode } from "react"
import { V2Drawer } from "../system"
import { V2Button } from "../system"
import { V2ActiveFilterChip } from "./V2ActiveFilterChip"
import styles from "./V2Filters.module.css"

export type V2FilterDrawerProps = {
  open: boolean
  onClose: () => void
  activeChips: Array<{ id: string; label: string; valueLabel: string }>
  onRemoveChip: (id: string) => void
  onApply: () => void
  onClearAll: () => void
  children: ReactNode
  showSaveView?: boolean
}

export function V2FilterDrawer({
  open,
  onClose,
  activeChips,
  onRemoveChip,
  onApply,
  onClearAll,
  children,
  showSaveView = false,
}: V2FilterDrawerProps) {
  const footer = (
    <div className={styles.drawerSection}>
      <div className={styles.drawerFooterActions}>
        <V2Button variant="secondary" onClick={onClearAll} style={{ width: "100%" }}>
          Limpiar todo
        </V2Button>
        <V2Button onClick={onApply} style={{ width: "100%" }}>
          Aplicar filtros
        </V2Button>
      </div>
      {showSaveView && (
        <div className={styles.saveViewLink}>
          <V2Button
            variant="secondary"
            disabled
            style={{ width: "100%", opacity: 0.6, cursor: "not-allowed" }}
          >
            Guardar vista — Próximamente
          </V2Button>
          <p style={{ fontSize: "10.5px", color: "var(--v2-subtle)", margin: "4px 0 0" }}>
            La persistencia de filtros personalizados estará disponible en una versión futura.
          </p>
        </div>
      )}
    </div>
  )

  return (
    <V2Drawer open={open} onClose={onClose} title="Filtros" footer={footer}>
      <div style={{ display: "grid", gap: "20px" }}>
        {activeChips.length > 0 && (
          <div className={styles.activeChipsContainer}>
            <p className={styles.activeChipsHeader}>Filtros activos</p>
            <div className={styles.chipsList}>
              {activeChips.map((chip) => (
                <V2ActiveFilterChip
                  key={chip.id}
                  id={chip.id}
                  label={chip.label}
                  valueLabel={chip.valueLabel}
                  onRemove={onRemoveChip}
                />
              ))}
            </div>
          </div>
        )}

        <div className={styles.drawerSection}>{children}</div>
      </div>
    </V2Drawer>
  )
}
