import type { SupabaseClient } from "@supabase/supabase-js"
import type { TreasuryPaymentItem } from "@/lib/domain/treasury"
import {
  mapCajaChicaToTreasuryPayment,
  mapGastoOficinaToTreasuryPayment,
  mapPrestamoCuotaToTreasuryPayment,
  mapRQPToTreasuryPayment,
} from "./treasury.mapper"

type TreasurySourceRow = Record<string, unknown>

export async function loadTreasuryPaymentItems(supabase: SupabaseClient): Promise<TreasuryPaymentItem[]> {
  const { data: rqpData, error: rqpError } = await supabase
    .from("requerimientos_pago")
    .select(`
      id,
      codigo_rq,
      numero_rq,
      proveedor_nombre,
      monto_solicitado,
      tipo_pago,
      condicion_comercial,
      medio_pago,
      tipo_transferencia,
      fecha_necesidad_pago,
      fecha_programada_pago,
      fecha_pago,
      estado,
      proyecto:proyectos(id, nombre, codigo)
    `)
    .not("estado", "in", '("cancelado","rechazado")')
    .order("created_at", { ascending: false })
    .limit(200)

  if (rqpError) throw rqpError

  const { data: cajaData, error: cajaError } = await supabase
    .from("caja_chica")
    .select(`
      id,
      concepto,
      monto_debe,
      monto_haber,
      fecha,
      estado,
      aprobado_at,
      entidad,
      destinatario,
      proveedor_nombre,
      numero_operacion,
      proyecto:proyectos(nombre,codigo)
    `)
    .in("estado", ["pendiente", "aprobado"])
    .order("created_at", { ascending: false })
    .limit(200)

  if (cajaError) throw cajaError

  const { data: gastosData, error: gastosError } = await supabase
    .from("gastos_oficina")
    .select(`
      id,
      descripcion,
      tipo,
      monto,
      monto_pen,
      moneda,
      tipo_cambio,
      fecha,
      fecha_vencimiento,
      estado_pago,
      proveedor_nombre,
      numero_comprobante,
      numero_operacion,
      banco_origen,
      tipo_transferencia,
      voucher_url,
      entidad,
      proveedor:proveedores(nombre)
    `)
    .not("estado_pago", "eq", "pagado")
    .order("fecha", { ascending: false })
    .limit(200)

  if (gastosError) throw gastosError

  const { data: prestamosData, error: prestamosError } = await supabase
    .from("prestamos")
    .select("id,nombre,prestamista,banco_prestamista,entidad,estado")
    .not("estado", "in", '("pagado","cancelado")')
    .order("created_at", { ascending: false })
    .limit(200)

  if (prestamosError) throw prestamosError

  const prestamos = (prestamosData || []) as TreasurySourceRow[]
  const prestamosPorId = new Map(prestamos.map(prestamo => [String(prestamo.id), prestamo]))
  let cuotasData: TreasurySourceRow[] = []

  if (prestamos.length > 0) {
    const { data, error } = await supabase
      .from("prestamo_cuotas")
      .select("id,prestamo_id,numero_cuota,fecha_vencimiento,monto_total,monto_pagado,estado,fecha_pago")
      .in("prestamo_id", prestamos.map(prestamo => prestamo.id))
      .neq("estado", "pagado")
      .order("fecha_vencimiento", { ascending: true })
      .limit(500)

    if (error) throw error
    cuotasData = (data || []) as TreasurySourceRow[]
  }

  const rqpItems = ((rqpData || []) as TreasurySourceRow[]).map(mapRQPToTreasuryPayment)
  const cajaItems = ((cajaData || []) as TreasurySourceRow[]).map(mapCajaChicaToTreasuryPayment)
  const gastoItems = ((gastosData || []) as TreasurySourceRow[]).map(mapGastoOficinaToTreasuryPayment)
  const cuotaItems = cuotasData
    .map(cuota => ({ ...cuota, prestamo: prestamosPorId.get(String(cuota.prestamo_id)) }))
    .map(mapPrestamoCuotaToTreasuryPayment)
    .filter(item => item.estado_pago !== "pagado" && item.estado_pago !== "anulado" && item.monto > 0)

  return [...rqpItems, ...cajaItems, ...gastoItems, ...cuotaItems]
}
