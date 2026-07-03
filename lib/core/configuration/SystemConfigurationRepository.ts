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

export interface SystemConfigurationRepository {
  getCatalog(key: string): Promise<SystemCatalog | null>

  getCatalogs(): Promise<SystemCatalog[]>

  getCatalogItem(
    catalogKey: string,
    itemKey: string
  ): Promise<SystemCatalogItem | null>

  getParameter(key: string): Promise<SystemParameter | null>

  getVariable(key: string): Promise<SystemVariable | null>

  getSeries(key: string): Promise<SystemSeries | null>

  getFeature(key: string): Promise<FeatureFlag | null>

  getUIConfig(key: string): Promise<UIConfiguration | null>

  getColumns(module: string): Promise<ColumnConfiguration[]>

  getFields(module: string): Promise<FieldConfiguration[]>

  getValidation(key: string): Promise<ValidationRule | null>

  getWorkflow(key: string): Promise<WorkflowConfiguration | null>
}
