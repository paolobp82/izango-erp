"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
export default function NuevoClientePage() {
  const router = useRouter(); const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [entidad, setEntidad] = useState("peru")
  const [form, setForm] = useState({ razon_social:"", ruc:"", nombre_contacto:"", telefono_contacto:"", email_contacto:"", nombre_facturacion:"", telefono_facturacion:"", email_facturacion:"", direccion:"" })
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: p } = await supabase.from("perfiles").select("entidad").eq("id", session!.user.id).single()
      setEntidad(p?.entidad || "peru")
    }
    load()
  }, [])
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from("clientes").insert({ ...form, entidad, created_by: session?.user.id })
    if (error) { alert("Error: " + error.message); setLoading(false); return }
    router.push("/clientes")
  }
  const f = (k: string, v: string) => setForm({ ...form, [k]: v })
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/clientes" className="text-gray-400 hover:text-gray-600 text-sm">Clientes</a>
        <span className="text-gray-300">/</span>
        <span className="text-sm">Nuevo cliente</span>
      </div>
      <h1 className="text-xl font-semibold mb-6">Nuevo cliente</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-sm font-medium">Datos principales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Razon social *</label><input className="input" value={form.razon_social} onChange={e => f("razon_social", e.target.value)} required /></div>
            <div><label className="label">RUC</label><input className="input" maxLength={11} value={form.ruc} onChange={e => f("ruc", e.target.value)} /></div>
            <div><label className="label">Direccion</label><input className="input" value={form.direccion} onChange={e => f("direccion", e.target.value)} /></div>
          </div>
        </div>
        <div className="card space-y-4">
          <h2 className="text-sm font-medium">Contacto comercial</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre</label><input className="input" value={form.nombre_contacto} onChange={e => f("nombre_contacto", e.target.value)} /></div>
            <div><label className="label">Telefono</label><input className="input" value={form.telefono_contacto} onChange={e => f("telefono_contacto", e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Email</label><input type="email" className="input" value={form.email_contacto} onChange={e => f("email_contacto", e.target.value)} /></div>
          </div>
        </div>
        <div className="card space-y-4">
          <h2 className="text-sm font-medium">Contacto de facturacion</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre</label><input className="input" value={form.nombre_facturacion} onChange={e => f("nombre_facturacion", e.target.value)} /></div>
            <div><label className="label">Telefono</label><input className="input" value={form.telefono_facturacion} onChange={e => f("telefono_facturacion", e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Email</label><input type="email" className="input" value={form.email_facturacion} onChange={e => f("email_facturacion", e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <a href="/clientes" className="btn-secondary">Cancelar</a>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">{loading ? "Guardando..." : "Crear cliente"}</button>
        </div>
      </form>
    </div>
  )
}