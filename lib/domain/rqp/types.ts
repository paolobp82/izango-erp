export type CondicionComercialRQP = "contado" | "credito" | "adelanto"
export type MedioPagoRQP = "Transferencia" | "Efectivo"
export type EstadoDocumentarioRQP = "sin_comprobante" | "pendiente" | "recibido" | "validado" | "observado"

export type RQPFinancialModel = {
  condicion_comercial?: CondicionComercialRQP | string | null
  medio_pago?: MedioPagoRQP | string | null
  fecha_necesidad_pago?: string | null
  fecha_programada_pago?: string | null
  fecha_pago?: string | null
  dias_credito?: number | string | null
  tipo_pago?: string | null
  tipo_transferencia?: string | null
  estado?: string | null
  created_at?: string | null
}

export type RQPComprobanteModel = {
  estado_documentario?: EstadoDocumentarioRQP | string | null
  comprobante_tipo?: string | null
  comprobante_serie?: string | null
  comprobante_numero?: string | null
  comprobante_fecha_emision?: string | null
  comprobante_fecha_vencimiento?: string | null
  comprobante_ruc?: string | null
  comprobante_razon_social?: string | null
  comprobante_direccion?: string | null
  comprobante_moneda?: string | null
  comprobante_valor_venta?: number | null
  comprobante_igv?: number | null
  comprobante_total?: number | null
  comprobante_detraccion?: number | null
  comprobante_retencion?: number | null
  comprobante_detalle?: unknown
  comprobante_pdf_url?: string | null
  comprobante_xml_url?: string | null
  comprobante_cdr_url?: string | null
}
