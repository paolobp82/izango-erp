"use client"

import { HelpCircle, Moon, RefreshCw, Sun } from "lucide-react"
import BusquedaGlobal from "@/components/BusquedaGlobal"
import Notificaciones from "@/components/Notificaciones"
import { useTheme } from "@/components/design-system"
import { V2TopbarShortcuts } from "./V2TopbarShortcuts"
import styles from "./V2ThemeScope.module.css"

type TopbarProfile = {
  id: string
  perfil?: string | null
}

export function V2Topbar({ profile }: { profile: TopbarProfile }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <div className={styles.searchBox}>
          <BusquedaGlobal />
        </div>

        <V2TopbarShortcuts perfil={profile.perfil} />
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
