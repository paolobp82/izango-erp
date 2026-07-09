import type { RQPFinancialModel } from "@/lib/domain/rqp"

export type CreateRQPInput = {
  proyecto_id: string
  proveedor_id: string
  proveedor_nombre?: string | null
  monto_solicitado: number
  tratamiento_igv: string
  descripcion: string
  tipo_pago?: string | null
  condicion_comercial?: string | null
  medio_pago?: string | null
  fecha_necesidad_pago?: string | null
  dias_credito?: number | null
  solicitado_por?: string | null
}

export function buildCreateRQPPayload(input: CreateRQPInput) {
  const condicion = input.condicion_comercial || input.tipo_pago || "contado"
  const medio = input.medio_pago || "Transferencia"

  return {
    proyecto_id: input.proyecto_id,
    estado: "pendiente_aprobacion",
    proveedor_id: input.proveedor_id,
    proveedor_nombre: input.proveedor_nombre || "",
    monto_solicitado: input.monto_solicitado,
    tratamiento_igv: input.tratamiento_igv,
    descripcion: input.descripcion.trim(),
    tipo_pago: condicion,
    condicion_comercial: condicion,
    medio_pago: medio,
    fecha_necesidad_pago: input.fecha_necesidad_pago || null,
    dias_credito: input.dias_credito ?? null,
    es_adicional: true,
    solicitado_por: input.solicitado_por || null,
  }
}

export type UpdateRQPFinancialInput = RQPFinancialModel & {
  descripcion?: string
  proveedor_id?: string | null
  proveedor_nombre?: string | null
  monto_solicitado?: number | null
  tratamiento_igv?: string | null
  proyecto_id?: string | null
  voucher_url?: string | null
  nota_pago?: string | null
  numero_operacion?: string | null
  banco_pago?: string | null
}

export function buildUpdateRQPFinancialPayload(input: UpdateRQPFinancialInput) {
  const condicion = input.condicion_comercial || input.tipo_pago || "contado"
  const medio = input.medio_pago || input.tipo_transferencia || "Transferencia"

  return {
    descripcion: input.descripcion,
    proveedor_id: input.proveedor_id || null,
    proveedor_nombre: input.proveedor_nombre || "",
    monto_solicitado: input.monto_solicitado,
    tratamiento_igv: input.tratamiento_igv,
    tipo_pago: condicion,
    condicion_comercial: condicion,
    medio_pago: medio,
    dias_credito: input.dias_credito ? Number(input.dias_credito) : null,
    fecha_necesidad_pago: input.fecha_necesidad_pago || null,
    fecha_pago: input.fecha_pago || null,
    voucher_url: input.voucher_url || null,
    nota_pago: input.nota_pago || null,
    numero_operacion: input.numero_operacion || null,
    banco_pago: input.banco_pago || null,
    tipo_transferencia: input.tipo_transferencia || null,
  }
}
