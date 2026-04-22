export type Entidad = "peru" | "selva"
export type PerfilType = "gerente_general" | "comercial" | "gerente_produccion" | "productor" | "administrador" | "gerente_finanzas"
export type EstadoProyecto = "pendiente_aprobacion" | "aprobado" | "en_curso" | "terminado" | "facturado" | "liquidado"
export type EstadoCotizacion = "borrador" | "en_revision" | "aprobada_interna" | "enviada_cliente" | "aprobada_cliente" | "rechazada" | "recotizar"
export type EstadoRQ = "borrador" | "pendiente_aprobacion" | "aprobado" | "pagado" | "rechazado"

export interface Perfil {
  id: string; nombre: string; apellido: string; email: string
  perfil: PerfilType; entidad: Entidad; activo: boolean; created_at: string
}
export interface Cliente {
  id: string; entidad: Entidad; razon_social: string; ruc?: string
  nombre_contacto?: string; telefono_contacto?: string; email_contacto?: string
  nombre_facturacion?: string; email_facturacion?: string; direccion?: string
  activo: boolean; created_at: string
}
export interface Proyecto {
  id: string; entidad: Entidad; codigo: string; nombre: string
  cliente_id: string; productor_id?: string; comercial_id?: string
  estado: EstadoProyecto; descripcion_requerimiento?: string
  presupuesto_referencial?: number; fecha_limite_cotizacion?: string
  fecha_aprobacion_cliente?: string; fecha_inicio?: string
  fecha_fin_estimada?: string; fecha_fin_real?: string
  created_at: string; updated_at: string
  cliente?: Cliente; productor?: Perfil; comercial?: Perfil
}
export interface Cotizacion {
  id: string; proyecto_id: string; version: number; estado: EstadoCotizacion
  validez_dias: number; condicion_pago: string; fee_agencia_pct: number
  igv_pct: number; subtotal_costo: number; subtotal_precio_cliente: number
  fee_agencia_monto: number; subtotal_con_fee: number; igv_monto: number
  total_cliente: number; margen_pct: number; motivo_version?: string
  created_at: string; updated_at: string; items?: any[]; proyecto?: Proyecto
}
export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  pendiente_aprobacion: "Pendiente aprobacion",
  aprobado: "Aprobado", en_curso: "En curso", terminado: "Terminado",
  facturado: "Facturado", liquidado: "Liquidado",
}
export const PERFIL_LABELS: Record<PerfilType, string> = {
  gerente_general: "Gerente General", comercial: "Comercial",
  gerente_produccion: "Gerente de Produccion", productor: "Productor",
  administrador: "Administrador", gerente_finanzas: "Gerente de Finanzas",
}