"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const PERFILES = ["superadmin","gerente_general","administrador","controller","productor","logistica","practicante","comercial","gerente_produccion","gerente_finanzas"]
const PERFIL_LABEL: any = {
  superadmin:"Super Administrador", gerente_general:"Gerente General",
  administrador:"Administrador", controller:"Controller",
  productor:"Productor", logistica:"Logística",
  practicante:"Practicante", comercial:"Comercial",
  gerente_produccion:"Gerente de Producción", gerente_finanzas:"Gerente de Finanzas",
}

export default function AdminUsuariosPage() {
  const supabase = createClient()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPass, setShowPass] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [newPass, setNewPass] = useState("")
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", password: "", perfil: "productor", entidad: "peru"
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data } = await supabase.from("perfiles").select("*").order("apellido")
    setUsuarios(data || [])
    setLoading(false)
  }

  async function crearUsuario() {
    if (!form.nombre || !form.apellido || !form.email || !form.password) { setError("Todos los campos son obligatorios"); return }
    if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return }
    setSaving(true)
    setMsg("")
    setError("")
    const res = await fetch("/api/admin/crear-usuario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (data.error) { setError(data.error) }
    else {
      setMsg("Usuario creado correctamente")
      setShowForm(false)
      setForm({ nombre: "", apellido: "", email: "", password: "", perfil: "productor", entidad: "peru" })
      load()
    }
    setSaving(false)
  }

  async function cambiarPassword() {
    if (!newPass || newPass.length < 6) { setError("Mínimo 6 caracteres"); return }
    setSaving(true)
    setMsg("")
    setError("")
    const res = await fetch("/api/admin/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: showPass.id, password: newPass })
    })
    const data = await res.json()
    if (data.error) { setError(data.error) }
    else { setMsg("Contraseña actualizada"); setShowPass(null); setNewPass("") }
    setSaving(false)
  }

  async function cambiarPerfil(id: string, nuevoPerfil: string) {
    await supabase.from("perfiles").update({ perfil: nuevoPerfil }).eq("id", id)
    load()
  }

  const esAdmin = perfil?.perfil === "superadmin" || perfil?.perfil === "gerente_general"

  const inp: any = { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none", boxSizing: "border-box" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>
  if (!esAdmin) return <div style={{ color: "#dc2626", padding: 24 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Gestión de Usuarios</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{usuarios.length} usuarios registrados</p>
        </div>
        <button onClick={() => { setShowForm(true); setMsg(""); setError("") }} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo usuario</button>
      </div>

      {msg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>USUARIO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PERFIL</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ENTIDAD</th>
              <th style={{ padding: "10px 20px", width: 200 }}></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, idx) => (
              <tr key={u.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "12px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#03E373", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1D2040", flexShrink: 0 }}>
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{u.nombre} {u.apellido}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{u.id.slice(0,8)}...</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px" }}>
                  <select value={u.perfil} onChange={e => cambiarPerfil(u.id, e.target.value)}
                    style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff", cursor: "pointer" }}>
                    {PERFILES.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                  </select>
                </td>
                <td style={{ padding: "12px", fontSize: 13, color: "#6b7280" }}>{u.entidad === "peru" ? "Perú" : "Selva"}</td>
                <td style={{ padding: "12px 20px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowPass(u); setNewPass(""); setMsg(""); setError("") }}
                      style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer" }}>
                      🔑 Contraseña
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo usuario */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Nuevo usuario</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Nombre *</label><input style={inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                <div><label style={lbl}>Apellido *</label><input style={inp} value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.email} placeholder="usuario@izango.com.pe" onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label style={lbl}>Contraseña inicial *</label><input style={inp} type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Perfil *</label>
                  <select style={inp} value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}>
                    {PERFILES.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Entidad</label>
                  <select style={inp} value={form.entidad} onChange={e => setForm({ ...form, entidad: e.target.value })}>
                    <option value="peru">Izango 360 SAC (Perú)</option>
                    <option value="selva">Izango Selva 360 SAC</option>
                  </select>
                </div>
              </div>
            </div>
            {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={crearUsuario} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Creando..." : "Crear usuario"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {showPass && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Cambiar contraseña</h2>
              <button onClick={() => setShowPass(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Usuario: <strong>{showPass.nombre} {showPass.apellido}</strong>
            </div>
            <div>
              <label style={lbl}>Nueva contraseña</label>
              <input style={inp} type="password" placeholder="Mínimo 6 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginTop: 12 }}>{error}</div>}
            {msg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginTop: 12 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowPass(null)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={cambiarPassword} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Actualizando..." : "Actualizar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}