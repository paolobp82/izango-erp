import type { CoreContext, CoreModuleKey, CoreResult } from "../types"

export interface BusinessRuleInput<TPayload = unknown> {
  module: CoreModuleKey
  action: string
  payload?: TPayload
  context?: CoreContext
}

export interface BusinessRuleDecision {
  allowed: boolean
  reason?: string
  warnings?: string[]
}

export interface BusinessRulesEngine {
  evaluate(input: BusinessRuleInput): Promise<CoreResult<BusinessRuleDecision>>
}

