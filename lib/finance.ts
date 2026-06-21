export const FACTURAS_COBRADAS = ["cobrada", "pagada"]
export const FACTURAS_PENDIENTES = ["pendiente", "emitida", "pendiente_cobro"]
export const FACTURAS_ANULADAS = ["anulada", "cancelada"]
export const RQS_POR_PAGAR = ["pendiente_aprobacion", "aprobado_produccion", "aprobado", "programado"]

export function financeNumber(value: any) {
  return Number(value) || 0
}

export function financeMoney(value: any) {
  return "S/ " + financeNumber(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function financeShort(value: any) {
  const amount = financeNumber(value)
  if (Math.abs(amount) >= 1_000_000) return "S/ " + (amount / 1_000_000).toFixed(1) + "M"
  if (Math.abs(amount) >= 1_000) return "S/ " + (amount / 1_000).toFixed(0) + "K"
  return financeMoney(amount)
}

export function dateValue(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function dueDateValue(factura: { fecha_vencimiento?: string | null; fecha_emision?: string | null }) {
  return factura.fecha_vencimiento || factura.fecha_emision || null
}

export function daysFromToday(value?: string | null) {
  const date = dateValue(value)
  if (!date) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - date.getTime()) / 86_400_000)
}

export function agingBucket(value?: string | null) {
  const days = daysFromToday(value)
  if (days <= 0) return "Por vencer"
  if (days <= 30) return "1-30 días"
  if (days <= 60) return "31-60 días"
  if (days <= 90) return "61-90 días"
  return "Más de 90 días"
}

export const AGING_ORDER = ["Por vencer", "1-30 días", "31-60 días", "61-90 días", "Más de 90 días"]

export function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`
}

export function monthLabel(value: Date) {
  return value.toLocaleDateString("es-PE", { month: "short", year: "2-digit" }).replace(".", "")
}
