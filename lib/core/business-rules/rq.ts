import type { BusinessRuleDefinition, BusinessRuleResult } from "./BusinessRuleTypes"

const FINAL_STATES = ["pagado", "cerrado", "cancelado", "rechazado"]

function allow(): BusinessRuleResult {
  return { allowed: true }
}

function rejectFinalState(context: { record?: Record<string, unknown> | null } | undefined, reason: string): BusinessRuleResult {
  const estado = String(context?.record?.estado || "")
  return FINAL_STATES.includes(estado) ? { allowed: false, reason } : { allowed: true }
}

export const RQ_BUSINESS_RULES: BusinessRuleDefinition = {
  module: "rq",
  rules: [
    { key: "aprobar", module: "rq", evaluate: context => rejectFinalState(context, "No se puede aprobar un RQ en estado final.") },
    { key: "rechazar", module: "rq", evaluate: context => rejectFinalState(context, "No se puede rechazar un RQ en estado final.") },
    { key: "cancelar", module: "rq", evaluate: context => rejectFinalState(context, "No se puede cancelar un RQ en estado final.") },
    { key: "pagar", module: "rq", evaluate: context => {
      const estado = String(context?.record?.estado || "")
      if (estado !== "programado" && context?.metadata?.hacia === "pagado") {
        return { allowed: false, reason: "Solo se puede pagar un RQ programado." }
      }
      return allow()
    } },
    { key: "rendir", module: "rq", evaluate: context => {
      const estado = String(context?.record?.estado || "")
      return estado === "pagado" ? allow() : { allowed: false, reason: "Solo se puede rendir un RQ pagado." }
    } },
    { key: "eliminar", module: "rq", evaluate: context => {
      const estado = String(context?.record?.estado || "")
      return estado === "pendiente_aprobacion" ? allow() : { allowed: false, reason: "Solo se puede eliminar operativamente un RQ pendiente." }
    } },
  ],
}
