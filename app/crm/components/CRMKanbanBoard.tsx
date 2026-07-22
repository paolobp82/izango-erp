"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, type DragEvent, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import styles from "../CRM.module.css"

export type CRMKanbanBoardProps = {
  estados: Array<{ key: string; label: string; color: string }>
  leadsFiltrados: any[]
  renderCard: (lead: any) => ReactNode
  onLeadDrop: (leadId: string, targetEstado: string) => void
  puedeEditar: boolean
  density: "compacta" | "normal" | "expandida"
  collapsedColumns: Record<string, boolean>
  onToggleCollapseColumn: (key: string) => void
  columnTotals: Record<string, number>
  onAddLead?: () => void
}

export function CRMKanbanBoard({
  estados,
  leadsFiltrados,
  renderCard,
  onLeadDrop,
  puedeEditar,
  density,
  collapsedColumns,
  onToggleCollapseColumn,
  columnTotals,
  onAddLead,
}: CRMKanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Drag handlers
  function handleDragOver(e: DragEvent<HTMLDivElement>, estadoKey: string) {
    if (!puedeEditar) return
    e.preventDefault()
    if (dragOverColumn !== estadoKey) {
      setDragOverColumn(estadoKey)
    }
  }

  function handleDragLeave(estadoKey: string) {
    if (dragOverColumn === estadoKey) {
      setDragOverColumn(null)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, estadoKey: string) {
    if (!puedeEditar) return
    e.preventDefault()
    setDragOverColumn(null)
    const leadId = e.dataTransfer.getData("text/plain")
    if (leadId) {
      onLeadDrop(leadId, estadoKey)
    }
  }

  // Main grid styles (adapt gridTemplateColumns dynamically on desktop based on collapsed count)
  const columnsStyle = () => {
    if (density === "expandida") return {} // handled by CSS class scroll
    
    // For compact/normal, we compute column definitions dynamically:
    // Collapsed: 48px, Expanded: remaining flexible space
    const cols = estados.map((e) => {
      if (collapsedColumns[e.key]) return "48px"
      return "1fr"
    })
    return {
      gridTemplateColumns: cols.join(" "),
    }
  };

  return (
    <div
      className={`${styles.pipelineGrid} ${
        density === "compacta"
          ? styles.pipelineGridCompact
          : density === "normal"
          ? styles.pipelineGridNormal
          : styles.pipelineGridExpandido
      }`}
      style={density !== "expandida" ? columnsStyle() : undefined}
    >
      {estados.map((est) => {
        const isCollapsed = collapsedColumns[est.key]
        const leadsColumn = leadsFiltrados.filter((l) => l.estado === est.key)
        const totalMonto = columnTotals[est.key] || 0
        const formattedTotal = "S/ " + Math.round(totalMonto).toLocaleString("es-PE")
        const isOver = dragOverColumn === est.key

        if (isCollapsed) {
          return (
            <div
              key={est.key}
              className={styles.collapsedColumn}
              onDragOver={(e) => handleDragOver(e, est.key)}
              onDragLeave={() => handleDragLeave(est.key)}
              onDrop={(e) => handleDrop(e, est.key)}
              onClick={() => onToggleCollapseColumn(est.key)}
              title={`Expandir etapa ${est.label}`}
              style={{
                borderColor: isOver ? "var(--v2-accent)" : undefined,
                background: isOver ? "rgba(3, 227, 115, 0.04)" : undefined,
              }}
            >
              <div className={styles.collapsedHeader}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                  <span className={styles.collapsedDot} style={{ background: est.color }} />
                  <span className={styles.columnCountBadge} style={{ marginLeft: 0 }}>
                    {leadsColumn.length}
                  </span>
                </div>

                <div className={styles.collapsedTitleWrapper}>
                  <span className={styles.collapsedTitle}>{est.label}</span>
                </div>

                <div style={{ marginTop: "auto", display: "grid", placeItems: "center" }}>
                  <ChevronRight size={14} style={{ color: "var(--v2-subtle)" }} />
                </div>
              </div>
            </div>
          )
        }

        return (
          <div
            key={est.key}
            className={`${styles.kanbanColumn} ${isOver ? styles.kanbanColumnDragOver : ""}`}
            onDragOver={(e) => handleDragOver(e, est.key)}
            onDragLeave={() => handleDragLeave(est.key)}
            onDrop={(e) => handleDrop(e, est.key)}
          >
            <div className={styles.columnHeader}>
              <div className={styles.columnHeaderLeft}>
                <span className={styles.statusDot} style={{ background: est.color }} />
                <span className={styles.columnTitle} title={est.label}>
                  {est.label}
                </span>
                <span className={styles.columnCountBadge}>{leadsColumn.length}</span>
              </div>
              <div className={styles.columnHeaderRight}>
                {leadsColumn.length > 0 && <span className={styles.columnTotal}>{formattedTotal}</span>}
                <button
                  type="button"
                  className={styles.columnHeaderAction}
                  onClick={() => onToggleCollapseColumn(est.key)}
                  title="Colapsar etapa"
                >
                  <ChevronLeft size={13} />
                </button>
              </div>
            </div>

            <div className={styles.cardsContainer}>
              {leadsColumn.length === 0 ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--v2-muted)",
                    textAlign: "center",
                    padding: "10px 6px",
                    border: "1px dashed var(--v2-border-soft)",
                    borderRadius: "6px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    justifyContent: "flex-start",
                    background: "rgba(0,0,0,0.005)",
                  }}
                >
                  <Inbox size={12} style={{ color: "var(--v2-border-soft)", marginBottom: "1px" }} />
                  <span style={{ fontWeight: 500 }}>Sin oportunidades</span>
                  {puedeEditar && onAddLead && (
                    <button
                      type="button"
                      onClick={onAddLead}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--v2-subtle)",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "1px 4px",
                        fontFamily: "inherit",
                        marginTop: "1px",
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                      }}
                    >
                      + Crear lead
                    </button>
                  )}
                </div>
              ) : (
                leadsColumn.map((lead) => renderCard(lead))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
