# Script de setup Izango ERP - Sesion 2

$files = @{}

$files["next.config.js"] = @'
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
'@

$files["tailwind.config.js"] = @'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        izango: {
          50: '#E1F5EE',
          100: '#9FE1CB',
          500: '#1D9E75',
          600: '#0F6E56',
          900: '#04342C',
        },
      },
    },
  },
  plugins: [],
}
'@

$files["postcss.config.js"] = @'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
'@

$files["lib\supabase.ts"] = @'
import { createBrowserClient } from "@supabase/ssr"
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
'@

$files["types\index.ts"] = @'
export type Entidad = "peru" | "selva"
export type PerfilType = "gerente_general" | "comercial" | "gerente_produccion" | "productor" | "administrador" | "gerente_finanzas"
export type EstadoProyecto = "pendiente_aprobacion" | "aprobado" | "en_curso" | "terminado" | "facturado" | "liquidado"
export type EstadoCotizacion = "borrador" | "en_revision" | "aprobada_interna" | "enviada_cliente" | "aprobada_cliente" | "rechazada" | "recotizar"
export type EstadoRQ = "borrador" | "pendiente_aprobacion" | "aprobado" | "pagado" | "rechazado"

export interface Perfil {
  id: string; nombre: string; apellido: string; email: string
  perfil: PerfilType; entidad: Entidad; activo: boolean; created_at: string
}
export interface Cliente {
  id: string; entidad: Entidad; razon_social: string; ruc?: string
  nombre_contacto?: string; telefono_contacto?: string; email_contacto?: string
  nombre_facturacion?: string; email_facturacion?: string; direccion?: string
  activo: boolean; created_at: string
}
export interface Proyecto {
  id: string; entidad: Entidad; codigo: string; nombre: string
  cliente_id: string; productor_id?: string; comercial_id?: string
  estado: EstadoProyecto; descripcion_requerimiento?: string
  presupuesto_referencial?: number; fecha_limite_cotizacion?: string
  fecha_aprobacion_cliente?: string; fecha_inicio?: string
  fecha_fin_estimada?: string; fecha_fin_real?: string
  created_at: string; updated_at: string
  cliente?: Cliente; productor?: Perfil; comercial?: Perfil
}
export interface Cotizacion {
  id: string; proyecto_id: string; version: number; estado: EstadoCotizacion
  validez_dias: number; condicion_pago: string; fee_agencia_pct: number
  igv_pct: number; subtotal_costo: number; subtotal_precio_cliente: number
  fee_agencia_monto: number; subtotal_con_fee: number; igv_monto: number
  total_cliente: number; margen_pct: number; motivo_version?: string
  created_at: string; updated_at: string; items?: any[]; proyecto?: Proyecto
}
export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  pendiente_aprobacion: "Pendiente aprobacion",
  aprobado: "Aprobado", en_curso: "En curso", terminado: "Terminado",
  facturado: "Facturado", liquidado: "Liquidado",
}
export const PERFIL_LABELS: Record<PerfilType, string> = {
  gerente_general: "Gerente General", comercial: "Comercial",
  gerente_produccion: "Gerente de Produccion", productor: "Productor",
  administrador: "Administrador", gerente_finanzas: "Gerente de Finanzas",
}
'@

$files["app\globals.css"] = @'
@tailwind base;
@tailwind components;
@tailwind utilities;
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.sidebar-item { @apply flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 rounded-lg cursor-pointer transition-all hover:bg-gray-100 hover:text-gray-900; }
.sidebar-item.active { @apply bg-izango-50 text-izango-900 font-medium; border-left: 2px solid #1D9E75; }
.btn-primary { @apply bg-izango-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-izango-600 transition-colors; }
.btn-secondary { @apply bg-white text-gray-700 px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition-colors; }
.card { @apply bg-white rounded-xl border border-gray-100 p-5; }
.badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
.badge-green { @apply bg-green-50 text-green-700; }
.badge-yellow { @apply bg-yellow-50 text-yellow-700; }
.badge-blue { @apply bg-blue-50 text-blue-700; }
.badge-gray { @apply bg-gray-100 text-gray-600; }
.badge-red { @apply bg-red-50 text-red-700; }
.badge-purple { @apply bg-purple-50 text-purple-700; }
.input { @apply w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-izango-500 bg-white; }
.label { @apply block text-xs text-gray-500 mb-1 font-medium; }
table { @apply w-full border-collapse; }
thead tr { @apply bg-gray-50; }
th { @apply text-left text-xs font-medium text-gray-500 px-4 py-3 border-b border-gray-100; }
td { @apply px-4 py-3 text-sm border-b border-gray-50 text-gray-700; }
tbody tr { @apply hover:bg-gray-50 transition-colors; }
'@

$files["app\layout.tsx"] = @'
import type { Metadata } from "next"
import "./globals.css"
export const metadata: Metadata = { title: "Izango ERP", description: "Sistema de gestion Izango 360" }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body className="bg-gray-50 text-gray-900">{children}</body></html>
}
'@

