"use client"

import type { CSSProperties, ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2QuickActionsLayout = "equal" | "auto" | "weighted"

export type V2QuickActionsProps = {
  children: ReactNode
  cols?: number
  /**
   * Plantilla explicita de grid-template-columns para desktop — escape hatch para
   * casos que ninguno de los `layout` semanticos cubre. Si se usa junto con `layout`,
   * `columnTemplate` gana.
   */
  columnTemplate?: string
  /**
   * Modo semantico de distribucion de columnas (evita escribir minmax/repeat/auto-fit
   * a mano en cada pantalla):
   * - "equal" (default): `cols` columnas de igual ancho. Uso: toolbars donde todas las
   *   acciones tienen peso visual similar (ej. dashboards de KPIs/accesos).
   * - "auto": cada accion ocupa solo el ancho de su propio contenido, sin estirarse.
   *   Uso: 1-3 acciones cortas dentro de una card ancha (ej. "Acciones rapidas" de
   *   Resumen), donde forzar columnas iguales deja espacio vacio flotando.
   * - "weighted": columnas con min-width creciente y mas peso hacia el final. Uso:
   *   filas de 4 acciones donde la ultima es el CTA primario con texto mas largo
   *   (ej. "Acciones del cliente" — Ver ficha / Editar / Ver proyectos / Crear nuevo).
   * No se agrego "compact" (mencionado como posible variante) porque hoy no existe un
   * consumidor real que lo necesite distinto de "auto" — evitar variantes sin uso.
   */
  layout?: V2QuickActionsLayout
}

const LAYOUT_TEMPLATES: Record<Exclude<V2QuickActionsLayout, "equal">, string> = {
  auto: "repeat(auto-fit, minmax(min(200px, 100%), max-content))",
  weighted: "minmax(140px, 1fr) minmax(130px, 1fr) minmax(170px, 1.2fr) minmax(190px, 1.2fr)",
}

// La plantilla de columnas se expone como custom property (no como inline
// gridTemplateColumns) para que los breakpoints de .quickActionsGrid puedan
// colapsar a 2/1 columnas en tablet/mobile sin !important.
export function V2QuickActions({ children, cols = 2, columnTemplate, layout = "equal" }: V2QuickActionsProps) {
  const template = columnTemplate || (layout === "equal" ? `repeat(${cols}, minmax(0, 1fr))` : LAYOUT_TEMPLATES[layout])
  return (
    <div className={styles.quickActionsGrid} style={{ "--v2-quick-template": template } as CSSProperties}>
      {children}
    </div>
  )
}
