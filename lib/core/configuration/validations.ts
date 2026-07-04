import type { ValidationRule } from "./SystemConfigurationTypes"

export const SYSTEM_VALIDATIONS: ValidationRule[] = [
  { key: "cliente.ruc.required", value: true, description: "El RUC es obligatorio para clientes." },
  { key: "rq.monto_solicitado.required", value: true, description: "El monto solicitado del RQ es obligatorio." },
  { key: "proyecto.margen_minimo", value: 25, description: "Margen mínimo recomendado del proyecto." }
]