$files["app\page.tsx"] = @'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase"
export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) { redirect("/dashboard") } else { redirect("/auth/login") }
}
'@

$files["app\auth\login\page.tsx"] = @'
"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Email o contrasena incorrectos"); setLoading(false) }
    else { router.push("/dashboard"); router.refresh() }
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-izango-500 rounded-2xl mb-4">
            <span className="text-white font-bold text-xl">iz</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Izango ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de gestion Izango 360</p>
        </div>
        <div className="card">
          <h2 className="text-base font-medium text-gray-900 mb-5">Iniciar sesion</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="tu@izango.com.pe" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Contrasena</label>
              <input type="password" className="input" placeholder="........" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex disabled:opacity-60">
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Izango 360 S.A.C. Sistema interno</p>
      </div>
    </div>
  )
}
'@

$files["components\layout\Sidebar.tsx"] = @'
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
'@

$files["app\dashboard\layout.tsx"] = @'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase"
import Sidebar from "@/components/layout/Sidebar"
import type { Perfil } from "@/types"
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { redirect("/auth/login") }
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single()
  if (!perfil) { redirect("/auth/login") }
  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={perfil as Perfil} />
      <main className="ml-56 flex-1 p-6 min-h-screen">{children}</main>
    </div>
  )
}
'@

