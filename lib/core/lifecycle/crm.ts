import type { LifecycleDefinition } from "./LifecycleTypes"

export const CRM_LIFECYCLE_DEFINITION: LifecycleDefinition = {
  module: "crm",
  states: [
    { key: "nuevo", label: "Nuevo", order: 10 },
    { key: "contactado", label: "Contactado", order: 20 },
    { key: "reunion", label: "Reunion", order: 30 },
    { key: "propuesta", label: "Propuesta", order: 40 },
    { key: "negociacion", label: "Negociacion", order: 50 },
    { key: "ganado", label: "Ganado", order: 60 },
    { key: "perdido", label: "Perdido", order: 70 },
  ],
  transitions: [
    { from: "nuevo", to: "contactado" },
    { from: "contactado", to: "reunion" },
    { from: "contactado", to: "propuesta" },
    { from: "reunion", to: "propuesta" },
    { from: "propuesta", to: "negociacion" },
    { from: "propuesta", to: "ganado" },
    { from: "propuesta", to: "perdido" },
    { from: "negociacion", to: "ganado" },
    { from: "negociacion", to: "perdido" },
    { from: "perdido", to: "contactado" },
    { from: "ganado", to: "contactado", metadata: { requiresAllowReopen: true } },
  ],
}
