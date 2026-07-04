import type { ColumnConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_COLUMNS: ColumnConfiguration[] = [
  { module: "crm", column: "razon_social", visible: true, order: 1 },
  { module: "crm", column: "estado", visible: true, order: 2 },
  { module: "crm", column: "temperatura", visible: true, order: 3 },
  { module: "crm", column: "presupuesto_estimado", visible: true, order: 4 },
  { module: "rq", column: "proveedor", visible: true, order: 1 },
  { module: "rq", column: "monto_solicitado", visible: true, order: 2 },
  { module: "rq", column: "estado", visible: true, order: 3 }
]
