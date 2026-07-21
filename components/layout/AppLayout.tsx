"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase"
import { clearBrowserSupabaseSession, isInvalidRefreshTokenError } from "@/lib/supabase-session"
import Sidebar from "./Sidebar"
import BusquedaGlobal from "@/components/BusquedaGlobal"
import Notificaciones from "@/components/Notificaciones"
import { useRouter, usePathname } from "next/navigation"
import { V2AppShell } from "@/components/v2/layout"

type LayoutProfile = {
  id: string
  nombre: string
  apellido: string
  perfil: string
  entidad?: string | null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<LayoutProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const redirectingToLoginRef = useRef(false)

  const isAuthRoute = pathname === "/login" || pathname === "/reset-password" || pathname?.startsWith("/auth")
  const v2Routes = [
    "/proveedores",
    "/biblioteca",
    "/admin/usuarios",
    "/crm",
    "/clientes",
    "/proyectos",
    "/perfil",
    "/rrhh/trabajadores",
    "/rrhh/faltas-medicas",
    "/rrhh/horas-extras",
    "/rrhh/permisos",
    "/rrhh/vacaciones",
    "/logistica/traslados",
    "/inventario/ubicaciones",
    "/alertas",
    "/biblioteca-medios",
    "/envios-materiales",
    "/envio-materiales",
    "/inventario/ordenes",
    "/logistica/mi-trabajo",
    "/inventario",
    "/calendario",
    "/reporteria",
    "/trazabilidad",
    "/ia",
    "/gestor",
    "/dashboard",
    "/rq",
    "/facturacion",
    "/liquidaciones",
    "/caja-chica",
    "/gastos-oficina",
  ]
  const isV2Route = v2Routes.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  )

  useEffect(() => {
    if (isAuthRoute || isV2Route) return
    let cancelled = false

    async function redirectToLogin(clearSession: boolean) {
      if (redirectingToLoginRef.current) return
      redirectingToLoginRef.current = true
      if (clearSession) await clearBrowserSupabaseSession(supabase)
      if (!cancelled) {
        setPerfil(null)
        setLoading(false)
        router.replace("/login")
      }
    }

    async function load() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error && isInvalidRefreshTokenError(error)) {
          await redirectToLogin(true)
          return
        }
        if (error || !user) {
          await redirectToLogin(false)
          return
        }
        const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
        if (!p) {
          await redirectToLogin(false)
          return
        }
        if (!cancelled) {
          setPerfil(p)
          setLoading(false)
        }
      } catch (error) {
        await redirectToLogin(isInvalidRefreshTokenError(error))
      }
    }
    load()
    return () => { cancelled = true }
  }, [isAuthRoute, isV2Route, router, supabase])

  if (isAuthRoute) return <>{children}</>

  if (isV2Route) {
    return (
      <V2AppShell>
        {children}
      </V2AppShell>
    )
  }

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f9fafb"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,background:"#03E373",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <span style={{color:"#fff",fontWeight:700}}>iz</span>
        </div>
        <p style={{color:"#6b7280",fontSize:13}}>Cargando...</p>
      </div>
    </div>
  )

  if (!perfil) return null

  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <Sidebar perfil={perfil} />
      <div style={{marginLeft:"var(--sidebar-width, 260px)",flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",transition:"margin-left .22s ease"}}>
        <header style={{background:"#fff",borderBottom:"1px solid #f3f4f6",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
          <BusquedaGlobal />
          <Notificaciones usuarioId={perfil.id} />
        </header>
        <main style={{flex:1,padding:24}}>{children}</main>
      </div>
    </div>
  )
}
