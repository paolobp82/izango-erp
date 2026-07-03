import type { ColumnConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_COLUMNS: ColumnConfiguration[] = [
  { module: "crm", column: "empresa", visible: true, order: 1, width: 220 },
  { module: "crm", column: "estado", visible: true, order: 2, width: 140 },
  { module: "crm", column: "presupuesto", visible: true, order: 3, width: 140 },
  { module: "crm", column: "responsable", visible: true, order: 4, width: 180 },
  { module: "rq", column: "codigo", visible: true, order: 1, width: 140 },
  { module: "rq", column: "proyecto", visible: true, order: 2, width: 220 },
  { module: "rq", column: "estado", visible: true, order: 3, width: 160 },
  { module: "rq", column: "monto", visible: true, order: 4, width: 140 },
]
