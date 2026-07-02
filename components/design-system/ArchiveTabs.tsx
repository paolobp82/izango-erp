"use client"

type ArchiveTab = {
  value: string
  label: string
  count?: number
}

type ArchiveTabsProps = {
  tabs: ArchiveTab[]
  value: string
  onChange?: (value: string) => void
}

export default function ArchiveTabs({ tabs, value, onChange }: ArchiveTabsProps) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderBottom: "1px solid #E2E8F0",
        overflowX: "auto",
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange?.(tab.value)}
            style={{
              border: 0,
              background: "transparent",
              padding: "13px 15px",
              color: active ? "#0F6E56" : "#475569",
              fontSize: 13,
              fontWeight: active ? 800 : 700,
              borderBottom: `2px solid ${active ? "#03E373" : "transparent"}`,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span style={{ marginLeft: 6, color: active ? "#0F6E56" : "#94A3B8" }}>({tab.count})</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
