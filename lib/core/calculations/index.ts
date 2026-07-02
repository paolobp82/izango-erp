import type { CoreContext, CoreModuleKey, CoreResult } from "../types"

export interface CalculationRequest<TPayload = unknown> {
  module: CoreModuleKey
  calculation: string
  payload?: TPayload
  context?: CoreContext
}

export interface CalculationResult<TValue = number> {
  value: TValue
  currency?: string
  precision?: number
  metadata?: Record<string, unknown>
}

export interface CalculationEngine {
  calculate<TValue = number>(request: CalculationRequest): Promise<CoreResult<CalculationResult<TValue>>>
}

