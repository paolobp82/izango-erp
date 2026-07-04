import { CRM_LIFECYCLE_DEFINITION } from "./crm"
import type { LifecycleDefinition, LifecycleModule } from "./LifecycleTypes"
import type { LifecycleRepository } from "./LifecycleRepository"

export class StaticLifecycleRepository implements LifecycleRepository {
  private readonly definitions: LifecycleDefinition[]

  constructor(definitions: LifecycleDefinition[] = [CRM_LIFECYCLE_DEFINITION]) {
    this.definitions = definitions
  }

  getDefinition(module: LifecycleModule): LifecycleDefinition | null {
    return this.definitions.find(definition => definition.module === module) || null
  }
}
