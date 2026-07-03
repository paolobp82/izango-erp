import { StaticConfigurationRepository } from "./StaticConfigurationRepository"
import type { SystemConfigurationRepository } from "./SystemConfigurationRepository"

export class SystemConfigurationEngine {
  constructor(private readonly repository: SystemConfigurationRepository) {}

  getCatalog(key: string) {
    return this.repository.getCatalog(key)
  }

  getCatalogs() {
    return this.repository.getCatalogs()
  }

  getCatalogItem(catalogKey: string, itemKey: string) {
    return this.repository.getCatalogItem(catalogKey, itemKey)
  }

  async isValidCatalogItem(catalogKey: string, itemKey: string) {
    const item = await this.getCatalogItem(catalogKey, itemKey)
    return Boolean(item?.active)
  }

  getParameter(key: string) {
    return this.repository.getParameter(key)
  }

  getVariable(key: string) {
    return this.repository.getVariable(key)
  }

  getSeries(key: string) {
    return this.repository.getSeries(key)
  }

  getFeature(key: string) {
    return this.repository.getFeature(key)
  }

  async isFeatureEnabled(key: string) {
    const feature = await this.getFeature(key)
    return Boolean(feature?.enabled)
  }

  getUIConfig(key: string) {
    return this.repository.getUIConfig(key)
  }

  getColumns(module: string) {
    return this.repository.getColumns(module)
  }

  getFields(module: string) {
    return this.repository.getFields(module)
  }

  getValidation(key: string) {
    return this.repository.getValidation(key)
  }

  getWorkflow(key: string) {
    return this.repository.getWorkflow(key)
  }
}

export const SystemConfiguration = new SystemConfigurationEngine(
  new StaticConfigurationRepository()
)
