"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from("perfiles").select("entidad").eq("id", user.id).single()
      const { data } = await supabase.from("clientes").select("*").eq("entidad", p?.entidad||"peru").order("razon_social")
      setClientes(data||[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{color:"#6b7280",fontSize:13}}>Cargando...</div>

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>Clientes</h1>
          <p style={{fontSize:13,color:"#6b7280",marginTop:2}}>{clientes.length} clientes registrados</p>
        </div>
        <a href="/clientes/nuevo" className="btn-primary">+ Nuevo cliente</a>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Razon social</th><th>RUC</th><th>Contacto</th><th>Email</th><th>Estado</th></tr></thead>
          <tbody>
            {clientes.length > 0 ? clientes.map((c:any) => (
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