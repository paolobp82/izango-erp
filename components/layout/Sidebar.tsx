"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { puedeVerRuta } from "@/lib/permisos/rutas"
import { APP_EDITION, APP_FULL_NAME, APP_VERSION } from "@/lib/version"

const LOGO = "https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png"

const ENTIDAD: Record<string,string> = { peru: "Izango Peru", selva: "Izango Selva" }

const PERFIL: Record<string,string> = {
  superadmin:"Super Administrador",
  gerente_general:"Gerente General",
  administrador:"Administrador",
  controller:"Controller",
  gerente_produccion:"Gerente de Produccion",
  productor:"Productor",
  audiovisual:"Audiovisual",
  logistica:"Logistica",
  comercial:"Comercial",
  practicante:"Practicante",
}

const ALL_NAV = [
  { section: "Inicio", items: [
    { label: "Dashboard", href: "/dashboard", icon: "⌂" },
    { label: "Mi trabajo", href: "/tareas", icon: "☑" },
    { label: "Calendario", href: "/calendario", icon: "▣" },
    { label: "Alertas", href: "/alertas", icon: "⌁" },
  ]},
  { section: "Comercial", items: [
    { label: "CRM", href: "/crm", icon: "◎" },
    { label: "Clientes", href: "/clientes", icon: "◉" },
    { label: "Buscar ítems cotizados", href: "/buscar-items", icon: "⌕" },
    { label: "Biblioteca", href: "/biblioteca", icon: "▱" },
    { label: "Biblioteca de Medios", href: "/biblioteca-medios", icon: "▧" },
  ]},
  { section: "Operación", items: [
    { label: "Proyectos", href: "/proyectos", icon: "▣" },
    { label: "Gestor", href: "/gestor", icon: "◌" },
    { label: "Req. Audiovisuales", href: "/audiovisual/requerimientos", icon: "▻" },
  ]},
  { section: "Compras y Logística", items: [
    { label: "Proveedores", href: "/proveedores", icon: "▥" },
    { label: "Requerimientos de Pago", href: "/rq", icon: "▤" },
    { label: "Inventario", href: "/inventario", icon: "◈" },
    { label: "Mi Trabajo Logística", href: "/logistica/mi-trabajo", icon: "☑" },
    { label: "Órdenes", href: "/inventario/ordenes", icon: "☷" },
    { label: "Envíos de Materiales", href: "/envios-materiales", icon: "✈" },
    { label: "Traslados y Movimientos", href: "/logistica/traslados", icon: "⇄" },
  ]},
  { section: "Finanzas", items: [
    { label: "Facturación", href: "/facturacion", icon: "$" },
    { label: "Liquidaciones", href: "/liquidaciones", icon: "∑" },
    { label: "Caja Chica", href: "/caja-chica", icon: "◫" },
    { label: "Gastos de Oficina", href: "/gastos-oficina", icon: "◍" },
    { label: "Flujo de Caja", href: "/flujo-caja", icon: "↗" },
    { label: "Conciliación", href: "/conciliacion", icon: "⇄" },
    { label: "Centros de Costo", href: "/centro-costos", icon: "◆" },
  ]},
  { section: "Finanzas Corporativas", items: [
    { label: "Dashboard Ejecutivo", href: "/finanzas/dashboard", icon: "◫" },
    { label: "Cuentas por Cobrar", href: "/finanzas/cuentas-por-cobrar", icon: "↙" },
    { label: "Cuentas por Pagar", href: "/finanzas/cuentas-por-pagar", icon: "↗" },
    { label: "Rentabilidad", href: "/finanzas/rentabilidad", icon: "∿" },
    { label: "Rentabilidad por Proyecto", href: "/finanzas/centro-costos", icon: "◆" },
    { label: "Flujo Ejecutivo", href: "/finanzas/flujo-ejecutivo", icon: "▥" },
    { label: "Deudas y Financiamientos", href: "/prestamos", icon: "▰" },
  ]},
  { section: "Personas", items: [
    { label: "Trabajadores", href: "/rrhh/trabajadores", icon: "♙" },
    { label: "Planilla", href: "/rrhh/planilla", icon: "▦" },
    { label: "Solicitudes", href: "/rrhh/permisos#solicitudes", icon: "☰" },
    { label: "Horas Extras", href: "/rrhh/horas-extras", icon: "◷" },
    { label: "Vacaciones", href: "/rrhh/vacaciones", icon: "☀" },
    { label: "Permisos", href: "/rrhh/permisos", icon: "✓" },
    { label: "Faltas Médicas", href: "/rrhh/faltas-medicas", icon: "+" },
  ]},
  { section: "Analítica", items: [
    { label: "Analítica y Reportes", href: "/reporteria", icon: "▥" },
    { label: "Trazabilidad", href: "/trazabilidad", icon: "⌬" },
  ]},
  { section: "Administración", items: [
    { label: "Usuarios", href: "/admin/usuarios", icon: "⚙" },
  ]},
  { section: "Cuenta", items: [
    { label: "Mi Perfil", href: "/perfil", icon: "◉" },
    { label: "Asistente IA", href: "/ia", icon: "✦" },
  ]},
]

