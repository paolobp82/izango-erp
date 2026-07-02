import type { CoreContext, CoreModuleKey, CoreResult } from "../types"

export interface CoreEvent<TPayload = unknown> {
  type: string
  module: CoreModuleKey
  payload?: TPayload
  context?: CoreContext
  occurredAt?: string
}

export interface EventEngine {
  publish(event: CoreEvent): Promise<CoreResult<CoreEvent>>
  subscribe(eventType: string, handlerName: string): Promise<CoreResult<void>>
}

