"use client"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import Sidebar from "./Sidebar"
import BusquedaGlobal from "@/components/BusquedaGlobal"
import Notificaciones from "@/components/Notificaciones"
import { useRouter, usePathname } from "next/navigation"

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

  const isAuthRoute = pathname === "/login" || pathname === "/reset-password" || pathname?.startsWith("/auth")

  useEffect(() => {
    if (isAuthRoute) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      if (!p) { router.push("/login"); return }
      setPerfil(p)
      setLoading(false)
    }
    load()
  }, [isAuthRoute, router, supabase])

  if (isAuthRoute) return <>{children}</>

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


