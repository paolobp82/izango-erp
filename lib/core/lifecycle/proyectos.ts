import type { LifecycleDefinition } from "./LifecycleTypes"

export const PROYECTOS_LIFECYCLE_DEFINITION: LifecycleDefinition = {
  module: "proyectos",
  states: [
    { key: "pendiente_aprobacion", label: "Pendiente aprobación", order: 10 },
    { key: "aprobado_produccion", label: "Aprobado Producción", order: 20 },
    { key: "aprobado_gerencia", label: "Aprobado Gerencia", order: 30 },
    { key: "aprobado_cliente", label: "Aprobado Cliente", order: 40 },
    { key: "en_curso", label: "En curso", order: 50 },
    { key: "terminado", label: "Terminado", order: 60 },
    { key: "liquidado", label: "Liquidado", order: 70 },
    { key: "pendiente_facturacion", label: "Pendiente facturación", order: 80 },
    { key: "facturado", label: "Facturado", order: 90 },
    { key: "cerrado_financiero", label: "Cerrado Financiero", order: 100 },
    { key: "rechazado", label: "Rechazado", order: 900 },
    { key: "cancelado", label: "Cancelado", order: 910 },
  ],
  transitions: [
    { from: "pendiente_aprobacion", to: "aprobado_produccion" },
    { from: "pendiente_aprobacion", to: "rechazado" },

    { from: "aprobado_produccion", to: "aprobado_gerencia" },
    { from: "aprobado_produccion", to: "rechazado" },

    { from: "aprobado_gerencia", to: "aprobado_cliente" },
    { from: "aprobado_gerencia", to: "rechazado" },

    { from: "aprobado_cliente", to: "en_curso" },
    { from: "aprobado_cliente", to: "rechazado" },

    { from: "aprobado", to: "en_curso" },

    { from: "en_curso", to: "terminado" },
    { from: "terminado", to: "liquidado" },
    { from: "liquidado", to: "pendiente_facturacion" },
    { from: "pendiente_facturacion", to: "facturado" },
    { from: "facturado", to: "cerrado_financiero" },

    { from: "aprobado_produccion", to: "pendiente_aprobacion", metadata: { requiresAllowReopen: true } },
    { from: "aprobado_gerencia", to: "aprobado_produccion", metadata: { requiresAllowReopen: true } },
    { from: "aprobado_cliente", to: "aprobado_gerencia", metadata: { requiresAllowReopen: true } },
    { from: "en_curso", to: "aprobado_cliente", metadata: { requiresAllowReopen: true } },
    { from: "terminado", to: "en_curso", metadata: { requiresAllowReopen: true } },
    { from: "liquidado", to: "terminado", metadata: { requiresAllowReopen: true } },
    { from: "pendiente_facturacion", to: "liquidado", metadata: { requiresAllowReopen: true } },
    { from: "facturado", to: "pendiente_facturacion", metadata: { requiresAllowReopen: true } },
  ],
}
