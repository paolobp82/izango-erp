import type { LifecycleDefinition } from "./LifecycleTypes"

export const RQ_LIFECYCLE_DEFINITION: LifecycleDefinition = {
  module: "rq",
  states: [
    { key: "pendiente_aprobacion", label: "Pendiente aprobacion", order: 10 },
    { key: "aprobado_produccion", label: "Aprobado Produccion", order: 20 },
    { key: "aprobado", label: "Aprobado GG", order: 30 },
    { key: "programado", label: "Programado pago", order: 40 },
    { key: "pagado", label: "Pagado", order: 50 },
    { key: "cancelado", label: "Cancelado", order: 60 },
    { key: "rechazado", label: "Rechazado", order: 70 },
  ],
  transitions: [
    { from: "pendiente_aprobacion", to: "aprobado_produccion" },
    { from: "pendiente_aprobacion", to: "cancelado" },
    { from: "pendiente_aprobacion", to: "rechazado" },
    { from: "aprobado_produccion", to: "aprobado" },
    { from: "aprobado_produccion", to: "cancelado" },
    { from: "aprobado_produccion", to: "rechazado" },
    { from: "aprobado", to: "programado" },
    { from: "aprobado", to: "cancelado" },
    { from: "aprobado", to: "rechazado" },
    { from: "programado", to: "pagado" },
    { from: "programado", to: "cancelado" },
    { from: "programado", to: "rechazado" },
  ],
}
