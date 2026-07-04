export type BusinessRuleModule = "crm" | "rq" | "proyectos" | "facturacion" | string
export type BusinessRuleKey = string

export type BusinessRuleContext = {
  action?: string
  record?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  user?: Record<string, unknown> | null
  [key: string]: unknown
}

export type BusinessRuleResult = {
  allowed: boolean
  reason?: string
  warnings?: string[]
  nextActions?: string[]
}

export type BusinessRule = {
  key: BusinessRuleKey
  module: BusinessRuleModule
  description?: string
  evaluate: (context?: BusinessRuleContext) => BusinessRuleResult
}

export type BusinessRuleDefinition = {
  module: BusinessRuleModule
  rules: BusinessRule[]
}

