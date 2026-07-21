"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import styles from "./V2ThemeScope.module.css"

const PAGE_LABELS: Record<string, { section: string; title: string; tag: string }> = {
  "/admin/ui-v2-shell": {
    section: "Administracion",
    title: "UI V2 Shell",
    tag: "Demo aislado",
  },
  "/admin/design-system-v2": {
    section: "Sistema",
    title: "Design System V2",
    tag: "Laboratorio aislado",
  },
  "/admin/dashboard-v2": {
    section: "Analitica",
    title: "Dashboard V2",
    tag: "Ruta aislada",
  },
  "/crm": {
    section: "Comercial",
    title: "CRM",
    tag: "V2 RC-1",
  },
  "/perfil": {
    section: "Usuario",
    title: "Perfil",
    tag: "V2 RC-1",
  },
}

export function V2Content({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const page = PAGE_LABELS[pathname] || PAGE_LABELS["/admin/ui-v2-shell"]

  return (
    <main className={styles.main}>
      <div className={styles.contentScroll}>
        <div className={styles.breadcrumbBar}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <span>SIG</span>
            <ChevronRight size={14} />
            <span>{page.section}</span>
            <ChevronRight size={14} />
            <strong>{page.title}</strong>
          </nav>
          <span className={styles.demoTag}>{page.tag}</span>
        </div>
        <div className={styles.contentShell}>{children}</div>
      </div>
    </main>
  )
}
