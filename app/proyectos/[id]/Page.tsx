"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"

const ESTADO_LABELS: Record<string,string> = {
  pendiente_aprobacion:"Pendiente aprobación", aprobado:"Aprobado", en_curso:"En curso",
  terminado:"Terminado", facturado:"Facturado", liquidado:"Liquidado",
}
const ESTADO_BADGE: Record<string,string> = {
  pendiente_aprobacion:"badge-yellow", aprobado:"badge-blue", en_curso:"badge-green",
  terminado:"badge-gray", facturado:"badge-purple", liquidado:"badge-gray",
}
const ESTADOS_SIGUIENTE: Record<string,string> = {
  pendiente_aprobacion:"aprobado", aprobado:"en_curso", en_curso:"terminado", terminado:"facturado",
}
const ESTADO_BTN: Record<string,string> = {
  pendiente_aprobacion:"Marcar como aprobado", aprobado:"Iniciar ejecución",
  en_curso:"Marcar como terminado", terminado:"Marcar como facturado",
}

export default function ProyectoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [proyecto, setProyecto] = useState<any>(null)
  const [cotizaciones, setCotizaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from("proyectos")
        .select("*, cliente:clientes(*), productor:perfiles!productor_id(nombre,apellido), comercial:perfiles!comercial_id(nombre,apellido)")
        .eq("id", params.id as string)
        .single()
      setProyecto(p)
      const { data: cots } = await supabase
        .from("cotizaciones")
        .select("*")
        .eq("proyecto_id", params.id as string)
        .order("version", { ascending: false })
      setCotizaciones(cots||[])
      setLoading(false)
    }
    load()
  }, [params.id])

  async function avanzarEstado() {
    const siguiente = ESTADOS_SIGUIENTE[proyecto.estado]
    if (!siguiente) return
    await supabase.from("proyectos").update({ estado: siguiente }).eq("id", proyecto.id)
    setProyecto({...proyecto, estado: siguiente})
  }

  async function nuevaCotizacion() {
    const version = cotizaciones.length > 0 ? cotizaciones[0].version + 1 : 1
    const { data } = await supabase.from("cotizaciones").insert({
      proyecto_id: proyecto.id,
      version,
      estado: "borrador",
      fee_agencia_pct: 10,
      igv_pct: 18,
    }).select().single()
    if (data) router.push("/proyectos/"+proyecto.id+"/cotizaciones/"+data.id)
  }

  if (loading) return <div style={{color:"#6b7280",fontSize:13,padding:24}}>Cargando...</div>
  if (!proyecto) return <div style={{color:"#6b7280",fontSize:13,padding:24}}>Proyecto no encontrado</div>

  const cotAprobada = cotizaciones.find(c => c.estado === "aprobada_cliente")
  const cotActiva = cotAprobada || cotizaciones[0]

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
            <a href="/proyectos" style={{color:"#9ca3af",fontSize:13}}>Proyectos</a>
            <span style={{color:"#d1d5db"}}>/</span>
            <span style={{fontSize:13,color:"#4b5563"}}>{proyecto.codigo}</span>
          </div>
          <h1 style={{fontSize:20,fontWeight:600,margin:0}}>{proyecto.nombre}</h1>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8}}>
            <span className={"badge "+(ESTADO_BADGE[proyecto.estado]||"badge-gray")}>
              {ESTADO_LABELS[proyecto.estado]}
            </span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {ESTADO_BTN[proyecto.estado] && (
            <button onClick={avanzarEstado} className="btn-primary">
              {ESTADO_BTN[proyecto.estado]}
            </button>
          )}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div className="card">
          <h2 style={{fontSize:13,fontWeight:500,marginBottom:14,marginTop:0}}>Información del proyecto</h2>
          {[
            ["Cliente", proyecto.cliente?.razon_social||"—"],
            ["RUC", proyecto.cliente?.ruc||"—"],
            ["Contacto", proyecto.cliente?.nombre_contacto||"—"],
            ["Productor", proyecto.productor ? proyecto.productor.nombre+" "+proyecto.productor.apellido : "—"],
            ["Comercial", proyecto.comercial ? proyecto.comercial.nombre+" "+proyecto.comercial.apellido : "—"],
          ].map(([label,value]) => (
            <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:13,borderBottom:"1px solid #f3f4f6",paddingBottom:8,marginBottom:8}}>
              <span style={{color:"#6b7280"}}>{label}</span>
              <span style={{fontWeight:500}}>{value}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 style={{fontSize:13,fontWeight:500,marginBottom:14,marginTop:0}}>Fechas</h2>
          {[
            ["Fecha inicio", proyecto.fecha_inicio ? new Date(proyecto.fecha_inicio).toLocaleDateString("es-PE") : "—"],
            ["Fecha fin estimada", proyecto.fecha_fin_estimada ? new Date(proyecto.fecha_fin_estimada).toLocaleDateString("es-PE") : "—"],
            ["Límite cotización", proyecto.fecha_limite_cotizacion ? new Date(proyecto.fecha_limite_cotizacion).toLocaleDateString("es-PE") : "—"],
            ["Presupuesto ref.", proyecto.presupuesto_referencial ? "S/ "+Number(proyecto.presupuesto_referencial).toLocaleString("es-PE") : "—"],
          ].map(([label,value]) => (
            <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:13,borderBottom:"1px solid #f3f4f6",paddingBottom:8,marginBottom:8}}>
              <span style={{color:"#6b7280"}}>{label}</span>
              <span style={{fontWeight:500}}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {cotActiva && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
          {[
            { label:"Costo total", value:"S/ "+Number(cotActiva.subtotal_costo||0).toLocaleString("es-PE",{maximumFractionDigits:0}), color:"#dc2626" },
            { label:"Precio cliente", value:"S/ "+Number(cotActiva.total_cliente||0).toLocaleString("es-PE",{maximumFractionDigits:0}), color:"#0F6E56" },
            { label:"Margen", value:Number(cotActiva.margen_pct||0).toFixed(1)+"%", color:(cotActiva.margen_pct||0)>=35?"#16a34a":(cotActiva.margen_pct||0)>=20?"#ca8a04":"#dc2626" },
            { label:"Versión activa", value:"V"+cotActiva.version, color:"#374151" },
          ].map(m => (
            <div key={m.label} className="card" style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>{m.label}</div>
              <div style={{fontSize:22,fontWeight:600,color:m.color}}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #f3f4f6"}}>
          <h2 style={{fontSize:14,fontWeight:500,margin:0}}>Proformas</h2>
          <button onClick={nuevaCotizacion} className="btn-primary" style={{fontSize:12,padding:"6px 14px"}}>
            + Nueva {cotizaciones.length > 0 ? "V"+(cotizaciones[0].version+1) : "V1"}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Versión</th><th>Estado</th><th>Condición pago</th>
              <th style={{textAlign:"right"}}>Costo</th>
              <th style={{textAlign:"right"}}>Precio cliente</th>
              <th style={{textAlign:"right"}}>Margen</th>
              <th>Fecha</th><th></th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones.length > 0 ? cotizaciones.map((c:any) => (
              <tr key={c.id}>
                <td style={{fontWeight:600,color:"#0F6E56"}}>V{c.version}</td>
                <td>
                  <span className={"badge "+(c.estado==="aprobada_cliente"?"badge-green":c.estado==="enviada_cliente"?"badge-blue":c.estado==="rechazada"?"badge-red":"badge-gray")}>
                    {c.estado==="borrador"?"Borrador":c.estado==="enviada_cliente"?"Enviada":c.estado==="aprobada_cliente"?"Aprobada":c.estado==="rechazada"?"Rechazada":"En revisión"}
                  </span>
                </td>
                <td style={{fontSize:12,color:"#6b7280"}}>{c.condicion_pago||"—"}</td>
                <td style={{textAlign:"right",color:"#dc2626",fontWeight:500}}>
                  {c.subtotal_costo > 0 ? "S/ "+Number(c.subtotal_costo).toLocaleString("es-PE",{maximumFractionDigits:0}) : "—"}
                </td>
                <td style={{textAlign:"right",fontWeight:500,color:"#0F6E56"}}>
                  {c.total_cliente > 0 ? "S/ "+Number(c.total_cliente).toLocaleString("es-PE",{maximumFractionDigits:0}) : "—"}
                </td>
                <td style={{textAlign:"right"}}>
                  {c.margen_pct > 0 ? <span style={{fontWeight:500,color:c.margen_pct>=35?"#16a34a":c.margen_pct>=20?"#ca8a04":"#dc2626"}}>{Number(c.margen_pct).toFixed(1)}%</span> : "—"}
                </td>
                <td style={{fontSize:12,color:"#9ca3af"}}>{new Date(c.created_at).toLocaleDateString("es-PE")}</td>
                <td>
                  <a href={"/proyectos/"+proyecto.id+"/cotizaciones/"+c.id} style={{fontSize:12,color:"#0F6E56"}}>
                    {c.estado==="borrador"?"Editar":"Ver"}
                  </a>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} style={{textAlign:"center",color:"#9ca3af",padding:32}}>
                  No hay proformas.{" "}
                  <button onClick={nuevaCotizacion} style={{color:"#0F6E56",background:"none",border:"none",cursor:"pointer",fontSize:13}}>
                    Crear V1
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}