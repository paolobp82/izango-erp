export type TreasuryPaymentOrigin =
  | "rqp"
  | "administracion"
  | "caja_chica"
  | "obligacion_financiera"

export type TreasuryPaymentStatus =
  | "sin_programar"
  | "programado"
  | "vence_hoy"
  | "vencido"
  | "pagado"
  | "anulado"

export type TreasuryPaymentMethod =
  | "Transferencia"
  | "Efectivo"

export type TreasuryCommercialCondition =
  | "contado"
  | "credito"
  | "adelanto"

export type TreasuryPaymentItem = {
  id: string
  origen: TreasuryPaymentOrigin
  documento: string
  empresa?: string | null
  beneficiario?: string | null
  proyecto?: string | null
  fecha_necesidad_pago?: string | null
  fecha_programada_pago?: string | null
  fecha_pago?: string | null
  condicion_comercial?: TreasuryCommercialCondition | string | null
  medio_pago?: TreasuryPaymentMethod | string | null
  estado_pago: TreasuryPaymentStatus
  monto: number
}
