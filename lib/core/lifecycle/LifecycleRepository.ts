import type { LifecycleDefinition, LifecycleModule } from "./LifecycleTypes"

export interface LifecycleRepository {
  getDefinition(module: LifecycleModule): LifecycleDefinition | null
}
