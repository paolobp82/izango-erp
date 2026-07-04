import type { SystemSeries } from "./SystemConfigurationTypes"

export const SYSTEM_SERIES: SystemSeries[] = [
  { key: "rq", prefix: "RQ", year: 2026, currentNumber: 0, padding: 5, format: "{prefix}-{year}-{number}", active: true },
  { key: "proyecto", prefix: "IZ", year: 2026, currentNumber: 0, padding: 5, format: "{prefix}-{number}", active: true },
  { key: "factura", prefix: "F001", year: 2026, currentNumber: 0, padding: 6, format: "{prefix}-{number}", active: true }
]
