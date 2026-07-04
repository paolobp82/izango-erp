import type { BusinessRuleDefinition } from "./BusinessRuleTypes"

export const CRM_BUSINESS_RULES: BusinessRuleDefinition = {
  module: "crm",
  rules: [
    {
      key: "lead_requires_company",
      module: "crm",
      description: "Un lead comercial debe tener razon social o nombre de empresa.",
      evaluate: (context) => {
        const company = String(context?.record?.razon_social || context?.record?.empresa || "").trim()
        return company
          ? { allowed: true }
          : {
              allowed: false,
              reason: "El lead requiere una razon social o nombre de empresa.",
              nextActions: ["Completar la empresa antes de guardar."],
            }
      },
    },
    {
      key: "won_lead_should_have_customer",
      module: "crm",
      description: "Un lead ganado deberia estar vinculado o convertido a cliente.",
      evaluate: (context) => {
        const status = String(context?.record?.estado || "")
        const customerId = context?.record?.cliente_id
        if (status !== "ganado" || customerId) return { allowed: true }
        return {
          allowed: true,
          warnings: ["El lead ganado aun no tiene cliente vinculado."],
          nextActions: ["Convertir el lead a cliente."],
        }
      },
    },
  ],
}

