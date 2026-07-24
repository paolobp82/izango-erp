"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DragEvent } from "react"
import styles from "../CRM.module.css"

export type CRMLeadCardProps = {
  lead: any
  responsables: any[]
  selected: boolean
  density: "compacta" | "normal" | "expandida"
  onClick: () => void
  puedeEditar: boolean
  onFastWin?: () => void
  proyecto?: any
  cotizacionVigente?: any
  facturaVigente?: any
  totalCotizacionLabel?: string
  estadoCobroFacturaLabel?: string
  onDragStart: (e: DragEvent<HTMLDivElement>, leadId: string) => void
}

export function CRMLeadCard({
  lead,
  responsables,
  selected,
  density,
  onClick,
  puedeEditar,
  onFastWin,
  proyecto,
  cotizacionVigente,
  facturaVigente,
  totalCotizacionLabel,
  estadoCobroFacturaLabel,
  onDragStart,
}: CRMLeadCardProps) {
  const responsable = responsables.find((p) => p.id === lead.responsable_id)
  
  const initials = responsable
    ? `${responsable.nombre?.[0] || ""}${responsable.apellido?.[0] || ""}`.toUpperCase()
    : ""
  
  const respNombre = responsable
    ? `${responsable.nombre || ""} ${responsable.apellido?.[0] || ""}.`
    : "Sin asignación"

  // Temperature Labels: Caliente, Templado, Frío
  let tempLabel = "Frío"
  let tempClass = styles.cardTempFrio

  if (lead.temperatura === "caliente") {
    tempLabel = "Caliente"
    tempClass = styles.cardTempCaliente
  } else if (lead.temperatura === "tibio") {
    tempLabel = "Templado"
    tempClass = styles.cardTempTibio
  }

  const fmtBudget = "S/ " + Number(lead.presupuesto_estimado || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  // Truncate helper
  function truncate(text: string, len: number) {
    if (!text) return ""
    return text.length > len ? text.slice(0, len) + "..." : text
  }

  // Tooltip with complete lead info
  const tooltipText = `${lead.razon_social}
• Presupuesto: ${fmtBudget}
• Temperatura: ${tempLabel}
• Responsable: ${respNombre}
${lead.nombre_contacto ? `• Contacto: ${lead.nombre_contacto}` : ""}
${proyecto ? `• Proyecto: ${proyecto.codigo || proyecto.nombre}` : ""}`

  // Date formatting
  const displayDate = lead.fecha_proxima_accion
    ? (density === "compacta" ? lead.fecha_proxima_accion.slice(5) : lead.fecha_proxima_accion)
    : ""

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      title={tooltipText}
      tabIndex={0}
      className={`${styles.leadCard} ${selected ? styles.leadCardSelected : ""}`}
      style={{
        padding: density === "compacta" ? "8px 10px" : density === "normal" ? "12px 14px" : "14px 16px",
      }}
    >
      {/* 1. Nombre de oportunidad o cliente */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
        <h4 className={styles.cardTitle}>
          {truncate(lead.razon_social, 26)}
        </h4>

        {puedeEditar && lead.estado !== "ganado" && onFastWin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onFastWin()
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--v2-success)",
              fontSize: "10px",
              fontWeight: 800,
              cursor: "pointer",
              padding: "0 2px",
              fontFamily: "inherit",
              lineHeight: 1,
            }}
          >
            Ganar
          </button>
        )}
      </div>

      {/* 2. Monto */}
      <div className={styles.cardMonto}>{fmtBudget}</div>

      {/* 3. Indicador de cliente vinculado */}
      {lead.cliente_id && (
        <span className={styles.cardLabelVinculado}>
          <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", background: "currentColor" }}></span>
          Cliente vinculado
        </span>
      )}

      {/* Normal Mode Additional Info (Contacto comercial) */}
      {density !== "compacta" && lead.nombre_contacto && (
        <div style={{ fontSize: "11px", color: "var(--v2-muted)", marginTop: "-2px" }}>
          Contacto: {truncate(lead.nombre_contacto, 22)}
        </div>
      )}

      {/* Expandida Mode Additional Info (Proyecto, Cotizacion, Factura, Referencias) */}
      {density === "expandida" && (proyecto || lead.referencias_cotizacion) && (
        <div className={styles.cardMetadataSection}>
          {proyecto && (
            <>
              <div style={{ fontWeight: 800, color: "var(--v2-brand-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                Proyecto: {proyecto.codigo || proyecto.nombre}
              </div>
              {cotizacionVigente && (
                <div>
                  Cotiz: V{cotizacionVigente.version} · {totalCotizacionLabel || ""}
                </div>
              )}
              {facturaVigente && (
                <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  Fact: {facturaVigente.numero_factura || "Reg."} · {estadoCobroFacturaLabel || ""}
                </div>
              )}
            </>
          )}
          {lead.referencias_cotizacion && (
            <div style={{ fontStyle: "italic", borderTop: "1px solid var(--v2-border-soft)", paddingTop: "2px", marginTop: "1px" }}>
              Ref: {truncate(lead.referencias_cotizacion, 24)}
            </div>
          )}
        </div>
      )}

      {/* 4. Temperatura (Subtle badge style) */}
      <div className={`${styles.cardTempBadge} ${tempClass}`}>
        <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }}></span>
        {tempLabel}
      </div>

      {/* 5. Responsable & 6. Fecha relevante (Footer) */}
      <div className={styles.cardFooter}>
        <div className={styles.cardOwner}>
          {initials && (
            <div className={styles.cardOwnerInitials}>
              {initials}
            </div>
          )}
          <span>{respNombre}</span>
        </div>

        {/* Date: Compacta (only if exists), Normal/Expandida always */}
        {lead.fecha_proxima_accion && (
          <span className={`${styles.cardDate} ${lead.temperatura === "caliente" ? styles.cardDateCaliente : ""}`}>
            {displayDate}
          </span>
        )}
      </div>
    </div>
  )
}
