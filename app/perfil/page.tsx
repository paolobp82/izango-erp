"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function PerfilPage() {
  const supabase = createClient()
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [cargo, setCargo] = useState("")
  const [email, setEmail] = useState("")
  const [passNueva, setPassNueva] = useState("")
  const [passConfirmar, setPassConfirmar] = useState("")
  const [savingPass, setSavingPass] = useState(false)
  const [msgPass, setMsgPass] = useState("")
  const [errorPass, setErrorPass] = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil({ ...p, email: user.email })
      setNombre(p?.nombre || "")
      setApellido(p?.apellido || "")
      setCargo(p?.cargo || "")
      setEmail(user.email || "")
    }
    setLoading(false)
  }

  async function guardarPerfil() {
    setSaving(true)
    setMsg("")
    setError("")
    const { error } = await supabase.from("perfiles").update({ nombre, apellido, cargo }).eq("id", perfil.id)
    if (error) { setError("Error al guardar: " + error.message) }
    else { setMsg("Perfil actualizado correctamente") }
    setSaving(false)
  }

  async function cambiarPassword() {
    setSavingPass(true)
    setMsgPass("")
    setErrorPass("")
    if (passNueva !== passConfirmar) { setErrorPass("Las contraseñas no coinciden"); setSavingPass(false); return }
    if (passNueva.length < 6) { setErrorPass("Mínimo 6 caracteres"); setSavingPass(false); return }
    const res = await fetch("/api/admin/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: perfil.id, password: passNueva })
    })
    const data = await res.json()
    if (data.error) { setErrorPass(data.error) }
    else { setMsgPass("Contraseña actualizada correctamente"); setPassNueva(""); setPassConfirmar("") }
    setSavingPass(false)
  }

  const PERFIL_LABEL: any = {
    superadmin: "Super Administrador", gerente_general: "Gerente General",
    administrador: "Administrador", controller: "Controller",
    productor: "Productor", logistica: "Logística",
    practicante: "Practicante", comercial: "Comercial",
    gerente_produccion: "Gerente de Producción", gerente_finanzas: "Gerente de Finanzas",
  }

  const PERFIL_COLOR: any = {
    superadmin: { bg: "#1D2040", color: "#03E373" },
    gerente_general: { bg: "#1D2040", color: "#03E373" },
    administrador: { bg: "#dbeafe", color: "#1e40af" },
    controller: { bg: "#ede9fe", color: "#7c3aed" },
    productor: { bg: "#d1fae5", color: "#065f46" },
    logistica: { bg: "#fef3c7", color: "#92400e" },
    practicante: { bg: "#f3f4f6", color: "#374151" },
    comercial: { bg: "#fce7f3", color: "#9d174d" },
    gerente_produccion: { bg: "#d1fae5", color: "#065f46" },
    gerente_finanzas: { bg: "#dbeafe", color: "#1e40af" },
  }

  const inp: any = { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none", boxSizing: "border-box" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  const pc = PERFIL_COLOR[perfil?.perfil] || { bg: "#f3f4f6", color: "#374151" }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Mi perfil</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Gestiona tu información personal y contraseña</p>
      </div>

      {/* Avatar y rol */}
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#03E373", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#1D2040", flexShrink: 0 }}>
          {nombre?.[0]}{apellido?.[0]}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{nombre} {apellido}</div>
          {cargo && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{cargo}</div>}
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{email}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ background: pc.bg, color: pc.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
              {PERFIL_LABEL[perfil?.perfil] || perfil?.perfil}
            </span>
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px 0", color: "#111827" }}>Datos personales</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>Nombre</label><input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} /></div>
          <div><label style={lbl}>Apellido</label><input style={inp} value={apellido} onChange={e => setApellido(e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Cargo / Puesto</label>
          <input style={inp} value={cargo} placeholder="Ej: Director Comercial, Productor Senior..." onChange={e => setCargo(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Email</label>
          <input style={{ ...inp, background: "#f9fafb", color: "#9ca3af" }} value={email} disabled />
        </div>
        {msg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{msg}</div>}
        {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button onClick={guardarPerfil} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Cambiar contraseña */}
      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px 0", color: "#111827" }}>Cambiar contraseña</h2>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={lbl}>Nueva contraseña</label>
            <input style={inp} type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={passNueva} onChange={e => setPassNueva(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Confirmar nueva contraseña</label>
            <input style={inp} type="password" autoComplete="new-password" placeholder="Repite la contraseña" value={passConfirmar} onChange={e => setPassConfirmar(e.target.value)} />
          </div>
        </div>
        {msgPass && <div style={{ background: "#d1fae5", color: "#065f46", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginTop: 12 }}>{msgPass}</div>}
        {errorPass && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginTop: 12 }}>{errorPass}</div>}
        <button onClick={cambiarPassword} disabled={savingPass} className="btn-primary" style={{ fontSize: 13, marginTop: 16 }}>
          {savingPass ? "Actualizando..." : "Cambiar contraseña"}
        </button>
      </div>
    </div>
  )
}