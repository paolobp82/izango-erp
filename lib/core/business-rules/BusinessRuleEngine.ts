import { StaticBusinessRuleRepository } from "./StaticBusinessRuleRepository"
import type { BusinessRuleRepository } from "./BusinessRuleRepository"
import type {
  BusinessRuleContext,
  BusinessRuleKey,
  BusinessRuleModule,
  BusinessRuleResult,
} from "./BusinessRuleTypes"

const ALLOWED_RESULT: BusinessRuleResult = { allowed: true }

export class BusinessRuleEngine {
  constructor(private readonly repository: BusinessRuleRepository = new StaticBusinessRuleRepository()) {}

  getDefinition(module: BusinessRuleModule) {
    return this.repository.getDefinition(module)
  }

  getRules(module: BusinessRuleModule) {
    return this.repository.getRules(module)
  }

  getRule(module: BusinessRuleModule, key: BusinessRuleKey) {
    return this.repository.getRule(module, key)
  }

  evaluate(module: BusinessRuleModule, key: BusinessRuleKey, context?: BusinessRuleContext): BusinessRuleResult {
    const rule = this.getRule(module, key)
    if (!rule) return ALLOWED_RESULT
    return normalizeResult(rule.evaluate(context))
  }

  evaluateModule(module: BusinessRuleModule, context?: BusinessRuleContext): BusinessRuleResult {
    const results = this.getRules(module).map(rule => normalizeResult(rule.evaluate(context)))
    return mergeResults(results)
  }

  allow(module: BusinessRuleModule, key: BusinessRuleKey, context?: BusinessRuleContext): BusinessRuleResult {
    return this.evaluate(module, key, context)
  }
}

function normalizeResult(result: BusinessRuleResult): BusinessRuleResult {
  return {
    allowed: result.allowed,
    reason: result.reason,
    warnings: result.warnings?.filter(Boolean),
    nextActions: result.nextActions?.filter(Boolean),
  }
}

function mergeResults(results: BusinessRuleResult[]): BusinessRuleResult {
  if (results.length === 0) return ALLOWED_RESULT

  const blocked = results.find(result => !result.allowed)
  return {
    allowed: !blocked,
    reason: blocked?.reason,
    warnings: results.flatMap(result => result.warnings || []),
    nextActions: results.flatMap(result => result.nextActions || []),
  }
}

export const businessRuleEngine = new BusinessRuleEngine()

