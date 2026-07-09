import type { ColumnConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_COLUMNS: ColumnConfiguration[] = [
  { module: "crm", column: "razon_social", visible: true, order: 1 },
  { module: "crm", column: "estado", visible: true, order: 2 },
  { module: "crm", column: "temperatura", visible: true, order: 3 },
  { module: "crm", column: "presupuesto_estimado", visible: true, order: 4 },

  { module: "rq", column: "codigo_rq", visible: true, order: 1, width: 120, metadata: { label: "N° RQP", source: "requerimientos_pago.codigo_rq", type: "string" } },
  { module: "rq", column: "proyecto", visible: true, order: 2, width: 180, metadata: { label: "Proyecto", source: "proyectos.codigo_nombre", type: "relation" } },
  { module: "rq", column: "proveedor", visible: true, order: 3, width: 160, metadata: { label: "Proveedor", source: "proveedor_nombre/proveedores.nombre", type: "snapshot_relation" } },
  { module: "rq", column: "productor", visible: true, order: 4, width: 150, metadata: { label: "Productor", source: "proyectos.productor", type: "relation" } },
  { module: "rq", column: "descripcion", visible: true, order: 5, width: 220, metadata: { label: "Descripción", source: "requerimientos_pago.descripcion", type: "string" } },
  { module: "rq", column: "monto_solicitado", visible: true, order: 6, width: 130, metadata: { label: "Monto", source: "requerimientos_pago.monto_solicitado", type: "money" } },
  { module: "rq", column: "tratamiento_igv", visible: true, order: 7, width: 100, metadata: { label: "IGV", source: "requerimientos_pago.tratamiento_igv", type: "catalog" } },
  { module: "rq", column: "condicion_comercial", visible: true, order: 8, width: 140, metadata: { label: "Condición", source: "requerimientos_pago.condicion_comercial", type: "catalog" } },
  { module: "rq", column: "medio_pago", visible: true, order: 9, width: 120, metadata: { label: "Medio Pago", source: "requerimientos_pago.medio_pago", type: "catalog" } },
  { module: "rq", column: "fecha_solicitud", visible: true, order: 10, width: 120, metadata: { label: "F. Solicitud", source: "requerimientos_pago.created_at", type: "date" } },
  { module: "rq", column: "fecha_necesidad_pago", visible: true, order: 11, width: 140, metadata: { label: "F. Necesidad", source: "requerimientos_pago.fecha_necesidad_pago", type: "date" } },
  { module: "rq", column: "fecha_vencimiento", visible: true, order: 12, width: 130, metadata: { label: "F. Vencimiento", source: "calculated:created_at+dias_credito", type: "date", calculated: true } },
  { module: "rq", column: "fecha_programada_pago", visible: true, order: 13, width: 150, metadata: { label: "F. Programada", source: "requerimientos_pago.fecha_programada_pago", type: "date", planned: true } },
  { module: "rq", column: "fecha_pago_real", visible: true, order: 14, width: 120, metadata: { label: "F. Pago Real", source: "requerimientos_pago.fecha_pago", type: "date" } },
  { module: "rq", column: "estado_pago", visible: true, order: 15, width: 130, metadata: { label: "Estado Pago", source: "calculated:payment_status", type: "computed_status", calculated: true } },
  { module: "rq", column: "estado", visible: true, order: 16, width: 120, metadata: { label: "Estado RQP", source: "requerimientos_pago.estado", type: "catalog" } }
]


