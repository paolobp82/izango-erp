import type { SystemSeries } from "./SystemConfigurationTypes"

export const SYSTEM_SERIES: SystemSeries[] = [
  {
    key: "rq.codigo",
    prefix: "RQ",
    year: 2026,
    currentNumber: 0,
    padding: 5,
    format: "{prefix}-{year}-{number}",
    active: true,
    metadata: { module: "rq" },
  },
  {
    key: "crm.lead",
    prefix: "LEAD",
    year: 2026,
    currentNumber: 0,
    padding: 5,
    format: "{prefix}-{year}-{number}",
    active: true,
    metadata: { module: "crm" },
  },
]
