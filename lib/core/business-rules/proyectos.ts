import type { BusinessRuleDefinition } from "./BusinessRuleTypes"

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
          ? { allowed: true }
          : {
              allowed: false,
              reason: "El proyecto requiere cliente asociado.",
              nextActions: ["Seleccionar un cliente antes de continuar."],
            }
      },
    },
    {
      key: "financial_close_requires_checks",
      module: "proyectos",
      description: "El cierre financiero requiere validaciones financieras previas.",
      evaluate: (context) => {
        const metadata = context?.metadata || {}
        const hasFinalInvoicePaid = metadata.facturaFinalCobrada === true
        const hasClosedLiquidation = metadata.liquidacionCerrada === true
        const hasControllerApproval = metadata.aprobadoController === true

        if (hasFinalInvoicePaid && hasClosedLiquidation && hasControllerApproval) return { allowed: true }

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

