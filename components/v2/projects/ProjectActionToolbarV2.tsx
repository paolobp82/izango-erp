"use client"

import type { ReactNode } from "react"
import { V2Button } from "@/components/v2/system"
import btnStyles from "@/components/v2/system/V2System.module.css"
import styles from "./ProjectDetailV2.module.css"

export type ProjectToolbarAction = {
  key: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  loading?: boolean
  disabled?: boolean
}

export type ProjectActionToolbarV2Props = {
  primary?: ProjectToolbarAction
  secondary?: ProjectToolbarAction[]
}

const variantButtonClass: Record<"primary" | "secondary", string> = {
  primary: btnStyles.buttonPrimary,
  secondary: btnStyles.buttonSecondary,
}

function renderAction(action: ProjectToolbarAction, variant: "primary" | "secondary") {
  if (action.href) {
    // Ancla real (no <button>) para conservar apertura en nueva pestana, click derecho,
    // etc. Reutiliza las mismas clases de V2Button en vez de duplicar estilos inline.
    return (
      <a
        className={`${btnStyles.button} ${variantButtonClass[variant]} ${btnStyles.buttonMd}`}
        href={action.href}
        key={action.key}
        rel="noreferrer"
        target="_blank"
      >
        {action.icon && <span className={btnStyles.buttonIcon}>{action.icon}</span>}
        <span className={btnStyles.buttonText}>{action.label}</span>
      </a>
    )
  }
  return (
    <V2Button
      disabled={action.disabled}
      key={action.key}
      leadingIcon={action.icon}
      loading={action.loading}
      onClick={action.onClick}
      variant={variant}
    >
      {action.label}
    </V2Button>
  )
}

// Clasifica las acciones del detalle de proyecto en primaria/secundarias para que el
// CTA principal (p.ej. "Crear cotizacion") no compita visualmente con el resto de la
// botonera. El color de la accion primaria sigue la regla global de tema (V2Button
// variant="primary" -> tokens --v2-primary/--v2-on-primary), nunca un color inline.
export function ProjectActionToolbarV2({ primary, secondary = [] }: ProjectActionToolbarV2Props) {
  if (!primary && secondary.length === 0) return null

  return (
    <div className={styles.actionToolbar}>
      <div className={styles.actionToolbarEyebrow}>Acciones del proyecto</div>
      <div className={styles.actionToolbarRow}>
        {primary && renderAction(primary, "primary")}
        {secondary.map((action) => renderAction(action, "secondary"))}
      </div>
    </div>
  )
}
