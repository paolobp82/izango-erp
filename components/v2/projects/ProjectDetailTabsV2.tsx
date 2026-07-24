"use client"

import { V2Tabs } from "@/components/v2/system"
import type { V2TabItem } from "@/components/v2/system/V2Tabs"

export type ProjectDetailTabId = "resumen" | "cotizaciones" | "costos-rq" | "cliente" | "seguimiento"

export const PROJECT_DETAIL_TABS: { id: ProjectDetailTabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "costos-rq", label: "Costos / RQ" },
  { id: "cliente", label: "Cliente" },
  { id: "seguimiento", label: "Seguimiento" },
]

export const DEFAULT_PROJECT_DETAIL_TAB: ProjectDetailTabId = "resumen"

export function isProjectDetailTabId(value: string | null | undefined): value is ProjectDetailTabId {
  return PROJECT_DETAIL_TABS.some((tab) => tab.id === value)
}

export type ProjectDetailTabsV2Props = {
  activeTab: ProjectDetailTabId
  onChange: (tab: ProjectDetailTabId) => void
  counts?: Partial<Record<ProjectDetailTabId, number>>
}

export function ProjectDetailTabsV2({ activeTab, counts, onChange }: ProjectDetailTabsV2Props) {
  const items: V2TabItem[] = PROJECT_DETAIL_TABS.map((tab) => {
    const count = counts?.[tab.id]
    return {
      id: tab.id,
      label: typeof count === "number" ? `${tab.label} (${count})` : tab.label,
    }
  })

  return (
    <V2Tabs
      ariaLabel="Navegacion de detalle de proyecto"
      items={items}
      onValueChange={(value) => {
        if (isProjectDetailTabId(value)) onChange(value)
      }}
      value={activeTab}
      variant="underline"
    />
  )
}
