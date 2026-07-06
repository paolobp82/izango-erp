import type { BusinessRuleDefinition, BusinessRuleResult } from "./BusinessRuleTypes"

const FINAL_STATES = ["cerrado_financiero", "cancelado", "rechazado"]

function allow(): BusinessRuleResult {
  return { allowed: true }
}

function rejectFinalState(context: { record?: Record<string, unknown> | null } | undefined, reason: string): BusinessRuleResult {
  const estado = String(context?.record?.estado || "")
  return FINAL_STATES.includes(estado) ? { allowed: false, reason } : allow()
}

export const PROYECTOS_BUSINESS_RULES: BusinessRuleDefinition = {
  module: "proyectos",
  rules: [
    {
      key: "project_requires_client",
      module: "proyectos",
      description: "Un proyecto operativo debe estar asociado a un cliente.",
      evaluate: (context) => {
        const clientId = context?.record?.cliente_id
        return clientId
          ? allow()
          : {
              allowed: false,
              reason: "El proyecto requiere cliente asociado.",
              nextActions: ["Seleccionar un cliente antes de continuar."],
            }
      },
    },
    {
      key: "cambiar_estado",
      module: "proyectos",
      description: "Evita cambios de estado sobre proyectos finales.",
      evaluate: context => rejectFinalState(context, "No se puede cambiar el estado de un proyecto final."),
    },
    {
      key: "rechazar",
      module: "proyectos",
      description: "Evita rechazar proyectos finales.",
      evaluate: context => rejectFinalState(context, "No se puede rechazar un proyecto final."),
    },
    {
      key: "aprobar_cliente",
      module: "proyectos",
      description: "Valida aprobación por cliente.",
      evaluate: context => {
        const record = context?.record || {}
        const tieneCotizacion = Boolean(record.cotizacion_aprobada_id || context?.metadata?.cotizacion_id)
        return tieneCotizacion ? allow() : { allowed: false, reason: "No se puede aprobar por cliente sin una proforma seleccionada." }
      },
    },
    {
      key: "iniciar",
      module: "proyectos",
      description: "Valida inicio operativo.",
      evaluate: context => {
        const estado = String(context?.record?.estado || "")
        return ["aprobado_cliente", "aprobado"].includes(estado)
          ? allow()
          : { allowed: false, reason: "Solo se puede iniciar un proyecto aprobado por cliente." }
      },
    },
    {
      key: "cerrar_operativo",
      module: "proyectos",
      description: "Valida cierre operativo.",
      evaluate: context => {
        const estado = String(context?.record?.estado || "")
        return ["en_curso", "terminado"].includes(estado)
          ? allow()
          : { allowed: false, reason: "El cierre operativo requiere un proyecto en curso o terminado." }
      },
    },
    {
      key: "enviar_facturacion",
      module: "proyectos",
      description: "Valida pase a facturación.",
      evaluate: context => {
        const estado = String(context?.record?.estado || "")
        return estado === "liquidado"
          ? allow()
          : { allowed: false, reason: "Solo un proyecto liquidado puede enviarse a facturación." }
      },
    },
    {
      key: "marcar_facturado",
      module: "proyectos",
      description: "Valida marcado como facturado.",
      evaluate: context => {
        const estado = String(context?.record?.estado || "")
        return estado === "pendiente_facturacion"
          ? allow()
          : { allowed: false, reason: "Solo un proyecto pendiente de facturación puede marcarse como facturado." }
      },
    },
    {
      key: "cerrar_financiero",
      module: "proyectos",
      description: "El cierre financiero requiere validaciones financieras previas.",
      evaluate: (context) => {
        const estado = String(context?.record?.estado || "")
        if (estado !== "facturado") {
          return { allowed: false, reason: "Solo un proyecto facturado puede cerrarse financieramente." }
        }

        const metadata = context?.metadata || {}
        const hasFinalInvoicePaid = metadata.facturaFinalCobrada === true
        const hasClosedLiquidation = metadata.liquidacionCerrada === true
        const hasControllerApproval = metadata.aprobadoController === true

        if (hasFinalInvoicePaid && hasClosedLiquidation && hasControllerApproval) return allow()

        return {
          allowed: false,
          reason: "El proyecto aun no cumple los requisitos de cierre financiero.",
          warnings: [
            !hasFinalInvoicePaid ? "Factura final no cobrada." : "",
            !hasClosedLiquidation ? "Liquidacion no cerrada." : "",
            !hasControllerApproval ? "Falta aprobacion de Controller." : "",
          ].filter(Boolean),
          nextActions: ["Completar validaciones financieras antes de cerrar."],
        }
      },
    },
  ],
}
