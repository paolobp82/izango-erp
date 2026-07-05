import { SYSTEM_CATALOGS } from "./catalogs"

const RQ_ESTADOS_FALLBACK: Record<string, { bg: string; color: string; label: string }> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e", label: "Pendiente aprobacion" },
  aprobado_produccion: { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Produccion" },
  aprobado: { bg: "#dcfce7", color: "#15803d", label: "Aprobado GG" },
  programado: { bg: "#dbeafe", color: "#1e40af", label: "Programado pago" },
  pagado: { bg: "#f0fdf4", color: "#166534", label: "Pagado" },
  cancelado: { bg: "#f3f4f6", color: "#6b7280", label: "Cancelado" },
  rechazado: { bg: "#fee2e2", color: "#991b1b", label: "Rechazado" },
}

export function getRQEstadosVisuales() {
  const catalog = SYSTEM_CATALOGS.find(item => item.key === "rq.estados")
  const items = catalog?.items.filter(item => item.active !== false) || []

  if (items.length === 0) return RQ_ESTADOS_FALLBACK

  return items.reduce<Record<string, { bg: string; color: string; label: string }>>((acc, item) => {
    const fallback = RQ_ESTADOS_FALLBACK[item.key] || { bg: "#f3f4f6", color: "#6b7280", label: item.label }
    acc[item.key] = {
      bg: String(item.metadata?.bg || fallback.bg),
      color: item.color || fallback.color,
      label: item.label || fallback.label,
    }
    return acc
  }, {})
}
