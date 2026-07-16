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
        borderBottom: "1px solid var(--iz-color-border)",
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
              color: active ? "var(--iz-color-brand-700)" : "var(--iz-color-text-muted)",
              fontSize: 13,
              fontWeight: active ? 800 : 700,
              borderBottom: `2px solid ${active ? "var(--iz-color-brand-400)" : "transparent"}`,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span style={{ marginLeft: 6, color: active ? "var(--iz-color-brand-700)" : "var(--iz-color-text-muted)" }}>({tab.count})</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
