import { StaticLifecycleRepository } from "./StaticLifecycleRepository"
import type {
  LifecycleContext,
  LifecycleDefinition,
  LifecycleModule,
  LifecycleState,
  LifecycleStateKey,
  LifecycleTransition,
} from "./LifecycleTypes"
import type { LifecycleRepository } from "./LifecycleRepository"

export class LifecycleEngine {
  constructor(private readonly repository: LifecycleRepository = new StaticLifecycleRepository()) {}

  getDefinition(module: LifecycleModule): LifecycleDefinition | null {
    return this.repository.getDefinition(module)
  }

  getStates(module: LifecycleModule): LifecycleState[] {
    return this.getDefinition(module)?.states || []
  }

  getTransitions(module: LifecycleModule): LifecycleTransition[] {
    return this.getDefinition(module)?.transitions || []
  }

  canTransition(
    module: LifecycleModule,
    from: LifecycleStateKey | null | undefined,
    to: LifecycleStateKey | null | undefined,
    context?: LifecycleContext,
  ): boolean {
    if (!from || !to || from === to) return true

    const definition = this.getDefinition(module)
    if (!definition) return true

    const transition = definition.transitions.find(item => item.from === from && item.to === to)
    if (!transition) return false

    if (transition.metadata?.requiresAllowReopen === true) {
      return context?.metadata?.allowReopen === true
    }

    return true
  }

  getNextStates(
    module: LifecycleModule,
    from: LifecycleStateKey | null | undefined,
    context?: LifecycleContext,
  ): LifecycleState[] {
    const definition = this.getDefinition(module)
    if (!definition || !from) return []

    const nextKeys = definition.transitions
      .filter(transition => transition.from === from)
      .filter(transition => this.canTransition(module, transition.from, transition.to, context))
      .map(transition => transition.to)

    return definition.states.filter(state => nextKeys.includes(state.key))
  }
}

export const lifecycleEngine = new LifecycleEngine()
