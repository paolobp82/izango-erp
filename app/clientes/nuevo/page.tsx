"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function NuevoProyectoPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clientes, setClientes] = useState<any[]>([])
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: "", cliente_id: "", productor_id: "", estado: "pendiente_aprobacion",
    descripcion_requerimiento: "", presupuesto_referencial: "",
    fecha_limite_cotizacion: "", fecha_inicio: "", fecha_fin_estimada: "",
  })

  useEffect(() => {
    async function load() {
      const { data: cls } = await supabase.from("clientes").select("id, razon_social").order("razon_social")
      setClientes(cls || [])
      const { data: perfs } = await supabase.from("perfiles").select("id, nombre, apellido").eq("activo", true).order("nombre")
      setPerfiles(perfs || [])
    }
    load()
  }, [])

  async function guardar() {
    if (!form.nombre || !form.cliente_id) { alert("Nombre y cliente son obligatorios"); return }
    setSaving(true)
    const { count } = await supabase.from("proyectos").select("*", { count: "exact", head: true })
    const codigo = "IZ-26" + String((count || 0) + 1).padStart(3, "0")
    const payload: any = {
      nombre: form.nombre, cliente_id: form.cliente_id, estado: form.estado, codigo,
      descripcion_requerimiento: form.descripcion_requerimiento || null,
      presupuesto_referencial: form.presupuesto_referencial ? Number(form.presupuesto_referencial) : null,
      fecha_limite_cotizacion: form.fecha_limite_cotizacion || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
    }
    if (form.productor_id) payload.productor_id = form.productor_id
    const { data, error } = await supabase.from("proyectos").insert(payload).select().single()
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    router.push("/proyectos/" + data.id)
  }

  const inp: any = { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <a href="/proyectos" style={{ color: "#9ca3af", fontSize: 12 }}>Proyectos</a>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ fontSize: 12, color: "#4b5563" }}>Nuevo proyecto</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Nuevo proyecto</h1>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, marginTop: 0 }}>Información general</h2>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={lbl}>Nombre del proyecto *</label>
            <input style={inp} value={form.nombre} placeholder="Ej: Activación Honda Lima 2025"
              onChange={e => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={lbl}>Cliente *</label>
              <select style={inp} value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Productor</label>
              <select style={inp} value={form.productor_id} onChange={e => setForm({ ...form, productor_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {perfiles.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={lbl}>Estado</label>
              <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option value="pendiente_aprobacion">Pendiente aprobación</option>
                <option value="aprobado">Aprobado</option>
                <option value="en_curso">En curso</option>
                <option value="terminado">Terminado</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Presupuesto referencial (S/)</label>
              <input type="number" style={inp} value={form.presupuesto_referencial} placeholder="0.00"
                onChange={e => setForm({ ...form, presupuesto_referencial: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={lbl}>Descripción / Requerimiento</label>
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.descripcion_requerimiento}
              placeholder="Brief del cliente..."
              onChange={e => setForm({ ...form, descripcion_requerimiento: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, marginTop: 0 }}>Fechas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Límite cotización</label>
            <input type="date" style={inp} value={form.fecha_limite_cotizacion}
              onChange={e => setForm({ ...form, fecha_limite_cotizacion: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Fecha inicio</label>
            <input type="date" style={inp} value={form.fecha_inicio}
              onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Fecha fin estimada</label>
            <input type="date" style={inp} value={form.fecha_fin_estimada}
              onChange={e => setForm({ ...form, fecha_fin_estimada: e.target.value })} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={() => router.push("/proyectos")} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
        <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
          {saving ? "Guardando..." : "Crear proyecto"}
        </button>
      </div>
    </div>
  )
}
