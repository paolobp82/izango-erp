import { createClient } from "@/lib/supabase"
export default async function ClientesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { return <div>No autorizado</div> }
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", session.user.id).single()
  const { data: clientes } = await supabase.from("clientes").select("*").eq("entidad", perfil?.entidad || "peru").order("razon_social")
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div><h1 style={{fontSize:20,fontWeight:600}}>Clientes</h1><p style={{fontSize:13,color:"#6b7280",marginTop:2}}>{clientes?.length || 0} clientes registrados</p></div>
        <a href="/clientes/nuevo" className="btn-primary">+ Nuevo cliente</a>
      </div>
      <div className="card p-0 overflow-hidden">
        <table>
          <thead><tr><th>Razon social</th><th>RUC</th><th>Contacto</th><th>Email</th><th>Estado</th></tr></thead>
          <tbody>
            {clientes && clientes.length > 0 ? clientes.map((c: any) => (
              <tr key={c.id}>
                <td><a href={`/clientes/${c.id}`} style={{fontWeight:500,color:"#111827"}}>{c.razon_social}</a></td>
                <td style={{color:"#9ca3af",fontFamily:"monospace",fontSize:12}}>{c.ruc || "—"}</td>
                <td>{c.nombre_contacto || "—"}</td>
                <td style={{color:"#9ca3af",fontSize:12}}>{c.email_contacto || "—"}</td>
                <td><span className={`badge ${c.activo ? "badge-green" : "badge-gray"}`}>{c.activo ? "Activo" : "Inactivo"}</span></td>
              </tr>
            )) : <tr><td colSpan={5} style={{textAlign:"center",color:"#9ca3af",padding:40}}>No hay clientes. <a href="/clientes/nuevo" style={{color:"#0F6E56"}}>Agrega el primero</a></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}