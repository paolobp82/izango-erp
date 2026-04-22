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