type SidebarProfile = {
  nombre?: string | null
  apellido?: string | null
  perfil: string
  entidad?: string | null
}

export default function Sidebar({ perfil }: { perfil: SidebarProfile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("sidebar_collapsed") === "true"
  })
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {}
    const savedSections = localStorage.getItem("sidebar_sections")
    if (savedSections) {
      try { return JSON.parse(savedSections) } catch {}
    }
    return {}
  })

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "76px" : "260px")
    localStorage.setItem("sidebar_collapsed", String(collapsed))
  }, [collapsed])

  useEffect(() => {
    localStorage.setItem("sidebar_sections", JSON.stringify(openSections))
  }, [openSections])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const initials = `${perfil.nombre?.[0] || ""}${perfil.apellido?.[0] || ""}`.toUpperCase()
  const isActiveRoute = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"))

  const navItems = ALL_NAV.map(section => ({
    ...section,
    items: section.items.filter(item => puedeVerRuta(perfil.perfil, item.href))
  })).filter(section => section.items.length > 0)

  function sectionOpen(section: string) {
    if (openSections[section] === undefined) return true
    return openSections[section]
  }

  function toggleSection(section: string) {
    setOpenSections(prev => ({ ...prev, [section]: !sectionOpen(section) }))
  }

  return (
    <aside style={{
      width: collapsed ? 76 : 260,
      background: "linear-gradient(180deg,#080c0b 0%,#0b1110 60%,#070909 100%)",
      borderRight: "1px solid rgba(255,255,255,.08)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 200,
      color: "#fff",
      transition: "width .22s ease",
      boxShadow: "8px 0 30px rgba(0,0,0,.18)"
    }}>
      <div style={{ padding: collapsed ? "16px 10px" : "18px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", minWidth: 0 }}>
            <div style={{ background: "#03E373", borderRadius: 12, padding: "7px 9px", flexShrink: 0 }}>
              <img src={LOGO} alt="Izango" style={{ height: 30, objectFit: "contain", display: "block" }} />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Izango 360 SAC</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 4 }}>{ENTIDAD[perfil.entidad || ""] || ""}</div>
              </div>
            )}
          </a>

          {!collapsed && (
            <button onClick={() => setCollapsed(true)} title="Colapsar"
              style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer", fontSize: 18 }}>
              ‹
            </button>
          )}
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "14px 10px" : "18px 14px" }}>
        {navItems.map(section => {
          const open = sectionOpen(section.section)
          return (
            <div key={section.section} style={{ marginBottom: collapsed ? 16 : 14 }}>
              {!collapsed ? (
                <button onClick={() => toggleSection(section.section)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    color: "#03E373",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    padding: "0 10px",
                    marginBottom: 8
                  }}>
                  <span>{section.section}</span>
                  <span style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>{open ? "⌃" : "⌄"}</span>
                </button>
              ) : (
                <div style={{ height: 1, background: "rgba(255,255,255,.10)", margin: "10px 8px" }} />
              )}

              {(collapsed || open) && section.items.map(item => {
                const active = isActiveRoute(item.href)
                return (
                  <a key={`${section.section}-${item.label}`} href={item.href} title={collapsed ? item.label : ""}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 12,
                      minHeight: 42,
                      padding: collapsed ? 0 : "0 12px",
                      marginBottom: 4,
                      borderRadius: 10,
                      textDecoration: "none",
                      color: active ? "#03E373" : "rgba(255,255,255,.86)",
                      background: active ? "linear-gradient(90deg,rgba(3,227,115,.22),rgba(3,227,115,.06))" : "transparent",
                      fontSize: 13,
                      fontWeight: active ? 800 : 500,
                    }}>
                    {active && <span style={{ position: "absolute", left: collapsed ? -10 : -14, top: 8, bottom: 8, width: 4, borderRadius: 99, background: "#03E373" }} />}
                    <span style={{ width: collapsed ? 42 : 22, height: collapsed ? 42 : 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: collapsed ? 20 : 17 }}>
                      {item.icon}
                    </span>
                    {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                  </a>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div style={{ padding: collapsed ? "12px 10px" : "14px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        {collapsed && (
          <button onClick={() => setCollapsed(false)}
            style={{ width: "100%", height: 40, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.07)", color: "#fff", borderRadius: 12, cursor: "pointer", marginBottom: 14, fontSize: 20, fontWeight: 700 }}>
            ›
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 12, marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#03E373", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#04342C", flexShrink: 0 }}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>{perfil.nombre} {perfil.apellido}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{PERFIL[perfil.perfil]}</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: collapsed ? "center" : "left", marginBottom: 12, opacity: .78 }}>
          {collapsed ? (
            <div style={{ fontSize: 10, fontWeight: 800, color: "#03E373" }}>{APP_VERSION}</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "#03E373", fontWeight: 900 }}>{APP_FULL_NAME}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}>{APP_EDITION}</div>
            </>
          )}
        </div>

        <button onClick={logout} title={collapsed ? "Cerrar sesión" : ""}
          style={{ width: "100%", textAlign: collapsed ? "center" : "left", fontSize: collapsed ? 20 : 12, color: "rgba(255,255,255,.62)", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 8 }}>
          {collapsed ? "↪" : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  )
}











