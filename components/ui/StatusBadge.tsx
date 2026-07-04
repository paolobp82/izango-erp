const COLORS: Record<string, any> = {
  pendiente: {
    bg: "#FEF3C7",
    color: "#92400E",
  },

  progreso: {
    bg: "#DBEAFE",
    color: "#1E40AF",
  },

  revision: {
    bg: "#EDE9FE",
    color: "#6D28D9",
  },

  completado: {
    bg: "#DCFCE7",
    color: "#166534",
  },

  enviado: {
    bg: "#FED7AA",
    color: "#C2410C",
  },

  programado: {
    bg: "#CFFAFE",
    color: "#0E7490",
  },

  pagado: {
    bg: "#DCFCE7",
    color: "#166534",
  },

  cancelado: {
    bg: "#FEE2E2",
    color: "#B91C1C",
  },

  rechazado: {
    bg: "#FEE2E2",
    color: "#B91C1C",
  },

  neutro: {
    bg: "#F1F5F9",
    color: "#475569",
  },

  crm_nuevo: {
    bg: "#DBEAFE",
    color: "#1E40AF",
  },

  crm_contactado: {
    bg: "#FEF9C3",
    color: "#92400E",
  },

  crm_reunion: {
    bg: "#FED7AA",
    color: "#9A3412",
  },

  crm_propuesta: {
    bg: "#F5F3FF",
    color: "#6D28D9",
  },

  crm_negociacion: {
    bg: "#FCE7F3",
    color: "#9D174D",
  },

  crm_ganado: {
    bg: "#DCFCE7",
    color: "#15803D",
  },

  crm_perdido: {
    bg: "#FEE2E2",
    color: "#991B1B",
  },

  frio: {
    bg: "#DBEAFE",
    color: "#1E40AF",
  },

  tibio: {
    bg: "#FEF3C7",
    color: "#92400E",
  },

  caliente: {
    bg: "#FEE2E2",
    color: "#B91C1C",
  },
}

const STATE_TYPE: Record<string, string> = {
  pendiente: "pendiente",
  pendiente_aprobacion: "pendiente",
  borrador: "neutro",

  en_progreso: "progreso",
  en_curso: "progreso",
  aprobado_produccion: "progreso",

  en_revision: "revision",
  recotizar: "revision",
  aprobado: "revision",
  aprobada_interna: "revision",

  enviada_cliente: "enviado",
  programado: "programado",

  completada: "completado",
  terminado: "completado",
  aprobada_cliente: "completado",
  pagado: "pagado",
  liquidado: "pagado",

  cancelado: "cancelado",
  cancelada: "cancelado",
  rechazado: "rechazado",
  rechazada: "rechazado",

  nuevo: "crm_nuevo",
  contactado: "crm_contactado",
  reunion: "crm_reunion",
  propuesta: "crm_propuesta",
  negociacion: "crm_negociacion",
  ganado: "crm_ganado",
  perdido: "crm_perdido",
}

export function getStatusType(status?: string) {
  if (!status) return "neutro"
  return STATE_TYPE[status] || status
}

export default function StatusBadge({
  label,
  type,
}: {
  label: string
  type?: string
}) {
  const mappedType = getStatusType(type)
  const c = COLORS[mappedType] || COLORS.neutro

  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {label}
    </span>
  )
}
