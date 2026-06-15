const ICONS = {
  money: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h10v10H7V7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 3h10a2 2 0 0 1 2 2v10" stroke="currentColor" strokeWidth="2" />
      <path d="M5 21h10a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="2" />
      <path d="M10.5 11h3" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  shield: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  chart: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 20V10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 20V4" stroke="currentColor" strokeWidth="2" />
      <path d="M19 20v-7" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  wallet: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 7V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  folder: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H3V6Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  file: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" />
      <path d="M9 13h6" stroke="currentColor" strokeWidth="2" />
      <path d="M9 17h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
}

export default function KpiCard({
  label,
  value,
  sub,
  borderColor,
  valueColor,
  icon,
}: {
  label: string
  value: string
  sub?: string
  borderColor?: string
  valueColor?: string
  icon?: string
}) {
  const iconNode = icon && icon in ICONS ? ICONS[icon as keyof typeof ICONS] : null
  const compactValue = value.length > 12

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        padding: "18px 16px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
        minHeight: 118,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {iconNode && (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: `${borderColor || "#0F6E56"}18`,
            color: borderColor || "#0F6E56",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {iconNode}
        </div>
      )}

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#0F172A",
            marginBottom: 7,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: compactValue ? 19 : 22,
            lineHeight: 1.05,
            fontWeight: 900,
            color: valueColor || "#0F172A",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>

        {sub && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#64748B",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: borderColor || "#0F6E56",
                marginRight: 6,
              }}
            />
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}



