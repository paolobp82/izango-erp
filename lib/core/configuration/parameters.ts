import type { SystemParameter } from "./SystemConfigurationTypes"

export const SYSTEM_PARAMETERS: SystemParameter[] = [
  {
    key: "crm.pipeline.default_period",
    name: "Periodo por defecto del pipeline CRM",
    value: "mes_actual",
    type: "string",
    scope: "modulo",
    active: true,
    metadata: { module: "crm" },
  },
  {
    key: "crm.pipeline.archive_closed_days",
    name: "Dias para archivar oportunidades cerradas",
    value: 30,
    type: "number",
    scope: "modulo",
    active: true,
    metadata: { module: "crm" },
  },
  {
    key: "rq.default_currency",
    name: "Moneda por defecto de RQ",
    value: "PEN",
    type: "string",
    scope: "modulo",
    active: true,
    metadata: { module: "rq" },
  },
  {
    key: "rq.requires_traceability",
    name: "Trazabilidad obligatoria en RQ",
    value: true,
    type: "boolean",
    scope: "modulo",
    active: true,
    metadata: { module: "rq" },
  },
]
