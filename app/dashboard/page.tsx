"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const ESTADO_BADGE: Record<string,string> = {
  pendiente_aprobacion:"badge-yellow", aprobado:"badge-blue", en_curso:"badge-green",
  terminado:"badge-gray", facturado:"badge-purple", liquidado:"badge-gray",
}
const ESTADO_LABEL: Record<string,string> = {
  pendiente_aprobacion:"Pendiente", aprobado:"Aprobado", en_curso:"En curso",
  terminado:"Terminado", facturado:"Facturado", liquidado:"Liquidado",
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
      const { data: proyectos } = await supabase
        .from("proyectos")
        .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)")
        .eq("entidad", p?.entidad||"peru")
        .order("created_at", { ascending: false })
        .limit(10)
      const { count: rqPendientes } = await supabase
        .from("requerimientos_pago")
        .select("id",{count:"exact",head:true})
        .in("estado",["pendiente_aprobacion","aprobado"])
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0,0,0,0)
      const { count: cotMes } = await supabase
        .from("cotizaciones")
        .select("id",{count:"exact",head:true})
        .gte("created_at", inicioMes.toISOString())
      setData({ proyectos: proyectos||[], rqPendientes: rqPendientes||0, cotMes: cotMes||0 })
    }
    load()
  }, [])

  if (!data) return <div style={{color:"#6b7280",fontSize:13}}>Cargando dashboard...</div>

  const activos = data.proyectos.filter((p:any) => ["aprobado","en_curso"].includes(p.estado))
  const terminados = data.proyectos.filter((p:any) => p.estado === "terminado")
  const pendientes = data.proyectos.filter((p:any) => p.estado === "pendiente_aprobacion")
  const metrics = [
    { label:"Proyectos activos", value:activos.length, sub:`${pendientes.length} pendientes`, color:"#0F6E56" },
    { label:"Sin liquidar", value:terminados.length, sub:"Requieren liquidacion", color:terminados.length>0?"#ca8a04":"#374151" },
    { label:"RQs pendientes", value:data.rqPendientes, sub:"Por aprobar o pagar", color:data.rqPendientes>0?"#ea580c":"#374151" },
    { label:"Cotizaciones del mes", value:data.cotMes, sub:"Versiones generadas", color:"#374151" },
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
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Proyecto</th>
              <th>Cliente</th>
              <th>Productor</th>
              <th>Estado</th>
              <th>Inicio</th>
            </tr>
          </thead>
          <tbody>
            {data.proyectos.length > 0 ? data.proyectos.map((p:any) => (
              <tr key={p.id}>
                <td style={{color:"#9ca3af",fontFamily:"monospace",fontSize:11}}>{p.codigo}</td>
                <td>
                  <a href={"/proyectos/"+p.id} style={{fontWeight:500,color:"#111827"}}>
                    {p.nombre}
                  </a>
                </td>
                <td>{p.cliente?.razon_social||"—"}</td>
                <td>{p.productor ? p.productor.nombre+" "+p.productor.apellido : "—"}</td>
                <td>
                  <span className={"badge "+(ESTADO_BADGE[p.estado]||"badge-gray")}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                </td>
                <td style={{color:"#9ca3af",fontSize:12}}>
                  {p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{textAlign:"center",color:"#9ca3af",padding:40}}>
                  No hay proyectos.{" "}
                  <a href="/proyectos/nuevo" style={{color:"#0F6E56"}}>Crea el primero</a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}