"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { enviarAlerta } from "@/lib/alertas"
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
            <div><label style={labelStyle}>Fecha limite entrega cotizacion</label><input type="date" style={inputStyle} value={form.fecha_limite_cotizacion} onChange={e=>f("fecha_limite_cotizacion",e.target.value)} /></div>
            <div><label style={labelStyle}>Fecha de ejecucion del proyecto</label><input type="date" style={inputStyle} value={form.fecha_inicio} onChange={e=>f("fecha_inicio",e.target.value)} /></div>
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