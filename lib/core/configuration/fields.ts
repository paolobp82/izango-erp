import type { FieldConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_FIELDS: FieldConfiguration[] = [
  { module: "crm", field: "empresa", visible: true, required: true, readonly: false },
  { module: "crm", field: "ruc", visible: true, required: false, readonly: false },
  { module: "crm", field: "contacto", visible: true, required: false, readonly: false },
  { module: "crm", field: "email", visible: true, required: false, readonly: false },
  { module: "crm", field: "telefono", visible: true, required: false, readonly: false },
  { module: "crm", field: "estado", visible: true, required: true, readonly: false },
  { module: "rq", field: "codigo", visible: true, required: false, readonly: true },
  { module: "rq", field: "proyecto_id", visible: true, required: true, readonly: false },
  { module: "rq", field: "monto", visible: true, required: true, readonly: false },
  { module: "rq", field: "estado", visible: true, required: true, readonly: false },
]
