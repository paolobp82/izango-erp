import type { CoreContext, CoreModuleKey, CoreResult } from "../types"

export interface LifecycleTransition {
  module: CoreModuleKey
  from: string
  to: string
  action: string
}

export interface LifecycleTransitionRequest {
  transition: LifecycleTransition
  context?: CoreContext
  payload?: unknown
}

export interface LifecycleEngine {
  canTransition(request: LifecycleTransitionRequest): Promise<CoreResult<boolean>>
  transition(request: LifecycleTransitionRequest): Promise<CoreResult<LifecycleTransition>>
}

