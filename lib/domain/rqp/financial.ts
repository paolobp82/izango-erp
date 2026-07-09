import type { CondicionComercialRQP, MedioPagoRQP, RQPFinancialModel } from "./types"

export const CONDICIONES_COMERCIALES_RQP: CondicionComercialRQP[] = ["contado", "credito", "adelanto"]
export const MEDIOS_PAGO_RQP: MedioPagoRQP[] = ["Transferencia", "Efectivo"]

export function normalizarCondicionComercialRQP(value?: string | null): CondicionComercialRQP {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "credito") return "credito"
  if (normalized === "adelanto") return "adelanto"
  return "contado"
}

export function normalizarMedioPagoRQP(value?: string | null): MedioPagoRQP {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized.includes("efectivo")) return "Efectivo"
  return "Transferencia"
}

export function fechaYmdRQP(value?: string | null) {
  return value ? String(value).slice(0, 10) : ""
}

export function calcularFechaNecesidadRQP(rqp: RQPFinancialModel) {
  if (rqp.fecha_necesidad_pago) return fechaYmdRQP(rqp.fecha_necesidad_pago)

  const condicion = normalizarCondicionComercialRQP(rqp.condicion_comercial || rqp.tipo_pago)

  if (condicion === "credito" && rqp.dias_credito && rqp.created_at) {
    const base = new Date(rqp.created_at)
    if (!Number.isNaN(base.getTime())) {
      return new Date(base.getTime() + Number(rqp.dias_credito || 0) * 86400000).toISOString().slice(0, 10)
    }
  }

  if (rqp.created_at) return fechaYmdRQP(rqp.created_at)

  return ""
}

export function mapearCompatibilidadFinancieraRQP(rqp: RQPFinancialModel): RQPFinancialModel {
  return {
    ...rqp,
    condicion_comercial: normalizarCondicionComercialRQP(rqp.condicion_comercial || rqp.tipo_pago),
    medio_pago: normalizarMedioPagoRQP(rqp.medio_pago || rqp.tipo_transferencia),
    fecha_necesidad_pago: rqp.fecha_necesidad_pago || calcularFechaNecesidadRQP(rqp) || null,
  }
}
