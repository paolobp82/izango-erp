"use client"

import type { ReactNode } from "react"
import { V2PageHeader, V2StatusBadge } from "@/components/v2/system"
import styles from "./ProjectDetailV2.module.css"

type EntidadOption = { value: string; label: string }

// Mismo mapeo de tono usado en app/proyectos/page.tsx (estadoTone) para consistencia visual
// entre el listado y el detalle. No representa ni modifica reglas de negocio de transicion.
// Exportado para reutilizar el mismo tono en ProjectWorkflowCardV2 (badge de estado del stepper).
export const ESTADO_TONE: Record<string, "info" | "success" | "warning" | "danger" | "neutral"> = {
  pendiente_aprobacion: "warning",
  aprobado_produccion: "warning",
  aprobado_gerencia: "warning",
  aprobado: "info",
  aprobado_cliente: "info",
  en_curso: "success",
  terminado: "warning",
  liquidado: "info",
  pendiente_facturacion: "info",
  facturado: "info",
  cerrado_financiero: "neutral",
  rechazado: "danger",
  cancelado: "danger",
}

export function estadoTone(estado?: string | null): "info" | "success" | "warning" | "danger" | "neutral" {
  return ESTADO_TONE[estado || ""] || "neutral"
}

export type ProjectDetailHeaderV2Props = {
  proyecto: any
  cotAprobada: any
  estadoLabel: string
  entidades: EntidadOption[]
  editandoEntidad: boolean
  onToggleEditarEntidad: (value: boolean) => void
  onCambiarEntidad: (value: string) => void
  puedeEditar: boolean
  onAbrirEditar: () => void
  puedeExportarProyecto: boolean
  reportePdfHref: string
  actions?: ReactNode
}

export function ProjectDetailHeaderV2({
  actions,
  cotAprobada,
  editandoEntidad,
  entidades,
  estadoLabel,
  onAbrirEditar,
  onCambiarEntidad,
  onToggleEditarEntidad,
  proyecto,
  puedeEditar,
  puedeExportarProyecto,
  reportePdfHref,
}: ProjectDetailHeaderV2Props) {
  return (
    <div className={styles.headerWrap}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <a href="/proyectos">Proyectos</a>
        <span>/</span>
        <span>{proyecto?.codigo}</span>
      </nav>

      <V2PageHeader
        actions={
          <div className={styles.headerActions}>
            {puedeEditar && (
              <button className={styles.headerActionButton} onClick={onAbrirEditar} type="button">
                Editar
              </button>
            )}
            {puedeExportarProyecto && (
              <a className={styles.headerActionButton} href={reportePdfHref} rel="noreferrer" target="_blank">
                Reporte PDF
              </a>
            )}
            {actions}
          </div>
        }
        subtitle={proyecto?.cliente?.razon_social || undefined}
        title={proyecto?.nombre || ""}
      />

      <div className={styles.headerMeta}>
        <V2StatusBadge tone={estadoTone(proyecto?.estado)}>{estadoLabel}</V2StatusBadge>

        {proyecto?.productor && (
          <span className={styles.headerMetaItem}>
            Productor: {proyecto.productor.nombre} {proyecto.productor.apellido}
          </span>
        )}

        {cotAprobada && <span className={styles.headerMetaItem}>V{cotAprobada.version} aprobada</span>}

        {editandoEntidad ? (
          <div className={styles.entidadPicker}>
            {entidades.map((e) => (
              <button
                className={`${styles.entidadOption} ${proyecto?.entidad === e.value ? styles.entidadOptionActive : ""}`}
                key={e.value}
                onClick={() => onCambiarEntidad(e.value)}
                type="button"
              >
                {e.label}
              </button>
            ))}
            <button className={styles.entidadClose} onClick={() => onToggleEditarEntidad(false)} type="button">
              ×
            </button>
          </div>
        ) : (
          <button className={styles.entidadTrigger} onClick={() => onToggleEditarEntidad(true)} type="button">
            {entidades.find((e) => e.value === proyecto?.entidad)?.label || proyecto?.entidad || "Sin entidad"}
          </button>
        )}
      </div>
    </div>
  )
}
