import type { CoreContext, CoreModuleKey, CoreResult } from "../types"

export interface ConfigurationValue<TValue = unknown> {
  key: string
  value: TValue
  module?: CoreModuleKey
}

export interface ConfigurationEngine {
  get<TValue = unknown>(key: string, context?: CoreContext): Promise<CoreResult<ConfigurationValue<TValue>>>
  list(module: CoreModuleKey, context?: CoreContext): Promise<CoreResult<ConfigurationValue[]>>
}

