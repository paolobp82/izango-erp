"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function NuevoClientePage() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    razon_social: "", ruc: "", nombre_contacto: "", email_contacto: "",
    telefono_contacto: "", nombre_contacto_admin: "", email_contacto_admin: "",
    telefono_contacto_admin: "", direccion: "",
  })

  async function guardar() {
    if (!form.razon_social) { alert("Razon social es obligatoria"); return }
    setSaving(true)
    const { data, error } = await supabase.from("clientes").insert({
      razon_social: form.razon_social,
      ruc: form.ruc || null,
      nombre_contacto: form.nombre_contacto || null,
      email_contacto: form.email_contacto || null,
      telefono_contacto: form.telefono_contacto || null,
      nombre_contacto_admin: form.nombre_contacto_admin || null,
      email_contacto_admin: form.email_contacto_admin || null,
      telefono_contacto_admin: form.telefono_contacto_admin || null,
      direccion: form.direccion || null,
    }).select().single()
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    router.push("/clientes")
  }

  const inp: any = { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <a href="/clientes" style={{ color: "#9ca3af", fontSize: 12 }}>Clientes</a>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ fontSize: 12, color: "#4b5563" }}>Nuevo cliente</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Nuevo cliente</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, marginTop: 0 }}>Datos de la empresa</h2>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={lbl}>Razon social *</label>
              <input style={inp} value={form.razon_social} placeholder="Razon social de la empresa"
                onChange={e => setForm({ ...form, razon_social: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>RUC</label>
              <input style={inp} value={form.ruc} placeholder="20xxxxxxxxx"
                onChange={e => setForm({ ...form, ruc: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={lbl}>Direccion</label>
            <input style={inp} value={form.direccion} placeholder="Direccion de la empresa"
              onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, marginTop: 0 }}>Contacto comercial</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Nombre contacto</label>
            <input style={inp} value={form.nombre_contacto} placeholder="Nombre completo"
              onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Email contacto</label>
            <input style={inp} type="email" value={form.email_contacto} placeholder="correo@empresa.com"
              onChange={e => setForm({ ...form, email_contacto: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Telefono contacto</label>
            <input style={inp} value={form.telefono_contacto} placeholder="9xxxxxxxx"
              onChange={e => setForm({ ...form, telefono_contacto: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, marginTop: 0 }}>Contacto administracion / pagos</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Nombre contacto admin</label>
            <input style={inp} value={form.nombre_contacto_admin} placeholder="Nombre completo"
              onChange={e => setForm({ ...form, nombre_contacto_admin: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Email admin</label>
            <input style={inp} type="email" value={form.email_contacto_admin} placeholder="admin@empresa.com"
              onChange={e => setForm({ ...form, email_contacto_admin: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Telefono admin</label>
            <input style={inp} value={form.telefono_contacto_admin} placeholder="9xxxxxxxx"
              onChange={e => setForm({ ...form, telefono_contacto_admin: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={() => router.push("/clientes")} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
        <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
          {saving ? "Guardando..." : "Crear cliente"}
        </button>
      </div>
    </div>
  )
}
