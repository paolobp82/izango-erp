"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Sidebar from "./Sidebar"
import { useRouter } from "next/navigation"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      if (!p) { router.push("/auth/login"); return }
      setPerfil(p)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f9fafb"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,background:"#1D9E75",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <span style={{color:"#fff",fontWeight:700}}>iz</span>
        </div>
        <p style={{color:"#6b7280",fontSize:13}}>Cargando...</p>
      </div>
    </div>
  )

  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <Sidebar perfil={perfil} />
      <main style={{marginLeft:224,flex:1,padding:24,minHeight:"100vh"}}>{children}</main>
    </div>
  )
}