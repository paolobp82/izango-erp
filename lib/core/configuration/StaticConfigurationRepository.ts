import { SYSTEM_CATALOGS } from "./catalogs"
import type {
  ColumnConfiguration,
  FeatureFlag,
  FieldConfiguration,
  SystemCatalog,
  SystemCatalogItem,
  SystemParameter,
  SystemSeries,
  SystemVariable,
  UIConfiguration,
  ValidationRule,
  WorkflowConfiguration,
} from "./SystemConfigurationTypes"
import type { SystemConfigurationRepository } from "./SystemConfigurationRepository"

export class StaticConfigurationRepository implements SystemConfigurationRepository {
  async getCatalog(key: string): Promise<SystemCatalog | null> {
    return SYSTEM_CATALOGS.find(catalog => catalog.key === key) || null
  }

  async getCatalogs(): Promise<SystemCatalog[]> {
    return SYSTEM_CATALOGS
  }

  async getCatalogItem(catalogKey: string, itemKey: string): Promise<SystemCatalogItem | null> {
    const catalog = await this.getCatalog(catalogKey)
    return catalog?.items.find(item => item.key === itemKey) || null
  }

  async getParameter(): Promise<SystemParameter | null> {
    return null
  }

  async getVariable(): Promise<SystemVariable | null> {
    return null
  }

  async getSeries(): Promise<SystemSeries | null> {
    return null
  }

  async getFeature(): Promise<FeatureFlag | null> {
    return null
  }

  async getUIConfig(): Promise<UIConfiguration | null> {
    return null
  }

  async getColumns(): Promise<ColumnConfiguration[]> {
    return []
  }

  async getFields(): Promise<FieldConfiguration[]> {
    return []
  }

  async getValidation(): Promise<ValidationRule | null> {
    return null
  }

  async getWorkflow(): Promise<WorkflowConfiguration | null> {
    return null
  }
}
