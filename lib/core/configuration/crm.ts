import { SYSTEM_CATALOGS } from "./catalogs"

type VisualConfig = { bg?: string; color: string; label: string }

const CRM_ESTADOS_FALLBACK: Record<string, Required<VisualConfig>> = {
  nuevo: { bg: "#dbeafe", color: "#1e40af", label: "Nuevo" },
  contactado: { bg: "#fef9c3", color: "#92400e", label: "Contactado" },
  reunion: { bg: "#fed7aa", color: "#9a3412", label: "Reunión" },
  propuesta: { bg: "#f5f3ff", color: "#6d28d9", label: "Propuesta" },
  negociacion: { bg: "#fce7f3", color: "#9d174d", label: "Negociación" },
  ganado: { bg: "#dcfce7", color: "#15803d", label: "Ganado" },
  perdido: { bg: "#fee2e2", color: "#991b1b", label: "Perdido" },
}

const CRM_TEMPERATURAS_FALLBACK: Record<string, VisualConfig> = {
  frio: { color: "#3b82f6", label: "Frio" },
  tibio: { color: "#f59e0b", label: "Tibio" },
  caliente: { color: "#ef4444", label: "Caliente" },
}

const CRM_ORIGENES_FALLBACK = ["Referido", "Web", "LinkedIn", "Evento", "Llamada fria", "Email", "Otro"]
const CRM_INDUSTRIAS_FALLBACK = ["Retail", "Banca", "Tecnologia", "Alimentos", "Automotriz", "Farmaceutica", "Telecomunicaciones", "Gobierno", "Educacion", "Otro"]

function catalogItems(key: string) {
  return (SYSTEM_CATALOGS.find(catalog => catalog.key === key)?.items || [])
    .filter(item => item.active)
    .sort((a, b) => a.order - b.order)
}

function mergeLabels(items: string[], fallback: string[]) {
  const labels = items.filter(Boolean)
  const existing = new Set(labels.map(label => label.toLowerCase()))
  fallback.forEach(label => {
    if (!existing.has(label.toLowerCase())) labels.push(label)
  })
  return labels
}

export function getCRMEstadosVisuales() {
  const items = catalogItems("crm.estados")
  if (items.length === 0) return CRM_ESTADOS_FALLBACK

  return items.reduce<Record<string, Required<VisualConfig>>>((acc, item) => {
    const fallback = CRM_ESTADOS_FALLBACK[item.key] || { bg: "#f3f4f6", color: item.color || "#6b7280", label: item.label }
    acc[item.key] = {
      bg: String(item.metadata?.bg || fallback.bg),
      color: String(item.metadata?.color || fallback.color),
      label: item.label || fallback.label,
    }
    return acc
  }, {})
}

export function getCRMEstadosPipeline() {
  const items = catalogItems("crm.estados")
  return items.length > 0 ? items.map(item => item.key) : Object.keys(CRM_ESTADOS_FALLBACK)
}

export function getCRMTemperaturasVisuales() {
  const items = catalogItems("crm.temperaturas")
  if (items.length === 0) return CRM_TEMPERATURAS_FALLBACK

  return items.reduce<Record<string, VisualConfig>>((acc, item) => {
    const fallback = CRM_TEMPERATURAS_FALLBACK[item.key] || { color: item.color || "#6b7280", label: item.label }
    acc[item.key] = {
      color: item.color || fallback.color,
      label: item.label || fallback.label,
    }
    return acc
  }, {})
}

export function getCRMOrigenes() {
  return mergeLabels(catalogItems("crm.origenes").map(item => item.label), CRM_ORIGENES_FALLBACK)
}

export function getCRMIndustrias() {
  return mergeLabels(catalogItems("crm.industrias").map(item => item.label), CRM_INDUSTRIAS_FALLBACK)
}
