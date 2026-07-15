/* eslint-disable @typescript-eslint/no-explicit-any */

export function esCotizacionVigenteProyecto(params: {
  proyecto?: any | null
  cotizacionId?: string | null
}) {
  const vigenteId = params.proyecto?.cotizacion_aprobada_id
  const cotizacionId = params.cotizacionId
  return Boolean(vigenteId && cotizacionId && String(vigenteId) === String(cotizacionId))
}

export function estadoOrigenCotizacionItem(params: {
  proyecto?: any | null
  cotizacionId?: string | null
  cotizacionItemId?: string | null
}) {
  if (!params.cotizacionId || !params.cotizacionItemId) return "sin_origen"
  return esCotizacionVigenteProyecto(params) ? "vigente" : "historico"
}

export function esItemHistoricoCotizacion(params: {
  proyecto?: any | null
  cotizacionId?: string | null
  cotizacionItemId?: string | null
}) {
  return estadoOrigenCotizacionItem(params) === "historico"
}
