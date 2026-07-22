"use client"

import type { CSSProperties, ReactNode } from "react"
import { V2SectionCard } from "@/components/v2/system"
import styles from "./ProjectDetailV2.module.css"

export type ProjectInfoRow = {
  label: string
  value: ReactNode
  span?: 1 | 2
  emphasis?: boolean
}

export type ProjectInfoCardV2Props = {
  title: string
  description?: string
  action?: ReactNode
  rows: ProjectInfoRow[]
  /** Numero de columnas en desktop. Sin este prop, el grid usa auto-fit (comportamiento original de Resumen). */
  columns?: number
  /** "compact" ajusta el gap para paneles con columnas fijas y valores largos (ej. Cliente). Default: comportamiento original de Resumen. */
  density?: "default" | "compact"
}

// Tarjeta generica de hechos label/value sobre V2SectionCard. Reutilizada en Resumen
// (Datos base, Informacion economica) y en Cliente (ficha rapida), evitando duplicar
// el mismo patron de grid label/value por seccion.
export function ProjectInfoCardV2({ action, columns, density = "default", description, rows, title }: ProjectInfoCardV2Props) {
  const gridClassName = density === "compact" ? `${styles.infoGrid} ${styles.infoGridCompact}` : styles.infoGrid
  const gridStyle = columns ? ({ "--v2-info-cols": columns } as CSSProperties) : undefined

  return (
    <V2SectionCard action={action} description={description} title={title}>
      <div className={gridClassName} style={gridStyle}>
        {rows.map((row) => (
          <div className={styles.infoRow} key={row.label} style={row.span === 2 ? { gridColumn: "span 2" } : undefined}>
            <span className={styles.infoLabel}>{row.label}</span>
            <div className={row.emphasis ? styles.infoValueEmphasis : styles.infoValue}>{row.value}</div>
          </div>
        ))}
      </div>
    </V2SectionCard>
  )
}
