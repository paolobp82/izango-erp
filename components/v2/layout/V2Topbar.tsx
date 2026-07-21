"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HelpCircle, Moon, RefreshCw, Sun } from "lucide-react"
import BusquedaGlobal from "@/components/BusquedaGlobal"
import Notificaciones from "@/components/Notificaciones"
import { useTheme } from "@/components/design-system"
import styles from "./V2ThemeScope.module.css"

type TopbarProfile = {
  id: string
}

const TABS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "CRM Comercial", href: "/crm" },
  { label: "Operaciones", href: "/proyectos" },
  { label: "Finanzas", href: "/finanzas/dashboard" },
]

export function V2Topbar({ profile }: { profile: TopbarProfile }) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <div className={styles.searchBox}>
          <BusquedaGlobal />
        </div>

        <nav className={styles.tabs} aria-label="Secciones principales">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            return (
              <Link className={`${styles.tabLink} ${active ? styles.tabLinkActive : ""}`} href={tab.href} key={tab.href}>
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className={styles.topbarRight}>
        <button className={styles.iconButton} title="Actualizar vista" type="button">
          <RefreshCw size={16} />
        </button>
        <button className={styles.iconButton} title="Ayuda" type="button">
          <HelpCircle size={16} />
        </button>
        <button className={styles.iconButton} onClick={toggleTheme} title="Cambiar tema visual" type="button">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className={styles.notificationWrap}>
          <Notificaciones usuarioId={profile.id} />
        </div>
      </div>
    </header>
  )
}
