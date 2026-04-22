"use client"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { Perfil } from "@/types"
interface SidebarProps { perfil: Perfil }
const navItems = [
  { section: "Principal", items: [
    { label: "Dashboard", href: "/dashboard", icon: "▦" },
    { label: "Proyectos", href: "/proyectos", icon: "◫" },
    { label: "Clientes", href: "/clientes", icon: "◉" },
  ]},
  { section: "Comercial", items: [
    { label: "Proformas", href: "/proformas", icon: "◧" },
  ]},
  { section: "Finanzas", items: [
    { label: "Req. de pago", href: "/rq", icon: "◷" },
    { label: "Facturacion", href: "/facturacion", icon: "◨" },
    { label: "Liquidaciones", href: "/liquidaciones", icon: "◈" },
  ]},
]
const ENTIDAD_LABELS: Record<string, string> = { peru: "Izango Peru", selva: "Izango Selva" }
const PERFIL_LABELS: Record<string, string> = {
  gerente_general: "Gerente General", comercial: "Comercial",
  gerente_produccion: "Gerente de Produccion", productor: "Productor",
  administrador: "Administrador", gerente_finanzas: "Gerente de Finanzas",
}
export default function Sidebar({ perfil }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  async function handleLogout() { await supabase.auth.signOut(); router.push("/auth/login") }
  const initials = `${perfil.nombre[0]}${perfil.apellido[0]}`.toUpperCase()
  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0">
      <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-izango-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">iz</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Izango</div>
          <div className="text-xs text-gray-400">{ENTIDAD_LABELS[perfil.entidad]}</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navItems.map(section => (
          <div key={section.section}>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 mb-1">{section.section}</div>
            {section.items.map(item => (
              <a key={item.href} href={item.href} className={`sidebar-item ${pathname.startsWith(item.href) ? "active" : ""}`}>
                <span className="text-base w-5 text-center">{item.icon}</span>{item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-izango-50 flex items-center justify-center text-xs font-semibold text-izango-900 flex-shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{perfil.nombre} {perfil.apellido}</div>
            <div className="text-xs text-gray-400 truncate">{PERFIL_LABELS[perfil.perfil]}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full text-left text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded">Cerrar sesion</button>
      </div>
    </aside>
  )
}