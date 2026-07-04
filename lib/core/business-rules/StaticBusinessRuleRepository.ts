import { CRM_BUSINESS_RULES } from "./crm"
import { FACTURACION_BUSINESS_RULES } from "./facturacion"
import { PROYECTOS_BUSINESS_RULES } from "./proyectos"
import { RQ_BUSINESS_RULES } from "./rq"
import type { BusinessRule, BusinessRuleDefinition, BusinessRuleKey, BusinessRuleModule } from "./BusinessRuleTypes"
import type { BusinessRuleRepository } from "./BusinessRuleRepository"

export class StaticBusinessRuleRepository implements BusinessRuleRepository {
  private readonly definitions: BusinessRuleDefinition[]

  constructor(definitions: BusinessRuleDefinition[] = [
    CRM_BUSINESS_RULES,
    RQ_BUSINESS_RULES,
    PROYECTOS_BUSINESS_RULES,
    FACTURACION_BUSINESS_RULES,
  ]) {
    this.definitions = definitions
  }

  getDefinition(module: BusinessRuleModule): BusinessRuleDefinition | null {
    return this.definitions.find(definition => definition.module === module) || null
  }

  getRules(module: BusinessRuleModule): BusinessRule[] {
    return this.getDefinition(module)?.rules || []
  }

  getRule(module: BusinessRuleModule, key: BusinessRuleKey): BusinessRule | null {
    return this.getRules(module).find(rule => rule.key === key) || null
  }
}

