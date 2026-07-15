/* eslint-disable @typescript-eslint/no-explicit-any */

export const RQ_MIGRATION_SUCCESS_ACTIONS = [
  "MANTENER_HISTORICO_ITEM_ELIMINADO",
  "CANCELAR_ITEM_ELIMINADO",
  "MIGRAR",
  "MIGRAR_REFERENCIA_PAGADO",
  "MIGRAR_GENERAR_DIFERENCIA",
  "MIGRAR_AJUSTAR_MONTO_MENOR",
  "MANTENER_PAGADO_GENERAR_DIFERENCIA",
  "MANTENER_PAGADO_REGISTRAR_REEMBOLSO",
  "GENERAR_RQ_DIFERENCIA",
]

export const RQ_MIGRATION_FAILED_ACTIONS = [
  "ERROR",
  "FALLIDO",
  "FALLIDA",
  "PENDIENTE",
  "ROLLBACK",
]

function logsDelRq(rq: any, migrationLogs: any[] = []) {
  const rqId = String(rq?.id || "")
  if (!rqId) return []
  return migrationLogs.filter((log: any) =>
    String(log?.rq_id || "") === rqId ||
    String(log?.rq_diferencia_id || "") === rqId
  )
}

function logFallido(log: any) {
  return RQ_MIGRATION_FAILED_ACTIONS.includes(String(log?.accion || "").toUpperCase()) ||
    String(log?.metadata?.estado || "").toLowerCase().includes("fall") ||
    Boolean(log?.metadata?.error)
}

function tieneLogFallido(rq: any, migrationLogs: any[] = []) {
  return logsDelRq(rq, migrationLogs).some(logFallido)
}

function tieneLogExitoso(rq: any, migrationLogs: any[] = []) {
  return logsDelRq(rq, migrationLogs).some((log: any) =>
    RQ_MIGRATION_SUCCESS_ACTIONS.includes(String(log?.accion || "").toUpperCase()) &&
    !logFallido(log)
  )
}

export function rqEstaMigrado(rq: any, migrationLogs: any[] = []) {
  if (rq?.es_adicional) return false
  if (rq?.cotizacion_item_id) return true
  if (tieneLogExitoso(rq, migrationLogs)) return true
  if (rq?.origen_version === "v2" || rq?.metadata?.origen === "v2") return true
  return false
}

export function rqRequiereMigracion(rq: any, migrationLogs: any[] = []) {
  if (rq?.es_adicional) return false
  if (tieneLogFallido(rq, migrationLogs)) return true
  return !rqEstaMigrado(rq, migrationLogs)
}

export function motivoEstadoMigracion(rq: any, migrationLogs: any[] = []) {
  if (rq?.es_adicional) return "No aplica: RQ adicional fuera del presupuesto."
  if (tieneLogFallido(rq, migrationLogs)) return "Migración fallida o pendiente registrada en log."
  if (rq?.cotizacion_item_id) return "Migrado: vinculado a cotizacion_item_id."
  if (tieneLogExitoso(rq, migrationLogs)) return "Migrado: existe evidencia en rq_version_migration_log."
  if (rq?.origen_version === "v2" || rq?.metadata?.origen === "v2") return "Migrado: creado bajo estructura V2."
  return "Pendiente: no se encontró vínculo a ítem ni log exitoso."
}

export function estadoMigracionRQ(rq: any, migrationLogs: any[] = []) {
  if (rq?.es_adicional) return { key: "no_aplica", label: "No aplica", color: "#6b7280", bg: "#f3f4f6" }
  if (tieneLogFallido(rq, migrationLogs)) return { key: "fallida", label: "Migración fallida", color: "#991b1b", bg: "#fee2e2" }
  if (rqEstaMigrado(rq, migrationLogs)) return { key: "migrado", label: "Migrado", color: "#15803d", bg: "#dcfce7" }
  return { key: "pendiente", label: "Pendiente de migración", color: "#92400e", bg: "#fef9c3" }
}
