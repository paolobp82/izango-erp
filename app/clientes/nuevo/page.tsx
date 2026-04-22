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