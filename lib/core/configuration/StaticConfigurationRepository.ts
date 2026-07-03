import { SYSTEM_CATALOGS } from "./catalogs"
import { SYSTEM_COLUMNS } from "./columns"
import { SYSTEM_FEATURES } from "./features"
import { SYSTEM_FIELDS } from "./fields"
import { SYSTEM_PARAMETERS } from "./parameters"
import { SYSTEM_SERIES } from "./series"
import { SYSTEM_UI_CONFIG } from "./ui"
import { SYSTEM_VALIDATIONS } from "./validations"
import { SYSTEM_VARIABLES } from "./variables"
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

  async getParameter(key: string): Promise<SystemParameter | null> {
    return SYSTEM_PARAMETERS.find(parameter => parameter.key === key && parameter.active) || null
  }

  async getVariable(key: string): Promise<SystemVariable | null> {
    return SYSTEM_VARIABLES.find(variable => variable.key === key) || null
  }

  async getSeries(key: string): Promise<SystemSeries | null> {
    return SYSTEM_SERIES.find(series => series.key === key && series.active) || null
  }

  async getFeature(key: string): Promise<FeatureFlag | null> {
    return SYSTEM_FEATURES.find(feature => feature.key === key) || null
  }

  async getUIConfig(key: string): Promise<UIConfiguration | null> {
    return SYSTEM_UI_CONFIG.find(config => config.key === key) || null
  }

  async getColumns(module: string): Promise<ColumnConfiguration[]> {
    return SYSTEM_COLUMNS
      .filter(column => column.module === module)
      .sort((a, b) => a.order - b.order)
  }

  async getFields(module: string): Promise<FieldConfiguration[]> {
    return SYSTEM_FIELDS.filter(field => field.module === module)
  }

  async getValidation(key: string): Promise<ValidationRule | null> {
    return SYSTEM_VALIDATIONS.find(validation => validation.key === key) || null
  }

  async getWorkflow(): Promise<WorkflowConfiguration | null> {
    return null
  }
}
