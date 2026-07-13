import type { SupabaseClient } from "@supabase/supabase-js"
import {
  mapCajaChicaToTreasuryPayment,
  mapGastoOficinaToTreasuryPayment,
  mapPrestamoCuotaToTreasuryPayment,
  mapRQPToTreasuryPayment,
} from "./treasury.mapper"
import type {
  FinancialDailyClose,
  FinancialDashboardBalance,
  FinancialDashboardInputs,
  FinancialDashboardInvoice,
  FinancialDashboardParameter,
  TreasuryCompany,
} from "./dashboard-financial.types"
import { TREASURY_COMPANIES } from "./dashboard-financial.types"
import type { TreasuryPaymentItem } from "@/lib/domain/treasury"

type SourceRow = Record<string, unknown>

function asRows(data: unknown): SourceRow[] {
  return Array.isArray(data) ? data as SourceRow[] : []
}

function numberValue(value: unknown) {
  return Number(value || 0)
}

function normalizeCompany(value: unknown): TreasuryCompany {
  const text = String(value || "").trim().toLowerCase()
  if (text.includes("selva")) return "Izango Selva"
  if (text.includes("caja")) return "Caja Chica"
  return "Izango 360"
}

function invoiceCompany(invoice: FinancialDashboardInvoice): TreasuryCompany {
  return normalizeCompany(invoice.entidad_factoring || invoice.tipo_cobro)
}

function normalizeBalance(row: SourceRow): FinancialDashboardBalance {
  return {
    id: String(row.id || ""),
    fecha: String(row.fecha || ""),
    empresa: normalizeCompany(row.empresa),
    cuenta: String(row.cuenta || "Principal"),
    saldo_inicial: numberValue(row.saldo_inicial),
    nivel_minimo: row.nivel_minimo == null ? null : numberValue(row.nivel_minimo),
    nivel_seguridad: row.nivel_seguridad == null ? null : numberValue(row.nivel_seguridad),
  }
}

function normalizeParameter(row: SourceRow): FinancialDashboardParameter {
  return {
    empresa: normalizeCompany(row.empresa),
    cuenta: String(row.cuenta || "Principal"),
    nivel_minimo: numberValue(row.nivel_minimo),
    nivel_seguridad: numberValue(row.nivel_seguridad),
  }
}

function normalizeInvoice(row: SourceRow): FinancialDashboardInvoice {
  return {
    id: String(row.id || ""),
    numero_factura: String(row.numero_factura || ""),
    estado: String(row.estado || ""),
    fecha_emision: row.fecha_emision ? String(row.fecha_emision) : null,
    fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento) : null,
    fecha_abono: row.fecha_abono ? String(row.fecha_abono) : null,
    monto_final_abonado: numberValue(row.monto_final_abonado),
    subtotal: numberValue(row.subtotal),
    igv: numberValue(row.igv),
    entidad_factoring: row.entidad_factoring ? String(row.entidad_factoring) : null,
    tipo_cobro: row.tipo_cobro ? String(row.tipo_cobro) : null,
  }
}

function normalizeClose(row: SourceRow): FinancialDailyClose {
  return {
    id: String(row.id || ""),
    fecha: String(row.fecha || ""),
    empresa: normalizeCompany(row.empresa),
    caja_final_proyectada: numberValue(row.caja_final_proyectada),
    caja_disponible: numberValue(row.caja_disponible),
    estado_liquidez: String(row.estado_liquidez || "sin_datos"),
  }
}

function dedupePayments(items: TreasuryPaymentItem[]) {
  const map = new Map<string, TreasuryPaymentItem>()
  for (const item of items) {
    const key = `${item.origen}:${item.id}`
    if (!map.has(key)) map.set(key, item)
  }
  return Array.from(map.values())
}

function logDashboardSourceError(source: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return
  console.error("[Dashboard Financiero]", source, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  })
}

function userFacingError(source: string, error: { message?: string; code?: string } | null) {
  if (!error) return ""
  const message = String(error.message || "").toLowerCase()
  if (message.includes("does not exist") || message.includes("schema cache") || error.code === "42P01" || error.code === "PGRST205") {
    return `${source}: falta aplicar o refrescar la configuración de tesorería.`
  }
  return `${source}: no se pudo cargar la información.`
}

async function loadBalances(supabase: SupabaseClient, fecha: string) {
  const { data, error } = await supabase
    .from("tesoreria_saldos_diarios")
    .select("id,fecha,empresa,cuenta,saldo_inicial,nivel_minimo,nivel_seguridad")
    .eq("fecha", fecha)
    .order("empresa", { ascending: true })

  logDashboardSourceError("Saldos diarios", error)
  return { rows: asRows(data).map(normalizeBalance), error }
}

async function loadParameters(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tesoreria_parametros")
    .select("empresa,cuenta,nivel_minimo,nivel_seguridad")
    .eq("activo", true)
    .order("empresa", { ascending: true })

  logDashboardSourceError("Parámetros", error)
  return { rows: asRows(data).map(normalizeParameter), error }
}

async function loadInvoices(supabase: SupabaseClient, fecha: string) {
  const firstDay = `${fecha.slice(0, 7)}-01`
  const { data, error } = await supabase
    .from("facturas")
    .select("id,numero_factura,estado,fecha_emision,fecha_vencimiento,fecha_abono,monto_final_abonado,subtotal,igv,tipo_cobro,entidad_factoring")
    .or(`fecha_vencimiento.gte.${firstDay},fecha_emision.gte.${firstDay},fecha_abono.gte.${firstDay}`)
    .limit(1000)

  logDashboardSourceError("Facturación", error)
  return { rows: asRows(data).map(normalizeInvoice), error }
}

