import type { CoreContext, CoreModuleKey, CoreResult } from "../types"

export interface SearchRequest {
  query: string
  modules?: CoreModuleKey[]
  limit?: number
  context?: CoreContext
}

export interface SearchResultItem {
  id: string
  module: CoreModuleKey
  title: string
  subtitle?: string
  href?: string
}

export interface SearchEngine {
  search(request: SearchRequest): Promise<CoreResult<SearchResultItem[]>>
}

