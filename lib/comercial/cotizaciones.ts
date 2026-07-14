/* eslint-disable @typescript-eslint/no-explicit-any */

export const ESTADOS_COTIZACION_APROBADA_CLIENTE = ["aprobada_cliente", "aprobado_cliente"]
export const ESTADOS_COTIZACION_DESCARTADA = ["rechazada", "rechazado", "anulada", "anulado", "cancelada", "cancelado"]
export const ESTADOS_FACTURA_COBRADA = ["cobrada", "pagada"]
export const ESTADOS_FACTURA_ANULADA = ["anulada", "cancelada"]

function num(value: unknown) {
  return Number(value || 0)
}

function cotizacionFechaValue(cotizacion: any) {
  return new Date(cotizacion?.updated_at || cotizacion?.created_at || 0).getTime()
}

function cotizacionVersionValue(cotizacion: any) {
  return Number(cotizacion?.version || 0)
}

function ordenarCotizacionesVigentes(a: any, b: any) {
  const fecha = cotizacionFechaValue(b) - cotizacionFechaValue(a)
  if (fecha !== 0) return fecha
  return cotizacionVersionValue(b) - cotizacionVersionValue(a)
}

export function totalCotizacionComercial(cotizacion: any) {
  const totalGuardado = [
    cotizacion?.total_cliente,
    cotizacion?.subtotal_con_fee && num(cotizacion.subtotal_con_fee) + num(cotizacion.igv_monto),
    cotizacion?.subtotal_precio_cliente,
  ].map(num).find(total => total > 0)
  if (totalGuardado) return totalGuardado

  const items = Array.isArray(cotizacion?.items) ? cotizacion.items : []
  const totalPrecioCliente = items
    .filter((item: any) => item.incluir_en_total !== false)
    .reduce((sum: number, item: any) => sum + num(item.precio_cliente), 0)

  if (totalPrecioCliente <= 0) return 0

  const feePct = cotizacion?.fee_activo === false ? 0 : num(cotizacion?.fee_agencia_pct)
  const subtotalConFee = totalPrecioCliente + (totalPrecioCliente * feePct / 100)
  const subtotalConDescuento = subtotalConFee - (subtotalConFee * num(cotizacion?.descuento_pct) / 100)
  const igvPct = cotizacion?.igv_pct === null || cotizacion?.igv_pct === undefined ? 18 : num(cotizacion.igv_pct)
  return subtotalConDescuento + (subtotalConDescuento * igvPct / 100)
}

export function cotizacionVigenteProyecto(proyectoId: string | null | undefined, cotizaciones: any[]) {
  if (!proyectoId) return null
  const delProyecto = cotizaciones.filter(cotizacion => cotizacion?.proyecto_id === proyectoId)
  const aprobadas = delProyecto
    .filter(cotizacion => ESTADOS_COTIZACION_APROBADA_CLIENTE.includes(cotizacion?.estado))
    .sort(ordenarCotizacionesVigentes)
  if (aprobadas[0]) return aprobadas[0]

  return delProyecto
    .filter(cotizacion => !ESTADOS_COTIZACION_DESCARTADA.includes(cotizacion?.estado))
    .sort(ordenarCotizacionesVigentes)[0] || null
}

export function cotizacionEstaAprobadaCliente(cotizacion: any) {
  return ESTADOS_COTIZACION_APROBADA_CLIENTE.includes(String(cotizacion?.estado || ""))
}

export function cotizacionEstaDescartada(cotizacion: any) {
  return ESTADOS_COTIZACION_DESCARTADA.includes(String(cotizacion?.estado || ""))
}

export function estadoAprobacionCotizacion(cotizacion: any) {
  if (!cotizacion) return "sin_cotizacion"
  if (cotizacionEstaAprobadaCliente(cotizacion)) return "aprobada_cliente"
  if (cotizacionEstaDescartada(cotizacion)) return "descartada"
  return "pendiente_cliente"
}

function facturaFechaValue(factura: any) {
  return new Date(factura?.fecha_abono || factura?.fecha_emision || factura?.updated_at || factura?.created_at || 0).getTime()
}

function facturaEsFinal(factura: any) {
  return String(factura?.tipo_factura || "final") === "final"
}

function ordenarFacturasComerciales(a: any, b: any) {
  if (facturaEsFinal(a) !== facturaEsFinal(b)) return facturaEsFinal(a) ? -1 : 1
  return facturaFechaValue(b) - facturaFechaValue(a)
}

export function totalFacturaComercial(factura: any) {
  return num(factura?.subtotal) + num(factura?.igv)
}

export function montoCobradoFacturaComercial(factura: any) {
  if (!ESTADOS_FACTURA_COBRADA.includes(String(factura?.estado || ""))) return 0
  return num(factura?.monto_final_abonado)
}

export function facturaVigenteProyecto(proyectoId: string | null | undefined, facturas: any[]) {
  if (!proyectoId) return null
  return facturas
    .filter(factura => factura?.proyecto_id === proyectoId)
    .filter(factura => !ESTADOS_FACTURA_ANULADA.includes(String(factura?.estado || "")))
    .sort(ordenarFacturasComerciales)[0] || null
}

export function estadoCobroFactura(factura: any) {
  if (!factura) return "Sin factura"
  if (ESTADOS_FACTURA_COBRADA.includes(String(factura.estado || ""))) return "Cobrado"
  if (ESTADOS_FACTURA_ANULADA.includes(String(factura.estado || ""))) return "Anulado"
  return "Pendiente de cobro"
}
