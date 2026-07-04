import type { FieldConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_FIELDS: FieldConfiguration[] = [
  { module: "cliente", field: "ruc", visible: true, required: true, readonly: false },
  { module: "cliente", field: "razon_social", visible: true, required: true, readonly: false },
  { module: "crm", field: "razon_social", visible: true, required: true, readonly: false },
  { module: "crm", field: "temperatura", visible: true, required: false, readonly: false },
  { module: "rq", field: "proveedor_id", visible: true, required: true, readonly: false },
  { module: "rq", field: "monto_solicitado", visible: true, required: true, readonly: false }
]
