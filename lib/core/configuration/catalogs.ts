import type { SystemCatalog } from "./SystemConfigurationTypes"

export const SYSTEM_CATALOGS: SystemCatalog[] = [
  {
    key: "crm.estados",
    name: "Estados CRM",
    description: "Estados comerciales del pipeline CRM.",
    module: "crm",
    editable: false,
    items: [
      { id: "crm.estado.nuevo", catalogKey: "crm.estados", key: "nuevo", label: "Nuevo", color: "#94a3b8", order: 1, active: true, system: true },
      { id: "crm.estado.contactado", catalogKey: "crm.estados", key: "contactado", label: "Contactado", color: "#3b82f6", order: 2, active: true, system: true },
      { id: "crm.estado.reunion", catalogKey: "crm.estados", key: "reunion", label: "Reunión", color: "#8b5cf6", order: 3, active: true, system: true },
      { id: "crm.estado.propuesta", catalogKey: "crm.estados", key: "propuesta", label: "Propuesta", color: "#f59e0b", order: 4, active: true, system: true },
      { id: "crm.estado.negociacion", catalogKey: "crm.estados", key: "negociacion", label: "Negociación", color: "#f97316", order: 5, active: true, system: true },
      { id: "crm.estado.ganado", catalogKey: "crm.estados", key: "ganado", label: "Ganado", color: "#22c55e", order: 6, active: true, system: true },
      { id: "crm.estado.perdido", catalogKey: "crm.estados", key: "perdido", label: "Perdido", color: "#ef4444", order: 7, active: true, system: true }
    ]
  },
  {
    key: "crm.temperaturas",
    name: "Temperaturas CRM",
    module: "crm",
    editable: true,
    items: [
      { id: "crm.temp.frio", catalogKey: "crm.temperaturas", key: "frio", label: "Frío", color: "#60a5fa", order: 1, active: true, system: true },
      { id: "crm.temp.tibio", catalogKey: "crm.temperaturas", key: "tibio", label: "Tibio", color: "#f59e0b", order: 2, active: true, system: true },
      { id: "crm.temp.caliente", catalogKey: "crm.temperaturas", key: "caliente", label: "Caliente", color: "#ef4444", order: 3, active: true, system: true }
    ]
  },
  {
    key: "crm.origenes",
    name: "Orígenes CRM",
    module: "crm",
    editable: true,
    items: [
      { id: "crm.origen.referido", catalogKey: "crm.origenes", key: "referido", label: "Referido", order: 1, active: true, system: false },
      { id: "crm.origen.web", catalogKey: "crm.origenes", key: "web", label: "Web", order: 2, active: true, system: false },
      { id: "crm.origen.linkedin", catalogKey: "crm.origenes", key: "linkedin", label: "LinkedIn", order: 3, active: true, system: false },
      { id: "crm.origen.prospeccion", catalogKey: "crm.origenes", key: "prospeccion", label: "Prospección", order: 4, active: true, system: false }
    ]
  },
  {
    key: "crm.industrias",
    name: "Industrias CRM",
    module: "crm",
    editable: true,
    items: [
      { id: "crm.industria.retail", catalogKey: "crm.industrias", key: "retail", label: "Retail", order: 1, active: true, system: false },
      { id: "crm.industria.consumo_masivo", catalogKey: "crm.industrias", key: "consumo_masivo", label: "Consumo Masivo", order: 2, active: true, system: false },
      { id: "crm.industria.financiero", catalogKey: "crm.industrias", key: "financiero", label: "Financiero", order: 3, active: true, system: false },
      { id: "crm.industria.tecnologia", catalogKey: "crm.industrias", key: "tecnologia", label: "Tecnología", order: 4, active: true, system: false }
    ]
  },
  {
    key: "rq.estados",
    name: "Estados RQ",
    module: "rq",
    editable: false,
    items: [
      { id: "rq.estado.pendiente_aprobacion", catalogKey: "rq.estados", key: "pendiente_aprobacion", label: "Pendiente aprobación", order: 1, active: true, system: true },
      { id: "rq.estado.aprobado", catalogKey: "rq.estados", key: "aprobado", label: "Aprobado", order: 2, active: true, system: true },
      { id: "rq.estado.programado", catalogKey: "rq.estados", key: "programado", label: "Programado", order: 3, active: true, system: true },
      { id: "rq.estado.pagado", catalogKey: "rq.estados", key: "pagado", label: "Pagado", order: 4, active: true, system: true },
      { id: "rq.estado.rechazado", catalogKey: "rq.estados", key: "rechazado", label: "Rechazado", order: 5, active: true, system: true },
      { id: "rq.estado.cancelado", catalogKey: "rq.estados", key: "cancelado", label: "Cancelado", order: 6, active: true, system: true }
    ]
  }

,
  {
    key: "proyectos.estados",
    name: "Estados Proyecto",
    module: "proyectos",
    editable: false,
    items: [
      { id: "proyecto.estado.pendiente_aprobacion", catalogKey: "proyectos.estados", key: "pendiente_aprobacion", label: "Pendiente", order: 1, active: true, system: true },
      { id: "proyecto.estado.aprobado_produccion", catalogKey: "proyectos.estados", key: "aprobado_produccion", label: "Aprobado Prod.", order: 2, active: true, system: true },
      { id: "proyecto.estado.aprobado", catalogKey: "proyectos.estados", key: "aprobado", label: "Aprobado", order: 3, active: true, system: true },
      { id: "proyecto.estado.aprobado_gerencia", catalogKey: "proyectos.estados", key: "aprobado_gerencia", label: "Aprobado Gerencia", order: 4, active: true, system: true },
      { id: "proyecto.estado.aprobado_cliente", catalogKey: "proyectos.estados", key: "aprobado_cliente", label: "Aprobado Cliente", order: 5, active: true, system: true },
      { id: "proyecto.estado.en_curso", catalogKey: "proyectos.estados", key: "en_curso", label: "En curso", order: 6, active: true, system: true },
      { id: "proyecto.estado.terminado", catalogKey: "proyectos.estados", key: "terminado", label: "Terminado", order: 7, active: true, system: true },
      { id: "proyecto.estado.liquidado", catalogKey: "proyectos.estados", key: "liquidado", label: "Liquidado", order: 8, active: true, system: true },
      { id: "proyecto.estado.cerrado_financiero", catalogKey: "proyectos.estados", key: "cerrado_financiero", label: "Cerrado Financiero", order: 9, active: true, system: true }
    ]
  }
]

