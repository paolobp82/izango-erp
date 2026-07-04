export type LifecycleModule = string
export type LifecycleStateKey = string

export interface LifecycleContext {
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface LifecycleState {
  key: LifecycleStateKey
  label: string
  order?: number
  metadata?: Record<string, unknown>
}

export interface LifecycleTransition {
  from: LifecycleStateKey
  to: LifecycleStateKey
  label?: string
  metadata?: Record<string, unknown>
}

export interface LifecycleDefinition {
  module: LifecycleModule
  states: LifecycleState[]
  transitions: LifecycleTransition[]
  metadata?: Record<string, unknown>
}
