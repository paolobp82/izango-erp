import type { BusinessRuleDefinition } from "./BusinessRuleTypes"

function leadRequiresCompany(record: Record<string, unknown> | null | undefined) {
  const company = String(record?.razon_social || record?.empresa || "").trim()
  return company
    ? { allowed: true }
    : {
        allowed: false,
        reason: "El lead requiere una razon social o nombre de empresa.",
        nextActions: ["Completar la empresa antes de guardar."],
      }
}

function allowRule() {
  return { allowed: true }
}

export const CRM_BUSINESS_RULES: BusinessRuleDefinition = {
  module: "crm",
  rules: [
    {
      key: "crear_lead",
      module: "crm",
      description: "Valida la creacion de un lead comercial.",
      evaluate: (context) => leadRequiresCompany(context?.record),
    },
    {
      key: "editar_lead",
      module: "crm",
      description: "Valida la edicion de un lead comercial.",
      evaluate: (context) => leadRequiresCompany(context?.record),
    },
    {
      key: "eliminar_lead",
      module: "crm",
      description: "Valida la eliminacion de un lead comercial.",
      evaluate: allowRule,
    },
    {
      key: "convertir_cliente",
      module: "crm",
      description: "Valida la conversion de un lead a cliente.",
      evaluate: (context) => leadRequiresCompany(context?.record),
    },
    {
      key: "archivar_lead",
      module: "crm",
      description: "Valida el archivado individual o masivo de leads.",
      evaluate: allowRule,
    },
    {
      key: "cambiar_estado",
      module: "crm",
      description: "Valida cambios de estado comerciales.",
      evaluate: (context) => {
        const nextStatus = String(context?.metadata?.hacia || context?.record?.estado || "")
        const customerId = context?.record?.cliente_id
        if (nextStatus !== "ganado" || customerId) return { allowed: true }
        return {
          allowed: true,
          warnings: ["El lead pasara a ganado y se vinculara o creara un cliente."],
          nextActions: ["Confirmar conversion comercial."],
        }
      },
    },
    {
      key: "lead_requires_company",
      module: "crm",
      description: "Un lead comercial debe tener razon social o nombre de empresa.",
      evaluate: (context) => leadRequiresCompany(context?.record),
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
