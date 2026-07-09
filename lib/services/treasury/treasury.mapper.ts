import type { TreasuryPaymentItem } from "@/lib/domain/treasury"
import { calcularEstadoPagoTreasury } from "@/lib/domain/treasury"

export function mapRQPToTreasuryPayment(rq: any): TreasuryPaymentItem {
  const item: TreasuryPaymentItem = {
    id: String(rq.id),
    origen: "rqp",
    documento: rq.codigo_rq || rq.numero_rq || rq.id,
    empresa: rq.empresa || "Izango 360",
    beneficiario: rq.proveedor_nombre || rq.proveedor?.nombre || "",
    proyecto: rq.proyecto?.nombre || rq.proyecto_nombre || "",
    fecha_necesidad_pago: rq.fecha_necesidad_pago || null,
    fecha_programada_pago: rq.fecha_programada_pago || null,
    fecha_pago: rq.fecha_pago || null,
    condicion_comercial: rq.condicion_comercial || rq.tipo_pago || null,
    medio_pago: rq.medio_pago || rq.tipo_transferencia || null,
    estado_pago: "sin_programar",
    monto: Number(rq.monto_solicitado || 0),
  }

  return {
    ...item,
    estado_pago: calcularEstadoPagoTreasury(item),
  }
}

export function mapCajaChicaToTreasuryPayment(row: any): TreasuryPaymentItem {
  const item: TreasuryPaymentItem = {
    id: String(row.id),
    origen: "caja_chica",
    documento: row.numero_operacion || row.concepto || row.id,
    empresa: row.entidad || "Izango 360",
    beneficiario: row.destinatario || row.proveedor_nombre || "",
    proyecto: row.proyecto?.nombre || row.proyecto_nombre || "",
    fecha_necesidad_pago: row.fecha || null,
    fecha_programada_pago: row.fecha || null,
    fecha_pago: row.estado === "aprobado" ? row.aprobado_at || row.fecha : null,
    condicion_comercial: "contado",
    medio_pago: "Efectivo",
    estado_pago: row.estado === "rechazado" ? "anulado" : "sin_programar",
    monto: Number(row.monto_debe || 0),
  }

  return {
    ...item,
    estado_pago: row.estado === "rechazado" ? "anulado" : calcularEstadoPagoTreasury(item),
  }
}
