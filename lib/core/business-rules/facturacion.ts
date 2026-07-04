import type { BusinessRuleDefinition } from "./BusinessRuleTypes"

export const FACTURACION_BUSINESS_RULES: BusinessRuleDefinition = {
  module: "facturacion",
  rules: [
    {
      key: "invoice_requires_amount",
      module: "facturacion",
      description: "Una factura debe tener monto mayor a cero.",
      evaluate: (context) => {
        const subtotal = Number(context?.record?.subtotal || 0)
        const igv = Number(context?.record?.igv || 0)
        const amount = Number(context?.record?.monto_final_abonado || subtotal + igv)
        return amount > 0
          ? { allowed: true }
          : {
              allowed: false,
              reason: "La factura requiere un monto mayor a cero.",
              nextActions: ["Revisar subtotal, IGV o monto final."],
            }
      },
    },
    {
      key: "void_invoice_excluded_from_collection",
      module: "facturacion",
      description: "Facturas anuladas o canceladas no deben considerarse cobrables.",
      evaluate: (context) => {
        const state = String(context?.record?.estado || "")
        if (!["anulada", "cancelada"].includes(state)) return { allowed: true }
        return {
          allowed: false,
          reason: "La factura anulada o cancelada no debe pasar a cobranza.",
          nextActions: ["Mantener la factura solo en historial."],
        }
      },
    },
  ],
}

