import type { TreasuryPaymentItem } from "@/lib/domain/treasury"
import { ymdTreasury } from "@/lib/domain/treasury"

function addDays(base: Date, days: number) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function paymentDate(item: TreasuryPaymentItem) {
  return ymdTreasury(item.fecha_programada_pago) || ymdTreasury(item.fecha_necesidad_pago) || ymdTreasury(item.fecha_pago)
}

function isPending(item: TreasuryPaymentItem) {
  return item.estado_pago !== "pagado" && item.estado_pago !== "anulado"
}

export function calculateTreasuryKpis(items: TreasuryPaymentItem[]) {
  const today = new Date().toISOString().slice(0, 10)
  const next7 = addDays(new Date(), 7)
  const pendingItems = items.filter(isPending)
  const dueTodayItems = pendingItems.filter(item => paymentDate(item) === today || item.estado_pago === "vence_hoy")
  const next7Items = pendingItems.filter(item => {
    const date = paymentDate(item)
    return date >= today && date <= next7
  })

  return {
    totalPendiente: pendingItems.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    totalVencido: pendingItems
      .filter(item => item.estado_pago === "vencido")
      .reduce((sum, item) => sum + Number(item.monto || 0), 0),
    pagosHoy: dueTodayItems.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    proximos7Dias: next7Items.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    obligacionesPendientes: pendingItems.filter(item => item.origen === "obligacion_financiera").length,
  }
}
