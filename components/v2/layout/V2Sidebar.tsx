"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, ChevronsLeft, ChevronsRight, LogOut, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { puedeVerRuta } from "@/lib/permisos/rutas"
import { V2_NAVIGATION, isV2Admin } from "./v2-navigation.config"
import styles from "./V2ThemeScope.module.css"

type V2Profile = {
  id: string
  nombre?: string | null
  apellido?: string | null
  perfil: string
  entidad?: string | null
}

const PROFILE_LABELS: Record<string, string> = {
  superadmin: "Super Administrador",
  gerente_general: "Gerente General",
  administrador: "Administrador",
  controller: "Controller",
  gerente_produccion: "Gerente de Produccion",
  productor: "Productor",
  audiovisual: "Audiovisual",
  logistica: "Logistica",
  comercial: "Comercial",
  practicante: "Practicante",
}

const SIDEBAR_COLLAPSED_KEY = "izango-v2-sidebar-collapsed"
const SIDEBAR_SECTIONS_KEY = "izango-v2-sidebar-sections"
const DEFAULT_OPEN_SECTION = "Inicio"

function initials(profile: V2Profile) {
  return `${profile.nombre?.[0] || ""}${profile.apellido?.[0] || ""}`.toUpperCase() || "IZ"
}

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
}

function loadOpenSections(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(SIDEBAR_SECTIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function V2Sidebar({ profile }: { profile: V2Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(loadOpenSections)

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const visibleSections = V2_NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => (item.adminOnly ? isV2Admin(profile.perfil) : puedeVerRuta(profile.perfil, item.href))),
  })).filter((section) => section.items.length > 0)

  const isItemActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const activeSection = visibleSections.find((section) => section.items.some((item) => isItemActive(item.href)))?.section

  // Persistir el colapso general y reflejarlo en el contenedor raiz .izango-v2:
  // V2ThemeScope.module.css reajusta --v2-sidebar-width desde ahi, asi que la
  // topbar y el contenido se reacomodan sin que este componente los toque.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".izango-v2")
    root?.setAttribute("data-sidebar-collapsed", String(collapsed))
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // no-op si localStorage no esta disponible
    }
  }, [collapsed])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(openSections))
    } catch {
      // no-op si localStorage no esta disponible
    }
  }, [openSections])

  // Regla obligatoria: la seccion de la ruta activa debe quedar visible, tanto en el primer
  // render (lastPathname arranca en null a proposito) como al navegar despues. Se ajusta
  // durante el render (no en un efecto), siguiendo el patron de React para "adjusting state
  // when a prop changes" -- asi el usuario puede volver a cerrarla despues sin que se reabra sola.
  const [lastPathname, setLastPathname] = useState<string | null>(null)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (activeSection && openSections[activeSection] !== true) {
      setOpenSections((prev) => ({ ...prev, [activeSection]: true }))
    }
  }

  function isSectionOpen(section: string) {
    if (openSections[section] !== undefined) return openSections[section]
    return section === DEFAULT_OPEN_SECTION || section === activeSection
  }

  function toggleSection(section: string) {
    setOpenSections((prev) => ({ ...prev, [section]: !isSectionOpen(section) }))
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
      <div className={styles.sidebarInner}>
        <div>
          <div className={styles.brandRow}>
            <Link className={styles.brand} href="/dashboard">
              <div className={styles.brandMark}>
                <img
                  src="https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png"
                  alt="Izango"
                  style={{ height: "20px", objectFit: "contain", display: "block" }}
                />
              </div>
              {!collapsed && (
                <div>
                  <p className={styles.brandTitle}>Izango 360 SAC</p>
                  <p className={styles.brandSubtitle}>Izango Peru Portal</p>
                </div>
              )}
            </Link>

            <button
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
              className={styles.collapseToggle}
              onClick={() => setCollapsed((value) => !value)}
              title={collapsed ? "Expandir menu" : "Colapsar menu"}
              type="button"
            >
              {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          </div>

          {collapsed ? (
            <Link className={styles.primaryActionCollapsed} href="/proyectos/nuevo" title="Nuevo Proyecto">
              <Plus size={18} strokeWidth={3} />
            </Link>
          ) : (
            <Link className={styles.primaryAction} href="/proyectos/nuevo">
              <Plus size={16} strokeWidth={3} />
              Nuevo Proyecto
            </Link>
          )}

          <nav className={styles.nav} aria-label="Navegacion V2">
            {visibleSections.map((section) => {
              const open = isSectionOpen(section.section)
              const sectionId = `v2-nav-section-${section.section.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
              return (
                <div className={styles.navSection} key={section.section}>
                  {collapsed ? (
                    <div className={styles.navDivider} role="separator" />
                  ) : (
                    <button
                      aria-controls={sectionId}
                      aria-expanded={open}
                      className={styles.navSectionTitle}
                      onClick={() => toggleSection(section.section)}
                      type="button"
                    >
                      <span>{section.section}</span>
                      <ChevronDown
                        className={`${styles.navSectionChevron} ${open ? styles.navSectionChevronOpen : ""}`}
                        size={13}
                        strokeWidth={2.6}
                      />
                    </button>
                  )}

                  {(collapsed || open) && (
                    <div id={sectionId}>
                      {section.items.map((item) => {
                        const Icon = item.icon
                        const active = isItemActive(item.href)
                        return (
                          <Link
                            className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                            href={item.href}
                            key={item.href}
                            title={collapsed ? item.label : undefined}
                          >
                            <span className={styles.navIcon}>
                              <Icon size={18} strokeWidth={2.4} />
                            </span>
                            {!collapsed && <span>{item.label}</span>}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        <div className={styles.profileFooter}>
          {collapsed ? (
            <Link
              className={styles.avatarCollapsed}
              href="/perfil"
              title={`${profile.nombre || ""} ${profile.apellido || ""}`.trim() || "Mi perfil"}
            >
              {initials(profile)}
            </Link>
          ) : (
            <div className={styles.profilePill}>
              <div className={styles.avatar}>{initials(profile)}</div>
              <div style={{ minWidth: 0 }}>
                <div className={styles.profileName}>{profile.nombre} {profile.apellido}</div>
                <div className={styles.profileRole}>{PROFILE_LABELS[profile.perfil] || profile.perfil}</div>
              </div>
            </div>
          )}
          <button
            className={styles.logoutButton}
            onClick={logout}
            title={collapsed ? "Cerrar sesion" : undefined}
            type="button"
          >
            <LogOut size={16} />
            {!collapsed && "Cerrar sesion"}
          </button>
        </div>
      </div>
    </aside>
  )
}
