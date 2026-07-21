"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  Plus,
  ReceiptText,
  Settings,
  Shield,
  Sparkles,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { puedeVerRuta } from "@/lib/permisos/rutas"
import styles from "./V2ThemeScope.module.css"

type V2Profile = {
  id: string
  nombre?: string | null
  apellido?: string | null
  perfil: string
  entidad?: string | null
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  adminOnly?: boolean
}

type NavSection = {
  section: string
  items: NavItem[]
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

const NAV: NavSection[] = [
  {
    section: "Inicio",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Mi Trabajo", href: "/tareas", icon: CheckSquare },
      { label: "Calendario", href: "/calendario", icon: CalendarDays },
      { label: "Alertas", href: "/alertas", icon: AlertTriangle },
    ],
  },
  {
    section: "Comercial",
    items: [
      { label: "CRM", href: "/crm", icon: BriefcaseBusiness },
      { label: "Clientes", href: "/clientes", icon: UsersRound },
      { label: "Biblioteca", href: "/biblioteca", icon: FolderKanban },
      { label: "Biblioteca Medios", href: "/biblioteca-medios", icon: FileText },
    ],
  },
  {
    section: "Operacion",
    items: [
      { label: "Proyectos", href: "/proyectos", icon: FolderKanban },
      { label: "Gestor", href: "/gestor", icon: BarChart3 },
      { label: "Req. Audiovisuales", href: "/audiovisual/requerimientos", icon: Sparkles },
    ],
  },
  {
    section: "Finanzas",
    items: [
      { label: "Facturacion", href: "/facturacion", icon: ReceiptText },
      { label: "Liquidaciones", href: "/liquidaciones", icon: CircleDollarSign },
      { label: "RQ", href: "/rq", icon: FileText },
      { label: "Inventario", href: "/inventario", icon: Package },
      { label: "Logistica", href: "/logistica/traslados", icon: Truck },
    ],
  },
  {
    section: "Cuenta",
    items: [
      { label: "Mi Perfil", href: "/perfil", icon: UserRound },
      { label: "Asistente IA", href: "/ia", icon: Bot },
      { label: "Usuarios", href: "/admin/usuarios", icon: Shield },
      { label: "UI V2 Shell", href: "/admin/ui-v2-shell", icon: Settings, adminOnly: true },
      { label: "Design System V2", href: "/admin/design-system-v2", icon: Palette, adminOnly: true },
      { label: "Dashboard V2", href: "/admin/dashboard-v2", icon: LayoutDashboard, adminOnly: true },
    ],
  },
]

function initials(profile: V2Profile) {
  return `${profile.nombre?.[0] || ""}${profile.apellido?.[0] || ""}`.toUpperCase() || "IZ"
}

function isAdmin(profile: V2Profile) {
  return ["superadmin", "gerente_general", "controller"].includes(profile.perfil)
}

export function V2Sidebar({ profile }: { profile: V2Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const visibleSections = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.adminOnly) return isAdmin(profile)
      return puedeVerRuta(profile.perfil, item.href)
    }),
  })).filter((section) => section.items.length > 0)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarInner}>
        <div>
          <Link className={styles.brand} href="/dashboard">
            <div className={styles.brandMark}>
              <Sparkles size={18} strokeWidth={3} />
            </div>
            <div>
              <p className={styles.brandTitle}>Izango 360 SAC</p>
              <p className={styles.brandSubtitle}>Izango Peru Portal</p>
            </div>
          </Link>

          <Link className={styles.primaryAction} href="/proyectos/nuevo">
            <Plus size={16} strokeWidth={3} />
            Nuevo Proyecto
          </Link>

          <nav className={styles.nav} aria-label="Navegacion V2">
            {visibleSections.map((section) => (
              <div className={styles.navSection} key={section.section}>
                <div className={styles.navSectionTitle}>{section.section}</div>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                      href={item.href}
                      key={item.href}
                    >
                      <span className={styles.navIcon}>
                        <Icon size={18} strokeWidth={2.4} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.profileFooter}>
          <div className={styles.profilePill}>
            <div className={styles.avatar}>{initials(profile)}</div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.profileName}>{profile.nombre} {profile.apellido}</div>
              <div className={styles.profileRole}>{PROFILE_LABELS[profile.perfil] || profile.perfil}</div>
            </div>
          </div>
          <button className={styles.logoutButton} onClick={logout} type="button">
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </div>
    </aside>
  )
}
