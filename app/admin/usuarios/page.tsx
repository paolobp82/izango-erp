"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  type V2TableColumn,
} from "@/components/v2/system"
import styles from "./Usuarios.module.css"

const PERFILES = ["superadmin","gerente_general","administrador","controller","productor","logistica","practicante","comercial","gerente_produccion"]
const PERFIL_LABEL: any = {
  superadmin:"Super Administrador", gerente_general:"Gerente General",
  administrador:"Administrador", controller:"Controller",
  productor:"Productor", logistica:"Logística",
  practicante:"Practicante", comercial:"Comercial",
  gerente_produccion:"Gerente de Producción",
}

export default function AdminUsuariosPage() {
  const supabase = createClient()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPass, setShowPass] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [autorizado, setAutorizado] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [newPass, setNewPass] = useState("")
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", password: "", perfil: "productor", entidad: "peru"
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const puedeVer = ["superadmin", "gerente_general", "controller"].includes(p?.perfil)
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const { data } = await supabase.from("perfiles").select("*").order("apellido")
    setUsuarios(data || [])
    setLoading(false)
  }

  async function crearUsuario() {
    if (perfil?.perfil !== "superadmin") return
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
    if (perfil?.perfil !== "superadmin") return
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
    if (perfil?.perfil !== "superadmin") return
    setSaving(true)
    setMsg("")
    setError("")

    const res = await fetch("/api/admin/cambiar-rol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: id, nuevo_perfil: nuevoPerfil })
    })

    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setMsg(data.message || "Rol actualizado correctamente")
      await load()
    }

    setSaving(false)
  }

  const esAdmin = autorizado
  const puedeCambiarRoles = perfil?.perfil === "superadmin"

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ color: "var(--v2-muted)", fontSize: 13, fontWeight: 600 }}>Cargando...</div>
      </div>
    )
  }

  if (!esAdmin) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--v2-text)", marginBottom: 6 }}>Acceso no autorizado</div>
          <div style={{ fontSize: 13, color: "var(--v2-muted)" }}>No tienes permisos para ver esta sección.</div>
        </div>
      </div>
    )
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: V2TableColumn<any>[] = [
    {
      key: "usuario",
      header: "Usuario",
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--v2-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--v2-accent-ink)", flexShrink: 0 }}>
            {u.nombre?.[0]}{u.apellido?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>{u.nombre} {u.apellido}</div>
            <div style={{ fontSize: 11, color: "var(--v2-subtle)" }}>{u.id.slice(0, 8)}...</div>
          </div>
        </div>
      ),
    },
    {
      key: "perfil",
      header: "Perfil",
      render: (u) => (
        <select
          value={u.perfil}
          disabled={!puedeCambiarRoles || saving}
          onChange={e => cambiarPerfil(u.id, e.target.value)}
          style={{ padding: "5px 8px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius-sm)", fontSize: 12, fontFamily: "inherit", background: "var(--v2-surface)", cursor: puedeCambiarRoles ? "pointer" : "default" }}
        >
          {PERFILES.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
        </select>
      ),
    },
    {
      key: "entidad",
      header: "Entidad",
      render: (u) => (
        <span style={{ fontSize: 13, color: "var(--v2-muted)" }}>
          {u.entidad === "peru" ? "Perú" : "Selva"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (u) => (
        <V2Button
          variant="ghost"
          size="compact"
          onClick={() => { setShowPass(u); setNewPass(""); setMsg(""); setError("") }}
        >
          🔑 Contraseña
        </V2Button>
      ),
    },
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Administración"
            title="Gestión de Usuarios"
            subtitle={`${usuarios.length} usuarios registrados`}
            actions={
              <V2Button
                variant="primary"
                onClick={() => { setShowForm(true); setMsg(""); setError("") }}
              >
                + Nuevo usuario
              </V2Button>
            }
          />
        }
        table={
          <>
            {msg && (
              <div className={styles.successMsg}>{msg}</div>
            )}

            {/* Desktop table */}
            <div className={styles.tableContainer}>
              <V2DataTable
                columns={columns}
                rows={usuarios}
                getRowKey={(u) => u.id}
                loading={false}
                empty={
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                    No hay usuarios registrados.
                  </div>
                }
              />
            </div>

            {/* Mobile cards */}
            <div className={styles.cardsContainer}>
              {usuarios.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--v2-muted)", fontSize: 13, padding: "32px 0" }}>
                  No hay usuarios registrados.
                </div>
              ) : usuarios.map(u => (
                <div key={u.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.avatar}>
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </div>
                    <div>
                      <p className={styles.cardName}>{u.nombre} {u.apellido}</p>
                      <p className={styles.cardId}>{u.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Perfil</span>
                    <select
                      value={u.perfil}
                      disabled={!puedeCambiarRoles || saving}
                      onChange={e => cambiarPerfil(u.id, e.target.value)}
                      style={{ padding: "4px 8px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius-sm)", fontSize: 12, fontFamily: "inherit", background: "var(--v2-surface)" }}
                    >
                      {PERFILES.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                    </select>
                  </div>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Entidad</span>
                    <span style={{ fontSize: 12, color: "var(--v2-muted)" }}>{u.entidad === "peru" ? "Perú" : "Selva"}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <V2Button
                      variant="ghost"
                      size="compact"
                      onClick={() => { setShowPass(u); setNewPass(""); setMsg(""); setError("") }}
                    >
                      🔑 Contraseña
                    </V2Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        }
      />

      {/* ── Modal: Nuevo usuario ─────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 500, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Nuevo usuario</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
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
            {error && <div style={{ background: "var(--v2-danger-bg)", color: "var(--v2-danger)", padding: "8px 12px", borderRadius: "var(--v2-radius)", fontSize: 13, marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={crearUsuario} disabled={saving}>{saving ? "Creando..." : "Crear usuario"}</V2Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cambiar contraseña ─────────────────────────────────────── */}
      {showPass && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 400, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Cambiar contraseña</h2>
              <button onClick={() => setShowPass(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: "var(--v2-muted)", marginBottom: 16 }}>
              Usuario: <strong style={{ color: "var(--v2-text)" }}>{showPass.nombre} {showPass.apellido}</strong>
            </div>
            <div>
              <label style={lbl}>Nueva contraseña</label>
              <input style={inp} type="password" placeholder="Mínimo 6 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            {error && <div style={{ background: "var(--v2-danger-bg)", color: "var(--v2-danger)", padding: "8px 12px", borderRadius: "var(--v2-radius)", fontSize: 13, marginTop: 12 }}>{error}</div>}
            {msg && <div style={{ background: "var(--v2-success-bg)", color: "var(--v2-success)", padding: "8px 12px", borderRadius: "var(--v2-radius)", fontSize: 13, marginTop: 12 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowPass(null)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={cambiarPassword} disabled={saving}>{saving ? "Actualizando..." : "Actualizar"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
