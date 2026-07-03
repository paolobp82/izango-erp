import type { UIConfiguration } from "./SystemConfigurationTypes"

export const SYSTEM_UI_CONFIG: UIConfiguration[] = [
  {
    key: "layout.default_density",
    value: "comfortable",
    metadata: { description: "Densidad visual por defecto para pantallas operativas." },
  },
  {
    key: "crm.pipeline.column_width",
    value: 240,
    metadata: { module: "crm", unit: "px" },
  },
  {
    key: "rq.table.default_page_size",
    value: 20,
    metadata: { module: "rq" },
  },
]
