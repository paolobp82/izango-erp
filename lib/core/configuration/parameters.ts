import type { SystemParameter } from "./SystemConfigurationTypes"

export const SYSTEM_PARAMETERS: SystemParameter[] = [
  { key: "finanzas.igv", name: "IGV", value: 18, type: "number", scope: "global", active: true },
  { key: "finanzas.moneda_base", name: "Moneda base", value: "PEN", type: "string", scope: "global", active: true },
  { key: "proyectos.margen_minimo", name: "Margen mínimo proyecto", value: 25, type: "number", scope: "global", active: true },
  { key: "rq.monto_maximo_sin_aprobacion", name: "Monto máximo RQ sin aprobación", value: 0, type: "number", scope: "global", active: true },
  { key: "caja_chica.monto_maximo", name: "Monto máximo caja chica", value: 1500, type: "number", scope: "global", active: true }
]
