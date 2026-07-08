import type { FieldConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_FIELDS: FieldConfiguration[] = [
  { module: "cliente", field: "ruc", visible: true, required: true, readonly: false },
  { module: "cliente", field: "razon_social", visible: true, required: true, readonly: false },
  { module: "crm", field: "razon_social", visible: true, required: true, readonly: false },
  { module: "crm", field: "temperatura", visible: true, required: false, readonly: false },

  { module: "rq", field: "proyecto_id", visible: true, required: true, readonly: false, metadata: { label: "Proyecto", group: "general", source: "requerimientos_pago.proyecto_id" } },
  { module: "rq", field: "descripcion", visible: true, required: true, readonly: false, metadata: { label: "Descripción", group: "general", source: "requerimientos_pago.descripcion" } },
  { module: "rq", field: "proveedor_id", visible: true, required: true, readonly: false, metadata: { label: "Proveedor", group: "proveedor", source: "requerimientos_pago.proveedor_id" } },
  { module: "rq", field: "proveedor_nombre", visible: true, required: false, readonly: true, metadata: { label: "Proveedor snapshot", group: "proveedor", snapshot: true } },
  { module: "rq", field: "proveedor_banco", visible: true, required: false, readonly: true, metadata: { label: "Banco proveedor snapshot", group: "proveedor", snapshot: true } },
  { module: "rq", field: "proveedor_cuenta", visible: true, required: false, readonly: true, metadata: { label: "Cuenta proveedor snapshot", group: "proveedor", snapshot: true } },
  { module: "rq", field: "proveedor_tipo_pago", visible: true, required: false, readonly: true, metadata: { label: "Tipo pago proveedor snapshot", group: "proveedor", snapshot: true } },

  { module: "rq", field: "monto_solicitado", visible: true, required: true, readonly: false, metadata: { label: "Monto solicitado", group: "economico", type: "money" } },
  { module: "rq", field: "tratamiento_igv", visible: true, required: true, readonly: false, metadata: { label: "Tratamiento IGV", group: "economico", catalog: "rq.tratamiento_igv" } },

  { module: "rq", field: "tipo_pago", visible: true, required: true, readonly: false, metadata: { label: "Tipo de pago", group: "pago", catalog: "rq.tipo_pago" } },
  { module: "rq", field: "dias_credito", visible: true, required: false, readonly: false, metadata: { label: "Días de crédito", group: "pago", type: "number" } },
  { module: "rq", field: "fecha_programada_pago", visible: true, required: false, readonly: false, metadata: { label: "Fecha programada de pago", group: "pago", type: "date", owner: "finanzas" } },
  { module: "rq", field: "fecha_pago", visible: true, required: false, readonly: false, metadata: { label: "Fecha real de pago", group: "pago", type: "date", owner: "finanzas" } },
  { module: "rq", field: "numero_operacion", visible: true, required: false, readonly: false, metadata: { label: "N° operación", group: "pago" } },
  { module: "rq", field: "banco_pago", visible: true, required: false, readonly: false, metadata: { label: "Banco origen", group: "pago" } },
  { module: "rq", field: "tipo_transferencia", visible: true, required: false, readonly: false, metadata: { label: "Tipo transferencia", group: "pago" } },
  { module: "rq", field: "voucher_url", visible: true, required: false, readonly: false, metadata: { label: "Voucher / sustento", group: "documentacion", type: "url" } },
  { module: "rq", field: "nota_pago", visible: true, required: false, readonly: false, metadata: { label: "Observaciones", group: "documentacion" } }
]
