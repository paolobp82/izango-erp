"use client"

import type { ReactNode } from "react"
import type { ProjectDetailTabId } from "./ProjectDetailTabsV2"

export type ProjectDetailSectionProps = {
  tab: ProjectDetailTabId | ProjectDetailTabId[]
  activeTab: ProjectDetailTabId
  children: ReactNode
}

// Envuelve una seccion legacy existente sin reescribirla: solo decide si se renderiza
// segun la pestana activa. El contenido interno (JSX/estilos) permanece intacto durante
// el Lote 1 - la migracion visual de cada seccion queda para los lotes siguientes.
export function ProjectDetailSection({ activeTab, children, tab }: ProjectDetailSectionProps) {
  const tabs = Array.isArray(tab) ? tab : [tab]
  if (!tabs.includes(activeTab)) return null
  return <>{children}</>
}
