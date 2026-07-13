import type { TreasuryPaymentItem } from "@/lib/domain/treasury"
import { calcularEstadoPagoTreasury } from "@/lib/domain/treasury"

type TreasurySourceRow = Record<string, unknown>

function asRecord(value: unknown): TreasurySourceRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as TreasurySourceRow : {}
}

function text(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return ""
}

function nullableText(value: unknown) {
  const valueText = text(value)
  return valueText || null
}

function num(value: unknown) {
  return Number(value || 0)
}

export function mapRQPToTreasuryPayment(rq: TreasurySourceRow): TreasuryPaymentItem {
  const proyecto = asRecord(rq.proyecto)
  const item: TreasuryPaymentItem = {
    id: text(rq.id),
    origen: "rqp",
    documento: text(rq.codigo_rq) || text(rq.numero_rq) || text(rq.id),
    empresa: text(rq.empresa) || "Izango 360",
    beneficiario: text(rq.proveedor_nombre) || text(asRecord(rq.proveedor).nombre),
    proyecto: text(proyecto.nombre) || text(rq.proyecto_nombre),
    fecha_necesidad_pago: nullableText(rq.fecha_necesidad_pago),
    fecha_programada_pago: nullableText(rq.fecha_programada_pago),
    fecha_pago: nullableText(rq.fecha_pago),
    condicion_comercial: nullableText(rq.condicion_comercial) || nullableText(rq.tipo_pago),
    medio_pago: nullableText(rq.medio_pago) || nullableText(rq.tipo_transferencia),
    estado_pago: "sin_programar",
    monto: num(rq.monto_solicitado),
    es_excepcion: Boolean(rq.es_excepcion),
    motivo_excepcion: nullableText(rq.motivo_excepcion),
    prioridad: rq.es_excepcion ? "alta" : "normal",
  }

  return {
    ...item,
    estado_pago: calcularEstadoPagoTreasury(item),
  }
}

export function mapCajaChicaToTreasuryPayment(row: TreasurySourceRow): TreasuryPaymentItem {
  const proyecto = asRecord(row.proyecto)
  const item: TreasuryPaymentItem = {
    id: text(row.id),
    origen: "caja_chica",
    documento: text(row.numero_operacion) || text(row.concepto) || text(row.id),
    empresa: text(row.entidad) || "Izango 360",
    beneficiario: text(row.destinatario) || text(row.proveedor_nombre),
    proyecto: text(proyecto.nombre) || text(row.proyecto_nombre),
    fecha_necesidad_pago: nullableText(row.fecha),
    fecha_programada_pago: nullableText(row.fecha),
    fecha_pago: null,
    condicion_comercial: "contado",
    medio_pago: "Efectivo",
    estado_pago: row.estado === "rechazado" ? "anulado" : "sin_programar",
    monto: num(row.monto_debe),
  }

  return {
    ...item,
    estado_pago: row.estado === "rechazado" ? "anulado" : calcularEstadoPagoTreasury(item),
  }
}

export function mapGastoOficinaToTreasuryPayment(row: TreasurySourceRow): TreasuryPaymentItem {
  const proveedor = asRecord(row.proveedor)
  const fechaPagoReal = null
  const item: TreasuryPaymentItem = {
    id: text(row.id),
    origen: "administracion",
    documento: text(row.numero_comprobante) || text(row.descripcion) || text(row.id),
    empresa: text(row.entidad) || "Izango 360",
    beneficiario: text(row.proveedor_nombre) || text(proveedor.nombre),
    proyecto: "",
    fecha_necesidad_pago: nullableText(row.fecha_vencimiento) || nullableText(row.fecha),
    fecha_programada_pago: nullableText(row.fecha_vencimiento) || nullableText(row.fecha),
    fecha_pago: fechaPagoReal,
    condicion_comercial: "contado",
    medio_pago: row.tipo_transferencia === "efectivo" ? "Efectivo" : "Transferencia",
    estado_pago: fechaPagoReal ? "pagado" : "sin_programar",
    monto: num(row.monto_pen) || num(row.monto),
  }

  return {
    ...item,
    estado_pago: fechaPagoReal ? "pagado" : calcularEstadoPagoTreasury(item),
  }
}

export function mapPrestamoCuotaToTreasuryPayment(row: TreasurySourceRow): TreasuryPaymentItem {
  const prestamo = row.prestamo || {}
  const prestamoRecord = asRecord(prestamo)
  const montoTotal = num(row.monto_total)
  const montoPagado = num(row.monto_pagado)
  const saldoPendiente = Math.max(montoTotal - montoPagado, 0)
  const estadoCuota = text(row.estado).toLowerCase()
  const estadoPrestamo = text(prestamoRecord.estado).toLowerCase()
  const anulada = ["cancelado", "anulado"].includes(estadoCuota) || ["cancelado", "anulado"].includes(estadoPrestamo)
  const pagada = estadoCuota === "pagado" || saldoPendiente <= 0

  const item: TreasuryPaymentItem = {
    id: text(row.id),
    origen: "obligacion_financiera",
    documento: `${text(prestamoRecord.nombre) || "Obligación financiera"} - Cuota ${text(row.numero_cuota) || "N/D"}`,
    empresa: text(prestamoRecord.entidad) || "Izango 360",
    beneficiario: text(prestamoRecord.prestamista),
    proyecto: "",
    fecha_necesidad_pago: nullableText(row.fecha_vencimiento),
    fecha_programada_pago: nullableText(row.fecha_vencimiento),
    fecha_pago: pagada ? nullableText(row.fecha_pago) : null,
    condicion_comercial: "credito",
    medio_pago: nullableText(prestamoRecord.banco_prestamista),
    estado_pago: anulada ? "anulado" : "sin_programar",
    monto: saldoPendiente,
  }

  if (anulada) return { ...item, estado_pago: "anulado" }
  if (pagada && item.fecha_pago) return { ...item, estado_pago: "pagado" }

  return {
    ...item,
    estado_pago: calcularEstadoPagoTreasury(item),
  }
}

