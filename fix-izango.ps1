# Fix completo Izango ERP - arquitectura correcta Next.js 15 + Supabase

$files = @{}

# ---- SUPABASE CLIENT (browser) ----
$files["lib\supabase.ts"] = @'
import { createBrowserClient } from "@supabase/ssr"
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
'@

# ---- SUPABASE SERVER CLIENT ----
$files["lib\supabase-server.ts"] = @'
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
'@

# ---- MIDDLEWARE ----
$files["middleware.ts"] = @'
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isPublic = isAuthPage || request.nextUrl.pathname === "/"
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return supabaseResponse
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
'@

# ---- ROOT PAGE ----
$files["app\page.tsx"] = @'
import { redirect } from "next/navigation"
export default function Home() {
  redirect("/dashboard")
}
'@

# ---- ROOT LAYOUT ----
$files["app\layout.tsx"] = @'
import type { Metadata } from "next"
import "./globals.css"
export const metadata: Metadata = { title: "Izango ERP", description: "Sistema de gestion Izango 360" }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}
'@

# ---- LOGIN PAGE ----
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
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Email o contrasena incorrectos")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }
  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:384}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:56,height:56,background:"#1D9E75",borderRadius:16,marginBottom:16}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:20}}>iz</span>
          </div>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>Izango ERP</h1>
          <p style={{fontSize:13,color:"#6b7280",marginTop:4}}>Sistema de gestion Izango 360</p>
        </div>
        <div className="card">
          <h2 style={{fontSize:15,fontWeight:500,marginBottom:20,marginTop:0}}>Iniciar sesion</h2>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:14}}>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="tu@izango.com.pe" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{marginBottom:14}}>
              <label className="label">Contrasena</label>
              <input type="password" className="input" placeholder="........" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div style={{background:"#fef2f2",color:"#dc2626",fontSize:13,padding:"8px 12px",borderRadius:8,marginBottom:14}}>{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary" style={{width:"100%",justifyContent:"center",opacity:loading?0.6:1}}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
        <p style={{textAlign:"center",fontSize:12,color:"#9ca3af",marginTop:24}}>Izango 360 S.A.C. Sistema interno</p>
      </div>
    </div>
  )
}
'@

