import type { BusinessRuleDefinition } from "./BusinessRuleTypes"

const RQ_FINAL_STATES = new Set(["pagado", "cerrado", "cancelado"])

export const RQ_BUSINESS_RULES: BusinessRuleDefinition = {
  module: "rq",
  rules: [
    {
      key: "rq_requires_amount",
      module: "rq",
      description: "Un requerimiento de pago debe tener monto mayor a cero.",
      evaluate: (context) => {
        const amount = Number(context?.record?.monto_solicitado || context?.record?.monto || 0)
        return amount > 0
          ? { allowed: true }
          : {
              allowed: false,
              reason: "El RQ requiere un monto mayor a cero.",
              nextActions: ["Ingresar el monto solicitado."],
            }
      },
    },
    {
      key: "rq_final_state_blocks_edit",
      module: "rq",
      description: "Un RQ en estado final no deberia editarse.",
      evaluate: (context) => {
        const state = String(context?.record?.estado || "")
        return RQ_FINAL_STATES.has(state)
          ? {
              allowed: false,
              reason: "No se puede editar un RQ en estado final.",
              nextActions: ["Crear un nuevo RQ o revisar el historial."],
            }
          : { allowed: true }
      },
    },
  ],
}

