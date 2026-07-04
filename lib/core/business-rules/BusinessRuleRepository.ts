import type { BusinessRule, BusinessRuleDefinition, BusinessRuleKey, BusinessRuleModule } from "./BusinessRuleTypes"

export interface BusinessRuleRepository {
  getDefinition(module: BusinessRuleModule): BusinessRuleDefinition | null
  getRules(module: BusinessRuleModule): BusinessRule[]
  getRule(module: BusinessRuleModule, key: BusinessRuleKey): BusinessRule | null
}