# ---- SIDEBAR ----
$files["components\layout\Sidebar.tsx"] = @'
"use client"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
const navItems = [
  { section: "Principal", items: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Proyectos", href: "/proyectos" },
    { label: "Clientes", href: "/clientes" },
  ]},
  { section: "Comercial", items: [
    { label: "Proformas", href: "/proformas" },
  ]},
  { section: "Finanzas", items: [
    { label: "Req. de pago", href: "/rq" },
    { label: "Facturacion", href: "/facturacion" },
    { label: "Liquidaciones", href: "/liquidaciones" },
  ]},
]
const ENTIDAD: Record<string,string> = { peru: "Izango Peru", selva: "Izango Selva" }
const PERFIL: Record<string,string> = {
  gerente_general:"Gerente General", comercial:"Comercial",
  gerente_produccion:"Gerente de Produccion", productor:"Productor",
  administrador:"Administrador", gerente_finanzas:"Gerente de Finanzas",
}
export default function Sidebar({ perfil }: { perfil: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  async function logout() { await supabase.auth.signOut(); router.push("/auth/login") }
  const initials = `${perfil.nombre[0]}${perfil.apellido[0]}`.toUpperCase()
  return (
    <aside style={{width:224,background:"#fff",borderRight:"1px solid #f3f4f6",display:"flex",flexDirection:"column",height:"100vh",position:"fixed",left:0,top:0}}>
      <div style={{padding:"16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,background:"#1D9E75",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:12}}>iz</span>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600}}>Izango</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>{ENTIDAD[perfil.entidad]}</div>
        </div>
      </div>
      <nav style={{flex:1,overflowY:"auto",padding:"16px 12px"}}>
        {navItems.map(s => (
          <div key={s.section} style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:500,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",padding:"0 8px",marginBottom:4}}>{s.section}</div>
            {s.items.map(item => (
              <a key={item.href} href={item.href}
                className={`sidebar-item${pathname.startsWith(item.href) ? " active" : ""}`}>
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div style={{padding:"12px",borderTop:"1px solid #f3f4f6"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 8px",marginBottom:8}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#E1F5EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#04342C",flexShrink:0}}>{initials}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{perfil.nombre} {perfil.apellido}</div>
            <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{PERFIL[perfil.perfil]}</div>
          </div>
        </div>
        <button onClick={logout} style={{width:"100%",textAlign:"left",fontSize:12,color:"#9ca3af",background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:6}}>Cerrar sesion</button>
      </div>
    </aside>
  )
}
'@

# ---- APP LAYOUT (shared) ----
$files["components\layout\AppLayout.tsx"] = @'
import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import Sidebar from "./Sidebar"
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
  if (!perfil) redirect("/auth/login")
  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <Sidebar perfil={perfil} />
      <main style={{marginLeft:224,flex:1,padding:24,minHeight:"100vh"}}>{children}</main>
    </div>
  )
}
'@

# ---- DASHBOARD LAYOUT ----
$files["app\dashboard\layout.tsx"] = @'
import AppLayout from "@/components/layout/AppLayout"
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
'@

# ---- DASHBOARD PAGE ----
$files["app\dashboard\page.tsx"] = @'
import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
const ESTADO_BADGE: Record<string,string> = {
  pendiente_aprobacion:"badge-yellow", aprobado:"badge-blue",
  en_curso:"badge-green", terminado:"badge-gray", facturado:"badge-purple", liquidado:"badge-gray",
}
const ESTADO_LABEL: Record<string,string> = {
  pendiente_aprobacion:"Pendiente", aprobado:"Aprobado", en_curso:"En curso",
  terminado:"Terminado", facturado:"Facturado", liquidado:"Liquidado",
}
export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
  const entidad = perfil?.entidad || "peru"
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)")
    .eq("entidad", entidad)
    .order("created_at", { ascending: false })
    .limit(10)
  const activos = proyectos?.filter((p:any) => ["aprobado","en_curso"].includes(p.estado)) || []
  const terminados = proyectos?.filter((p:any) => p.estado === "terminado") || []
  const pendientes = proyectos?.filter((p:any) => p.estado === "pendiente_aprobacion") || []
  const { count: rqPendientes } = await supabase.from("requerimientos_pago").select("id",{count:"exact",head:true}).in("estado",["pendiente_aprobacion","aprobado"])
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)
  const { count: cotMes } = await supabase.from("cotizaciones").select("id",{count:"exact",head:true}).gte("created_at", inicioMes.toISOString())
  const metrics = [
    { label: "Proyectos activos", value: activos.length, sub: `${pendientes.length} pendientes`, color: "#0F6E56" },
    { label: "Sin liquidar", value: terminados.length, sub: "Requieren liquidacion", color: terminados.length > 0 ? "#ca8a04" : "#374151" },
    { label: "RQs pendientes", value: rqPendientes || 0, sub: "Por aprobar o pagar", color: (rqPendientes||0) > 0 ? "#ea580c" : "#374151" },
    { label: "Cotizaciones del mes", value: cotMes || 0, sub: "Versiones generadas", color: "#374151" },
  ]
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>Dashboard</h1>
          <p style={{fontSize:13,color:"#6b7280",marginTop:2}}>Bienvenido, {perfil?.nombre}</p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary">+ Nuevo proyecto</a>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {metrics.map(m => (
          <div key={m.label} className="card">
            <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:30,fontWeight:600,color:m.color}}>{m.value}</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #f3f4f6"}}>
          <h2 style={{fontSize:14,fontWeight:500,margin:0}}>Proyectos recientes</h2>
          <a href="/proyectos" style={{fontSize:12,color:"#0F6E56"}}>Ver todos</a>
        </div>
        <table>
          <thead><tr><th>Codigo</th><th>Proyecto</th><th>Cliente</th><th>Productor</th><th>Estado</th><th>Inicio</th></tr></thead>
          <tbody>
            {proyectos && proyectos.length > 0 ? proyectos.map((p:any) => (
              <tr key={p.id}>
                <td style={{color:"#9ca3af",fontFamily:"monospace",fontSize:11}}>{p.codigo}</td>
                <td><a href={`/proyectos/${p.id}`} style={{fontWeight:500,color:"#111827"}}>{p.nombre}</a></td>
                <td>{p.cliente?.razon_social || "—"}</td>
                <td>{p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—"}</td>
                <td><span className={`badge ${ESTADO_BADGE[p.estado]||"badge-gray"}`}>{ESTADO_LABEL[p.estado]}</span></td>
                <td style={{color:"#9ca3af",fontSize:12}}>{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{textAlign:"center",color:"#9ca3af",padding:40}}>
                No hay proyectos. <a href="/proyectos/nuevo" style={{color:"#0F6E56"}}>Crea el primero</a>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
'@

# ---- PROYECTOS LAYOUT ----
$files["app\proyectos\layout.tsx"] = @'
import AppLayout from "@/components/layout/AppLayout"
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
'@

# ---- PROYECTOS PAGE ----
$files["app\proyectos\page.tsx"] = @'
import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
const ESTADO_BADGE: Record<string,string> = {
  pendiente_aprobacion:"badge-yellow", aprobado:"badge-blue", en_curso:"badge-green",
  terminado:"badge-gray", facturado:"badge-purple", liquidado:"badge-gray",
}
const ESTADO_LABEL: Record<string,string> = {
  pendiente_aprobacion:"Pendiente", aprobado:"Aprobado", en_curso:"En curso",
  terminado:"Terminado", facturado:"Facturado", liquidado:"Liquidado",
}
export default async function ProyectosPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido), cotizaciones(total_cliente,margen_pct,estado)")
    .eq("entidad", perfil?.entidad || "peru")
    .order("created_at", { ascending: false })
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>Proyectos</h1>
          <p style={{fontSize:13,color:"#6b7280",marginTop:2}}>{proyectos?.length || 0} proyectos en total</p>
        </div>
        <a href="/proyectos/nuevo" className="btn-primary">+ Nuevo proyecto</a>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Codigo</th><th>Proyecto</th><th>Cliente</th><th>Productor</th><th>Estado</th><th style={{textAlign:"right"}}>Presupuesto</th><th style={{textAlign:"right"}}>Margen</th><th>Inicio</th></tr></thead>
          <tbody>
            {proyectos && proyectos.length > 0 ? proyectos.map((p:any) => {
              const cot = p.cotizaciones?.find((c:any) => c.estado === "aprobada_cliente") || p.cotizaciones?.[0]
              const margen = cot?.margen_pct || 0
              return (
                <tr key={p.id}>
                  <td style={{color:"#9ca3af",fontFamily:"monospace",fontSize:11}}>{p.codigo}</td>
                  <td><a href={`/proyectos/${p.id}`} style={{fontWeight:500,color:"#111827"}}>{p.nombre}</a></td>
                  <td>{p.cliente?.razon_social || "—"}</td>
                  <td>{p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[p.estado]||"badge-gray"}`}>{ESTADO_LABEL[p.estado]}</span></td>
                  <td style={{textAlign:"right",fontWeight:500}}>{cot?.total_cliente ? "S/ "+Number(cot.total_cliente).toLocaleString("es-PE",{maximumFractionDigits:0}) : "—"}</td>
                  <td style={{textAlign:"right"}}>{margen > 0 ? <span style={{fontWeight:500,color:margen>=35?"#16a34a":margen>=20?"#ca8a04":"#dc2626"}}>{Number(margen).toFixed(1)}%</span> : "—"}</td>
                  <td style={{color:"#9ca3af",fontSize:12}}>{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}</td>
                </tr>
              )
            }) : <tr><td colSpan={8} style={{textAlign:"center",color:"#9ca3af",padding:40}}>No hay proyectos. <a href="/proyectos/nuevo" style={{color:"#0F6E56"}}>Crea el primero</a></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
'@

# ---- NUEVO PROYECTO ----
$files["app\proyectos\nuevo\page.tsx"] = @'
"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
export default function NuevoProyectoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [productores, setProductores] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [form, setForm] = useState({ codigo:"", nombre:"", cliente_id:"", productor_id:"", descripcion_requerimiento:"", presupuesto_referencial:"", fecha_limite_cotizacion:"", fecha_inicio:"", fecha_fin_estimada:"" })
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
      const { data: cls } = await supabase.from("clientes").select("*").eq("entidad", p?.entidad||"peru").eq("activo",true).order("razon_social")
      setClientes(cls||[])
      const { data: prods } = await supabase.from("perfiles").select("*").in("perfil",["productor","gerente_produccion"]).eq("entidad",p?.entidad||"peru").eq("activo",true)
      setProductores(prods||[])
      const { count } = await supabase.from("proyectos").select("id",{count:"exact",head:true})
      setForm(f => ({...f, codigo:`IZ-${26000+(count||0)+1}`}))
    }
    load()
  }, [])
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from("proyectos").insert({
      entidad: perfil?.entidad||"peru", codigo: form.codigo, nombre: form.nombre,
      cliente_id: form.cliente_id||null, productor_id: form.productor_id||null,
      comercial_id: user?.id, descripcion_requerimiento: form.descripcion_requerimiento,
      presupuesto_referencial: form.presupuesto_referencial ? parseFloat(form.presupuesto_referencial) : null,
      fecha_limite_cotizacion: form.fecha_limite_cotizacion||null,
      fecha_inicio: form.fecha_inicio||null, fecha_fin_estimada: form.fecha_fin_estimada||null,
      estado:"pendiente_aprobacion", created_by: user?.id,
    }).select().single()
    if (error) { alert("Error: "+error.message); setLoading(false); return }
    router.push(`/proyectos/${data.id}`)
  }
  const f = (k:string,v:string) => setForm({...form,[k]:v})
  const inputStyle = {width:"100%",padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",background:"#fff",fontFamily:"inherit"}
  const labelStyle = {display:"block",fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:500}
  return (
    <div style={{maxWidth:672}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <a href="/proyectos" style={{color:"#9ca3af",fontSize:13}}>Proyectos</a>
        <span style={{color:"#d1d5db"}}>/</span>
        <span style={{fontSize:13,color:"#4b5563"}}>Nuevo proyecto</span>
      </div>
      <h1 style={{fontSize:20,fontWeight:600,marginBottom:24}}>Nuevo proyecto</h1>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{marginBottom:16}}>
          <h2 style={{fontSize:14,fontWeight:500,marginBottom:16,marginTop:0}}>Datos del proyecto</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
            <div><label style={labelStyle}>Codigo *</label><input style={inputStyle} value={form.codigo} onChange={e=>f("codigo",e.target.value)} required /></div>
            <div><label style={labelStyle}>Entidad</label><input style={{...inputStyle,background:"#f9fafb"}} value={perfil?.entidad==="peru"?"Izango Peru":"Izango Selva"} disabled /></div>
          </div>
          <div style={{marginBottom:14}}><label style={labelStyle}>Nombre del proyecto *</label><input style={inputStyle} placeholder="Ej: Activacion Honda Mayo Lima" value={form.nombre} onChange={e=>f("nombre",e.target.value)} required /></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
            <div><label style={labelStyle}>Cliente</label>
              <select style={inputStyle} value={form.cliente_id} onChange={e=>f("cliente_id",e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Productor</label>
              <select style={inputStyle} value={form.productor_id} onChange={e=>f("productor_id",e.target.value)}>
                <option value="">Seleccionar...</option>
                {productores.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:14}}><label style={labelStyle}>Descripcion del requerimiento</label><textarea style={{...inputStyle,resize:"vertical"}} rows={3} value={form.descripcion_requerimiento} onChange={e=>f("descripcion_requerimiento",e.target.value)} /></div>
          <div><label style={labelStyle}>Presupuesto referencial (S/)</label><input type="number" style={inputStyle} placeholder="0.00" value={form.presupuesto_referencial} onChange={e=>f("presupuesto_referencial",e.target.value)} /></div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <h2 style={{fontSize:14,fontWeight:500,marginBottom:16,marginTop:0}}>Fechas</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            <div><label style={labelStyle}>Limite cotizacion</label><input type="date" style={inputStyle} value={form.fecha_limite_cotizacion} onChange={e=>f("fecha_limite_cotizacion",e.target.value)} /></div>
            <div><label style={labelStyle}>Fecha inicio</label><input type="date" style={inputStyle} value={form.fecha_inicio} onChange={e=>f("fecha_inicio",e.target.value)} /></div>
            <div><label style={labelStyle}>Fecha fin estimada</label><input type="date" style={inputStyle} value={form.fecha_fin_estimada} onChange={e=>f("fecha_fin_estimada",e.target.value)} /></div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
          <a href="/proyectos" className="btn-secondary">Cancelar</a>
          <button type="submit" disabled={loading} className="btn-primary" style={{opacity:loading?0.6:1}}>{loading?"Creando...":"Crear proyecto"}</button>
        </div>
      </form>
    </div>
  )
}
'@

# ---- CLIENTES LAYOUT ----
$files["app\clientes\layout.tsx"] = @'
import AppLayout from "@/components/layout/AppLayout"
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
'@

# ---- CLIENTES PAGE ----
$files["app\clientes\page.tsx"] = @'
import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
export default async function ClientesPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
  const { data: clientes } = await supabase.from("clientes").select("*").eq("entidad", perfil?.entidad||"peru").order("razon_social")
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>Clientes</h1>
          <p style={{fontSize:13,color:"#6b7280",marginTop:2}}>{clientes?.length||0} clientes registrados</p>
        </div>
        <a href="/clientes/nuevo" className="btn-primary">+ Nuevo cliente</a>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Razon social</th><th>RUC</th><th>Contacto</th><th>Email</th><th>Estado</th></tr></thead>
          <tbody>
            {clientes && clientes.length > 0 ? clientes.map((c:any) => (
              <tr key={c.id}>
                <td><a href={`/clientes/${c.id}`} style={{fontWeight:500,color:"#111827"}}>{c.razon_social}</a></td>
                <td style={{color:"#9ca3af",fontFamily:"monospace",fontSize:12}}>{c.ruc||"—"}</td>
                <td>{c.nombre_contacto||"—"}</td>
                <td style={{color:"#9ca3af",fontSize:12}}>{c.email_contacto||"—"}</td>
                <td><span className={`badge ${c.activo?"badge-green":"badge-gray"}`}>{c.activo?"Activo":"Inactivo"}</span></td>
              </tr>
            )) : <tr><td colSpan={5} style={{textAlign:"center",color:"#9ca3af",padding:40}}>No hay clientes. <a href="/clientes/nuevo" style={{color:"#0F6E56"}}>Agrega el primero</a></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
'@

# ---- NUEVO CLIENTE ----
$files["app\clientes\nuevo\page.tsx"] = @'
"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
export default function NuevoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [entidad, setEntidad] = useState("peru")
  const [form, setForm] = useState({ razon_social:"", ruc:"", nombre_contacto:"", telefono_contacto:"", email_contacto:"", nombre_facturacion:"", telefono_facturacion:"", email_facturacion:"", direccion:"" })
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from("perfiles").select("entidad").eq("id", user!.id).single()
      setEntidad(p?.entidad||"peru")
    }
    load()
  }, [])
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("clientes").insert({...form, entidad, created_by: user?.id})
    if (error) { alert("Error: "+error.message); setLoading(false); return }
    router.push("/clientes")
  }
  const f = (k:string,v:string) => setForm({...form,[k]:v})
  const inputStyle = {width:"100%",padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",background:"#fff",fontFamily:"inherit"}
  const labelStyle = {display:"block",fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:500}
  return (
    <div style={{maxWidth:672}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <a href="/clientes" style={{color:"#9ca3af",fontSize:13}}>Clientes</a>
        <span style={{color:"#d1d5db"}}>/</span>
        <span style={{fontSize:13}}>Nuevo cliente</span>
      </div>
      <h1 style={{fontSize:20,fontWeight:600,marginBottom:24}}>Nuevo cliente</h1>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{marginBottom:16}}>
          <h2 style={{fontSize:14,fontWeight:500,marginBottom:16,marginTop:0}}>Datos principales</h2>
          <div style={{marginBottom:14}}><label style={labelStyle}>Razon social *</label><input style={inputStyle} value={form.razon_social} onChange={e=>f("razon_social",e.target.value)} required /></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div><label style={labelStyle}>RUC</label><input style={inputStyle} maxLength={11} value={form.ruc} onChange={e=>f("ruc",e.target.value)} /></div>
            <div><label style={labelStyle}>Direccion</label><input style={inputStyle} value={form.direccion} onChange={e=>f("direccion",e.target.value)} /></div>
          </div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <h2 style={{fontSize:14,fontWeight:500,marginBottom:16,marginTop:0}}>Contacto comercial</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
            <div><label style={labelStyle}>Nombre</label><input style={inputStyle} value={form.nombre_contacto} onChange={e=>f("nombre_contacto",e.target.value)} /></div>
            <div><label style={labelStyle}>Telefono</label><input style={inputStyle} value={form.telefono_contacto} onChange={e=>f("telefono_contacto",e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email_contacto} onChange={e=>f("email_contacto",e.target.value)} /></div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <h2 style={{fontSize:14,fontWeight:500,marginBottom:16,marginTop:0}}>Contacto de facturacion</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
            <div><label style={labelStyle}>Nombre</label><input style={inputStyle} value={form.nombre_facturacion} onChange={e=>f("nombre_facturacion",e.target.value)} /></div>
            <div><label style={labelStyle}>Telefono</label><input style={inputStyle} value={form.telefono_facturacion} onChange={e=>f("telefono_facturacion",e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email_facturacion} onChange={e=>f("email_facturacion",e.target.value)} /></div>
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
          <a href="/clientes" className="btn-secondary">Cancelar</a>
          <button type="submit" disabled={loading} className="btn-primary" style={{opacity:loading?0.6:1}}>{loading?"Guardando...":"Crear cliente"}</button>
        </div>
      </form>
    </div>
  )
}
'@

# ---- PROFORMAS LAYOUT ----
$files["app\proformas\layout.tsx"] = @'
import AppLayout from "@/components/layout/AppLayout"
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
'@

$files["app\proformas\page.tsx"] = @'
import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
export default async function ProformasPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Proformas</h1>
      <p style={{color:"#6b7280",fontSize:13}}>Modulo en construccion — Sesion 3</p>
    </div>
  )
}
'@

$files["app\rq\layout.tsx"] = @'
import AppLayout from "@/components/layout/AppLayout"
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
'@

$files["app\rq\page.tsx"] = @'
import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
export default async function RQPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Requerimientos de pago</h1><p style={{color:"#6b7280",fontSize:13}}>Modulo en construccion — Sesion 4</p></div>
}
'@

$files["app\facturacion\layout.tsx"] = @'
import AppLayout from "@/components/layout/AppLayout"
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
'@

$files["app\facturacion\page.tsx"] = @'
import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
export default async function FacturacionPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Facturacion</h1><p style={{color:"#6b7280",fontSize:13}}>Modulo en construccion — Sesion 4</p></div>
}
'@

$files["app\liquidaciones\layout.tsx"] = @'
import AppLayout from "@/components/layout/AppLayout"
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
'@

$files["app\liquidaciones\page.tsx"] = @'
import { createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
export default async function LiquidacionesPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <div><h1 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Liquidaciones</h1><p style={{color:"#6b7280",fontSize:13}}>Modulo en construccion — Sesion 5</p></div>
}
'@

foreach ($path in $files.Keys) {
    $fullPath = Join-Path (Get-Location) $path
    $dir = Split-Path $fullPath -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($fullPath, $files[$path], [System.Text.Encoding]::UTF8)
    Write-Host "OK: $path"
}
Write-Host ""
Write-Host "LISTO - Todos los archivos actualizados"
