"use client"

import type { ReactNode } from "react"
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
}

// Tarjeta generica de hechos label/value sobre V2SectionCard. Reutilizada en Resumen
// (Datos base, Informacion economica) y candidata para Cliente (ficha rapida) en un
// lote posterior, evitando duplicar el mismo patron de grid label/value por seccion.
export function ProjectInfoCardV2({ action, description, rows, title }: ProjectInfoCardV2Props) {
  return (
    <V2SectionCard action={action} description={description} title={title}>
      <div className={styles.infoGrid}>
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
