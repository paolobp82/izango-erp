import type { ValidationRule } from "./SystemConfigurationTypes"

export const SYSTEM_VALIDATIONS: ValidationRule[] = [
  {
    key: "crm.lead.empresa.required",
    value: { module: "crm", field: "empresa", rule: "required" },
    description: "El lead CRM debe tener empresa o razon social.",
  },
  {
    key: "crm.lead.estado.catalog",
    value: { module: "crm", field: "estado", catalog: "crm.estados" },
    description: "El estado CRM debe existir en el catalogo oficial.",
  },
  {
    key: "rq.monto.positive",
    value: { module: "rq", field: "monto", rule: "positive_number" },
    description: "El monto del RQ debe ser mayor que cero.",
  },
  {
    key: "rq.estado.catalog",
    value: { module: "rq", field: "estado", catalog: "rq.estados" },
    description: "El estado RQ debe existir en el catalogo oficial.",
  },
]