async function loadDailyCloses(supabase: SupabaseClient, fecha: string) {
  const from = new Date(`${fecha}T00:00:00`)
  from.setDate(from.getDate() - 30)
  const desde = from.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from("tesoreria_cierres_diarios")
    .select("id,fecha,empresa,caja_final_proyectada,caja_disponible,estado_liquidez")
    .gte("fecha", desde)
    .lte("fecha", fecha)
    .order("fecha", { ascending: true })

  logDashboardSourceError("Cierres diarios", error)
  return { rows: asRows(data).map(normalizeClose), error }
}

async function loadTreasuryPaymentsForDashboard(supabase: SupabaseClient) {
  const errors: string[] = []
  const items: TreasuryPaymentItem[] = []

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
      es_excepcion,
      motivo_excepcion,
      estado,
      proyecto:proyectos(id, nombre, codigo)
    `)
    .not("estado", "in", '("cancelado","rechazado")')
    .order("created_at", { ascending: false })
    .limit(1000)

  if (rqpError) {
    logDashboardSourceError("RQP", rqpError)
    errors.push(userFacingError("RQP", rqpError))
  }
  else items.push(...asRows(rqpData).map(mapRQPToTreasuryPayment).map(item => ({ ...item, categoria: "Producción" })))

  const { data: cajaData, error: cajaError } = await supabase
    .from("caja_chica")
    .select(`
      id,
      concepto,
      monto_debe,
      monto_haber,
      fecha,
      estado,
      entidad,
      destinatario,
      proveedor_nombre,
      numero_operacion,
      categoria,
      proyecto:proyectos(nombre,codigo)
    `)
    .not("estado", "eq", "rechazado")
    .order("created_at", { ascending: false })
    .limit(1000)

  if (cajaError) {
    logDashboardSourceError("Caja Chica", cajaError)
    errors.push(userFacingError("Caja Chica", cajaError))
  }
  else items.push(...asRows(cajaData).map(row => {
    const item = mapCajaChicaToTreasuryPayment(row)
    return { ...item, categoria: String(row.categoria || "Otros") }
  }))

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
    .not("estado_pago", "eq", "anulado")
    .order("fecha", { ascending: false })
    .limit(1000)

  if (gastosError) {
    logDashboardSourceError("Gastos Oficina", gastosError)
    errors.push(userFacingError("Gastos Oficina", gastosError))
  }
  else items.push(...asRows(gastosData).map(row => {
    const item = mapGastoOficinaToTreasuryPayment(row)
    return { ...item, categoria: String(row.tipo || "Administrativo") }
  }))

  const { data: prestamosData, error: prestamosError } = await supabase
    .from("prestamos")
    .select("id,nombre,prestamista,banco_prestamista,entidad,estado")
    .not("estado", "in", '("pagado","cancelado")')
    .order("created_at", { ascending: false })
    .limit(500)

  if (prestamosError) {
    logDashboardSourceError("Obligaciones", prestamosError)
    errors.push(userFacingError("Obligaciones", prestamosError))
  } else {
    const prestamos = asRows(prestamosData)
    const prestamosPorId = new Map(prestamos.map(prestamo => [String(prestamo.id), prestamo]))

    if (prestamos.length > 0) {
      const { data: cuotasData, error: cuotasError } = await supabase
        .from("prestamo_cuotas")
        .select("id,prestamo_id,numero_cuota,fecha_vencimiento,monto_total,monto_pagado,estado,fecha_pago")
        .in("prestamo_id", prestamos.map(prestamo => prestamo.id))
        .not("estado", "in", '("pagado","cancelado","anulado")')
        .order("fecha_vencimiento", { ascending: true })
        .limit(1000)

      if (cuotasError) {
        logDashboardSourceError("Cuotas obligaciones", cuotasError)
        errors.push(userFacingError("Cuotas obligaciones", cuotasError))
      }
      else {
        items.push(...asRows(cuotasData)
          .map(cuota => ({ ...cuota, prestamo: prestamosPorId.get(String(cuota.prestamo_id)) }))
          .map(mapPrestamoCuotaToTreasuryPayment)
          .map(item => ({ ...item, categoria: "Administrativo" }))
          .filter(item => item.estado_pago !== "pagado" && item.estado_pago !== "anulado" && item.monto > 0))
      }
    }
  }

  return { rows: dedupePayments(items), errors }
}

export function resolveInvoiceCompany(invoice: FinancialDashboardInvoice) {
  return invoiceCompany(invoice)
}

export async function loadFinancialDashboardInputs(supabase: SupabaseClient, fecha: string): Promise<FinancialDashboardInputs> {
  const [balances, parameters, invoices, history, payments] = await Promise.all([
    loadBalances(supabase, fecha),
    loadParameters(supabase),
    loadInvoices(supabase, fecha),
    loadDailyCloses(supabase, fecha),
    loadTreasuryPaymentsForDashboard(supabase),
  ])

  const errors = [
    userFacingError("Saldos diarios", balances.error),
    userFacingError("Parámetros", parameters.error),
    userFacingError("Facturación", invoices.error),
    userFacingError("Cierres diarios", history.error),
    ...payments.errors,
  ].filter(Boolean)

  return {
    fecha,
    balances: balances.rows.filter(row => TREASURY_COMPANIES.includes(row.empresa)),
    parameters: parameters.rows.filter(row => TREASURY_COMPANIES.includes(row.empresa)),
    invoices: invoices.rows,
    payments: payments.rows,
    history: history.rows,
    errors,
  }
}
