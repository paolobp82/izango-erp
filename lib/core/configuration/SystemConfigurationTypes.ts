/**
 * SIG IZANGO 360
 * System Configuration Engine
 * Tipos base del motor de configuración.
 */

export type SystemConfigValueType =
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "date"

export type SystemConfigScope =
  | "global"
  | "empresa"
  | "modulo"
  | "usuario"

export interface SystemCatalogItem {
  id: string
  catalogKey: string
  key: string
  label: string
  description?: string
  color?: string
  icon?: string
  order: number
  active: boolean
  system: boolean
  metadata?: Record<string, unknown>
}

export interface SystemCatalog {
  key: string
  name: string
  description?: string
  module: string
  editable: boolean
  items: SystemCatalogItem[]
}

export interface SystemParameter {
  key: string
  name: string
  value: unknown
  type: SystemConfigValueType
  scope: SystemConfigScope
  active: boolean
  metadata?: Record<string, unknown>
}

export interface SystemVariable {
  key: string
  value: unknown
  metadata?: Record<string, unknown>
}

export interface SystemSeries {
  key: string
  prefix: string
  year: number
  currentNumber: number
  padding: number
  format?: string
  active: boolean
  metadata?: Record<string, unknown>
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description?: string
  metadata?: Record<string, unknown>
}

export interface UIConfiguration {
  key: string
  value: unknown
  metadata?: Record<string, unknown>
}

export interface FieldConfiguration {
  module: string
  field: string
  visible: boolean
  required: boolean
  readonly: boolean
  metadata?: Record<string, unknown>
}

export interface ColumnConfiguration {
  module: string
  column: string
  visible: boolean
  order: number
  width?: number
  metadata?: Record<string, unknown>
}

export interface ValidationRule {
  key: string
  value: unknown
  description?: string
  metadata?: Record<string, unknown>
}

export interface WorkflowTransition {
  from: string
  to: string
  label?: string
  requiredRoles?: string[]
  requiredConditions?: string[]
  metadata?: Record<string, unknown>
}

export interface WorkflowConfiguration {
  key: string
  steps: string[]
  transitions: WorkflowTransition[]
  metadata?: Record<string, unknown>
}