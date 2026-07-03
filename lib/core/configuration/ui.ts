import type { UIConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_UI_CONFIG: UIConfiguration[] = [
  { key: "crm.default_view", value: "kanban" },
  { key: "dashboard.show_financial_kpis", value: true },
  { key: "rq.default_sort", value: "created_at_desc" }
]
