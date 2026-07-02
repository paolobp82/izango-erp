import type { CoreContext, CoreResult } from "./types"

export interface CoreEngine {
  readonly name: string
  readonly version: string
}

export interface CoreEngineInput {
  context?: CoreContext
  payload?: unknown
}

export interface CoreEngineContract<TResult = unknown> extends CoreEngine {
  execute(input: CoreEngineInput): Promise<CoreResult<TResult>>
}

