"use client"

import type { ReactNode } from "react"
import { V2DetailPageTemplate } from "@/components/v2/templates"
import { ProjectDetailTabsV2, type ProjectDetailTabId } from "./ProjectDetailTabsV2"
import styles from "./ProjectDetailV2.module.css"

export type ProjectDetailShellV2Props = {
  header: ReactNode
  actionsBar?: ReactNode
  activeTab: ProjectDetailTabId
  onTabChange: (tab: ProjectDetailTabId) => void
  tabCounts?: Partial<Record<ProjectDetailTabId, number>>
  children: ReactNode
}

// Composicion delgada sobre V2DetailPageTemplate (arquetipo "Ficha 360 / Detalle" ya
// congelado en docs/design/UX_UI_BASELINE_V2.md). No crea un shell nuevo ni duplica
// V2AppShell: se monta dentro del contenido de pagina que ya provee AppLayout/V2AppShell.
export function ProjectDetailShellV2({
  actionsBar,
  activeTab,
  children,
  header,
  onTabChange,
  tabCounts,
}: ProjectDetailShellV2Props) {
  return (
    <V2DetailPageTemplate
      contentWidth="full"
      header={header}
      summary={actionsBar}
      tabs={<ProjectDetailTabsV2 activeTab={activeTab} counts={tabCounts} onChange={onTabChange} />}
    >
      <div className={styles.tabContent}>{children}</div>
    </V2DetailPageTemplate>
  )
}
