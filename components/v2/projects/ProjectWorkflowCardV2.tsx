"use client"

import { V2Button, V2SectionCard, V2StatusBadge } from "@/components/v2/system"
import styles from "./ProjectDetailV2.module.css"

export type ProjectWorkflowStep = {
  key: string
  index: number
  label: string
  color: string
  completed: boolean
  current: boolean
  clickable: boolean
  onClick?: () => void
}

export type ProjectWorkflowActionV2 = {
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}

export type ProjectWorkflowCardV2Props = {
  estadoLabel: string
  estadoTone: "info" | "success" | "warning" | "danger" | "neutral"
  steps: ProjectWorkflowStep[]
  nextActionTitle: string
  nextActionDescription: string
  responsibleText: string
  primaryAction?: ProjectWorkflowActionV2
  secondaryActions?: (ProjectWorkflowActionV2 & { icon?: import("react").ReactNode })[]
  dangerAction?: ProjectWorkflowActionV2
}

// Toda la logica de negocio (permisos, confirm(), mutaciones Supabase) vive en
// app/proyectos/[id]/page.tsx y llega aqui ya resuelta via props/callbacks. Este
// componente solo se encarga de la presentacion del stepper de 10 estados y de la
// siguiente acción disponible, preservando la paleta semantica de FLUJO (naranja,
// morado, azul, gris, etc.) sin sustituirla por el verde primario del tema.
export function ProjectWorkflowCardV2({
  dangerAction,
  estadoLabel,
  estadoTone,
  nextActionDescription,
  nextActionTitle,
  primaryAction,
  responsibleText,
  secondaryActions = [],
  steps,
}: ProjectWorkflowCardV2Props) {
  return (
    <V2SectionCard
      action={<V2StatusBadge tone={estadoTone}>{estadoLabel}</V2StatusBadge>}
      description="Flujo operativo del proyecto y siguiente acción disponible."
      title="Estado del proyecto"
    >
      <div className={styles.stepperRow}>
        {steps.map((step) => (
          <div className={styles.stepperItem} key={step.key}>
            <button
              className={styles.stepperDot}
              disabled={!step.clickable}
              onClick={step.onClick}
              style={{ background: step.completed ? step.color : "var(--v2-surface-muted)" }}
              type="button"
            >
              <span style={{ color: step.completed ? "#fff" : "var(--v2-muted)" }}>{step.index + 1}</span>
            </button>
            {step.current && (
              <span className={styles.stepperLabel} style={{ color: step.color }}>
                {step.label}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.nextActionBlock}>
        <div className={styles.nextActionEyebrow}>Siguiente acción disponible</div>
        <div className={styles.nextActionTitle}>{nextActionTitle}</div>
        <p className={styles.nextActionDescription}>{nextActionDescription}</p>
        <p className={styles.nextActionResponsible}>{responsibleText}</p>

        <div className={styles.nextActionButtons}>
          {primaryAction && (
            <V2Button disabled={primaryAction.disabled} loading={primaryAction.loading} onClick={primaryAction.onClick} variant="primary">
              {primaryAction.label}
            </V2Button>
          )}
          {secondaryActions.map((action) => (
            <V2Button disabled={action.disabled} key={action.label} leadingIcon={action.icon} loading={action.loading} onClick={action.onClick} variant="secondary">
              {action.label}
            </V2Button>
          ))}
          {dangerAction && (
            <V2Button disabled={dangerAction.disabled} onClick={dangerAction.onClick} variant="danger">
              {dangerAction.label}
            </V2Button>
          )}
        </div>
      </div>
    </V2SectionCard>
  )
}
