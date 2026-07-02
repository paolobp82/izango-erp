export type CoreEntityId = string

export type CoreUserRole =
  | "superadmin"
  | "gerente_general"
  | "controller"
  | "gerente_produccion"
  | "productor"
  | "comercial"
  | "logistica"
  | "audiovisual"
  | "administrador"
  | "practicante"

export type CoreModuleKey =
  | "dashboard"
  | "crm"
  | "clientes"
  | "proyectos"
  | "proformas"
  | "rq"
  | "facturacion"
  | "liquidaciones"
  | "finanzas"
  | "tareas"
  | "logistica"
  | "inventario"
  | "rrhh"
  | "proveedores"

export interface CoreActor {
  id: CoreEntityId
  role: CoreUserRole
  email?: string | null
  name?: string | null
}

export interface CoreContext {
  actor?: CoreActor | null
  module?: CoreModuleKey
  entityId?: CoreEntityId
  metadata?: Record<string, unknown>
}

export interface CoreResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  warnings?: string[]
}

