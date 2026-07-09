import type { TreasuryPaymentItem, TreasuryPaymentStatus } from "./types"

export function ymdTreasury(value?: string | null) {
  return value ? String(value).slice(0, 10) : ""
}

export function calcularEstadoPagoTreasury(item: Partial<TreasuryPaymentItem>): TreasuryPaymentStatus {
  if (item.estado_pago === "anulado") return "anulado"
  if (ymdTreasury(item.fecha_pago)) return "pagado"

  const fechaBase = ymdTreasury(item.fecha_programada_pago) || ymdTreasury(item.fecha_necesidad_pago)

  if (!fechaBase) return "sin_programar"

  const hoy = new Date().toISOString().slice(0, 10)

  if (fechaBase < hoy) return "vencido"
  if (fechaBase === hoy) return "vence_hoy"

  return "programado"
}
