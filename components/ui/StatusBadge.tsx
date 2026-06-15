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

  bloqueado: {
    bg: "#FEE2E2",
    color: "#B91C1C",
  },
}

export default function StatusBadge({
  label,
  type = "pendiente",
}: {
  label: string
  type?: string
}) {
  const c = COLORS[type] || COLORS.pendiente

  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}