$files["app\dashboard\page.tsx"] = @'
import { createClient } from "@/lib/supabase"
import { ESTADO_PROYECTO_LABELS } from "@/types"
const ESTADO_BADGE: Record<string, string> = {
  pendiente_aprobacion: "badge-yellow", aprobado: "badge-blue",
  en_curso: "badge-green", terminado: "badge-gray",
  facturado: "badge-purple", liquidado: "badge-gray",
}
export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session!.user.id).single()
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)")
    .eq("entidad", perfil?.entidad || "peru")
    .order("created_at", { ascending: false })
    .limit(10)
  const activos = proyectos?.filter((p: any) => ["aprobado","en_curso"].includes(p.estado)) || []
  const terminados = proyectos?.filter((p: any) => p.estado === "terminado") || []
  const pendientes = proyectos?.filter((p: any) => p.estado === "pendiente_aprobacion") || []
  const { count: rqPendientes } = await supabase.from("requerimientos_pago").select("id", { count: "exact", head: true }).in("estado", ["pendiente_aprobacion","aprobado"])
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)
  const { count: cotizacionesMes } = await supabase.from("cotizaciones").select("id", { count: "exact", head: true }).gte("created_at", inicioMes.toISOString())
  const metrics = [
    { label: "Proyectos activos", value: activos.length.toString(), sub: `${pendientes.length} pendientes de aprobacion`, color: "text-izango-600" },
    { label: "Terminados sin liquidar", value: terminados.length.toString(), sub: "Requieren liquidacion", color: terminados.length > 0 ? "text-yellow-600" : "text-gray-700" },
    { label: "RQs pendientes", value: (rqPendientes || 0).toString(), sub: "Por aprobar o pagar", color: (rqPendientes || 0) > 0 ? "text-orange-600" : "text-gray-700" },
    { label: "Cotizaciones del mes", value: (cotizacionesMes || 0).toString(), sub: "Versiones generadas", color: "text-gray-700" },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bienvenido, {perfil?.nombre}</p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary">+ Nuevo proyecto</a>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="card">
            <div className="text-xs text-gray-500 mb-1">{m.label}</div>
            <div className={`text-3xl font-semibold ${m.color}`}>{m.value}</div>
            <div className="text-xs text-gray-400 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Proyectos recientes</h2>
          <a href="/proyectos" className="text-xs text-izango-600 hover:underline">Ver todos</a>
        </div>
        <table>
          <thead><tr><th>Codigo</th><th>Proyecto</th><th>Cliente</th><th>Productor</th><th>Estado</th><th>Fecha inicio</th></tr></thead>
          <tbody>
            {proyectos && proyectos.length > 0 ? proyectos.map((p: any) => (
              <tr key={p.id}>
                <td className="text-gray-400 font-mono text-xs">{p.codigo}</td>
                <td><a href={`/proyectos/${p.id}`} className="font-medium text-gray-900 hover:text-izango-600">{p.nombre}</a></td>
                <td>{p.cliente?.razon_social || "—"}</td>
                <td>{p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—"}</td>
                <td><span className={`badge ${ESTADO_BADGE[p.estado] || "badge-gray"}`}>{ESTADO_PROYECTO_LABELS[p.estado as keyof typeof ESTADO_PROYECTO_LABELS]}</span></td>
                <td className="text-gray-400 text-xs">{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="text-center text-gray-400 py-10">No hay proyectos aun. <a href="/proyectos/nuevo" className="text-izango-600 hover:underline">Crea el primero</a></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
'@

$files["app\proyectos\layout.tsx"] = @'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase"
import Sidebar from "@/components/layout/Sidebar"
import type { Perfil } from "@/types"
export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single()
  if (!perfil) redirect("/auth/login")
  return <div className="flex min-h-screen"><Sidebar perfil={perfil as Perfil} /><main className="ml-56 flex-1 p-6">{children}</main></div>
}
'@

$files["app\proyectos\page.tsx"] = @'
import { createClient } from "@/lib/supabase"
import { ESTADO_PROYECTO_LABELS } from "@/types"
const ESTADO_BADGE: Record<string, string> = {
  pendiente_aprobacion: "badge-yellow", aprobado: "badge-blue",
  en_curso: "badge-green", terminado: "badge-gray", facturado: "badge-purple", liquidado: "badge-gray",
}
export default async function ProyectosPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session!.user.id).single()
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido), cotizaciones(total_cliente,margen_pct,estado)")
    .eq("entidad", perfil?.entidad || "peru")
    .order("created_at", { ascending: false })
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{proyectos?.length || 0} proyectos en total</p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary">+ Nuevo proyecto</a>
      </div>
      <div className="card p-0 overflow-hidden">
        <table>
          <thead><tr><th>Codigo</th><th>Proyecto</th><th>Cliente</th><th>Productor</th><th>Estado</th><th className="text-right">Presupuesto</th><th className="text-right">Margen</th><th>Inicio</th></tr></thead>
          <tbody>
            {proyectos && proyectos.length > 0 ? proyectos.map((p: any) => {
              const cot = p.cotizaciones?.find((c: any) => c.estado === "aprobada_cliente") || p.cotizaciones?.[0]
              const margen = cot?.margen_pct || 0
              return (
                <tr key={p.id}>
                  <td className="text-gray-400 font-mono text-xs">{p.codigo}</td>
                  <td><a href={`/proyectos/${p.id}`} className="font-medium text-gray-900 hover:text-izango-600">{p.nombre}</a></td>
                  <td>{p.cliente?.razon_social || "—"}</td>
                  <td>{p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[p.estado] || "badge-gray"}`}>{ESTADO_PROYECTO_LABELS[p.estado as keyof typeof ESTADO_PROYECTO_LABELS]}</span></td>
                  <td className="text-right font-medium">{cot?.total_cliente ? "S/ " + Number(cot.total_cliente).toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "—"}</td>
                  <td className="text-right">{margen > 0 ? <span className={`font-medium ${margen >= 35 ? "text-green-600" : margen >= 20 ? "text-yellow-600" : "text-red-600"}`}>{Number(margen).toFixed(1)}%</span> : "—"}</td>
                  <td className="text-gray-400 text-xs">{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}</td>
                </tr>
              )
            }) : <tr><td colSpan={8} className="text-center text-gray-400 py-10">No hay proyectos. <a href="/proyectos/nuevo" className="text-izango-600 hover:underline">Crea el primero</a></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
'@

$files["app\proyectos\nuevo\page.tsx"] = @'
"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
export default function NuevoProyectoPage() {
  const router = useRouter(); const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [productores, setProductores] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [form, setForm] = useState({ codigo:"", nombre:"", cliente_id:"", productor_id:"", descripcion_requerimiento:"", presupuesto_referencial:"", fecha_limite_cotizacion:"", fecha_inicio:"", fecha_fin_estimada:"" })
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single()
      setPerfil(p)
      const { data: cls } = await supabase.from("clientes").select("*").eq("entidad", p?.entidad || "peru").eq("activo", true).order("razon_social")
      setClientes(cls || [])
      const { data: prods } = await supabase.from("perfiles").select("*").in("perfil", ["productor","gerente_produccion"]).eq("entidad", p?.entidad || "peru").eq("activo", true)
      setProductores(prods || [])
      const { count } = await supabase.from("proyectos").select("id", { count: "exact", head: true })
      setForm(f => ({ ...f, codigo: `IZ-${26000 + (count || 0) + 1}` }))
    }
    load()
  }, [])
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.from("proyectos").insert({
      entidad: perfil?.entidad || "peru", codigo: form.codigo, nombre: form.nombre,
      cliente_id: form.cliente_id || null, productor_id: form.productor_id || null,
      comercial_id: session?.user.id, descripcion_requerimiento: form.descripcion_requerimiento,
      presupuesto_referencial: form.presupuesto_referencial ? parseFloat(form.presupuesto_referencial) : null,
      fecha_limite_cotizacion: form.fecha_limite_cotizacion || null,
      fecha_inicio: form.fecha_inicio || null, fecha_fin_estimada: form.fecha_fin_estimada || null,
      estado: "pendiente_aprobacion", created_by: session?.user.id,
    }).select().single()
    if (error) { alert("Error: " + error.message); setLoading(false); return }
    router.push(`/proyectos/${data.id}`)
  }
  const f = (k: string, v: string) => setForm({ ...form, [k]: v })
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/proyectos" className="text-gray-400 hover:text-gray-600 text-sm">Proyectos</a>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600">Nuevo proyecto</span>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Nuevo proyecto</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Datos del proyecto</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Codigo *</label><input className="input" value={form.codigo} onChange={e => f("codigo", e.target.value)} required /></div>
            <div><label className="label">Entidad</label><input className="input bg-gray-50" value={perfil?.entidad === "peru" ? "Izango Peru" : "Izango Selva"} disabled /></div>
          </div>
          <div><label className="label">Nombre del proyecto *</label><input className="input" placeholder="Ej: Activacion Honda Mayo Lima" value={form.nombre} onChange={e => f("nombre", e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Cliente</label>
              <select className="input" value={form.cliente_id} onChange={e => f("cliente_id", e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div><label className="label">Productor</label>
              <select className="input" value={form.productor_id} onChange={e => f("productor_id", e.target.value)}>
                <option value="">Seleccionar...</option>
                {productores.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Descripcion del requerimiento</label><textarea className="input" rows={3} value={form.descripcion_requerimiento} onChange={e => f("descripcion_requerimiento", e.target.value)} /></div>
          <div><label className="label">Presupuesto referencial (S/)</label><input type="number" className="input" placeholder="0.00" value={form.presupuesto_referencial} onChange={e => f("presupuesto_referencial", e.target.value)} /></div>
        </div>
        <div className="card space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Fechas</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Limite cotizacion</label><input type="date" className="input" value={form.fecha_limite_cotizacion} onChange={e => f("fecha_limite_cotizacion", e.target.value)} /></div>
            <div><label className="label">Fecha inicio</label><input type="date" className="input" value={form.fecha_inicio} onChange={e => f("fecha_inicio", e.target.value)} /></div>
            <div><label className="label">Fecha fin estimada</label><input type="date" className="input" value={form.fecha_fin_estimada} onChange={e => f("fecha_fin_estimada", e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <a href="/proyectos" className="btn-secondary">Cancelar</a>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">{loading ? "Creando..." : "Crear proyecto"}</button>
        </div>
      </form>
    </div>
  )
}
'@

$files["app\clientes\layout.tsx"] = @'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase"
import Sidebar from "@/components/layout/Sidebar"
import type { Perfil } from "@/types"
export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single()
  if (!perfil) redirect("/auth/login")
  return <div className="flex min-h-screen"><Sidebar perfil={perfil as Perfil} /><main className="ml-56 flex-1 p-6">{children}</main></div>
}
'@

$files["app\clientes\page.tsx"] = @'
import { createClient } from "@/lib/supabase"
export default async function ClientesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session!.user.id).single()
  const { data: clientes } = await supabase.from("clientes").select("*").eq("entidad", perfil?.entidad || "peru").order("razon_social")
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-semibold text-gray-900">Clientes</h1><p className="text-sm text-gray-500 mt-0.5">{clientes?.length || 0} clientes registrados</p></div>
        <a href="/clientes/nuevo" className="btn-primary">+ Nuevo cliente</a>
      </div>
      <div className="card p-0 overflow-hidden">
        <table>
          <thead><tr><th>Razon social</th><th>RUC</th><th>Contacto</th><th>Email</th><th>Estado</th></tr></thead>
          <tbody>
            {clientes && clientes.length > 0 ? clientes.map((c: any) => (
              <tr key={c.id}>
                <td><a href={`/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-izango-600">{c.razon_social}</a></td>
                <td className="text-gray-400 font-mono text-xs">{c.ruc || "—"}</td>
                <td>{c.nombre_contacto || "—"}</td>
                <td className="text-gray-400 text-xs">{c.email_contacto || "—"}</td>
                <td><span className={`badge ${c.activo ? "badge-green" : "badge-gray"}`}>{c.activo ? "Activo" : "Inactivo"}</span></td>
              </tr>
            )) : <tr><td colSpan={5} className="text-center text-gray-400 py-10">No hay clientes. <a href="/clientes/nuevo" className="text-izango-600 hover:underline">Agrega el primero</a></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
'@

$files["app\clientes\nuevo\page.tsx"] = @'
"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
export default function NuevoClientePage() {
  const router = useRouter(); const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [entidad, setEntidad] = useState("peru")
  const [form, setForm] = useState({ razon_social:"", ruc:"", nombre_contacto:"", telefono_contacto:"", email_contacto:"", nombre_facturacion:"", telefono_facturacion:"", email_facturacion:"", direccion:"" })
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: p } = await supabase.from("perfiles").select("entidad").eq("id", session!.user.id).single()
      setEntidad(p?.entidad || "peru")
    }
    load()
  }, [])
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from("clientes").insert({ ...form, entidad, created_by: session?.user.id })
    if (error) { alert("Error: " + error.message); setLoading(false); return }
    router.push("/clientes")
  }
  const f = (k: string, v: string) => setForm({ ...form, [k]: v })
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/clientes" className="text-gray-400 hover:text-gray-600 text-sm">Clientes</a>
        <span className="text-gray-300">/</span>
        <span className="text-sm">Nuevo cliente</span>
      </div>
      <h1 className="text-xl font-semibold mb-6">Nuevo cliente</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-sm font-medium">Datos principales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Razon social *</label><input className="input" value={form.razon_social} onChange={e => f("razon_social", e.target.value)} required /></div>
            <div><label className="label">RUC</label><input className="input" maxLength={11} value={form.ruc} onChange={e => f("ruc", e.target.value)} /></div>
            <div><label className="label">Direccion</label><input className="input" value={form.direccion} onChange={e => f("direccion", e.target.value)} /></div>
          </div>
        </div>
        <div className="card space-y-4">
          <h2 className="text-sm font-medium">Contacto comercial</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre</label><input className="input" value={form.nombre_contacto} onChange={e => f("nombre_contacto", e.target.value)} /></div>
            <div><label className="label">Telefono</label><input className="input" value={form.telefono_contacto} onChange={e => f("telefono_contacto", e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Email</label><input type="email" className="input" value={form.email_contacto} onChange={e => f("email_contacto", e.target.value)} /></div>
          </div>
        </div>
        <div className="card space-y-4">
          <h2 className="text-sm font-medium">Contacto de facturacion</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre</label><input className="input" value={form.nombre_facturacion} onChange={e => f("nombre_facturacion", e.target.value)} /></div>
            <div><label className="label">Telefono</label><input className="input" value={form.telefono_facturacion} onChange={e => f("telefono_facturacion", e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Email</label><input type="email" className="input" value={form.email_facturacion} onChange={e => f("email_facturacion", e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <a href="/clientes" className="btn-secondary">Cancelar</a>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">{loading ? "Guardando..." : "Crear cliente"}</button>
        </div>
      </form>
    </div>
  )
}
'@

# Escribir todos los archivos
foreach ($path in $files.Keys) {
    $fullPath = Join-Path (Get-Location) $path
    $dir = Split-Path $fullPath -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($fullPath, $files[$path], [System.Text.Encoding]::UTF8)
    Write-Host "OK: $path"
}
Write-Host "LISTO - Todos los archivos creados"
