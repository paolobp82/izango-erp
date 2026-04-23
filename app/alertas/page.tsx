"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const ALERTAS = [
  { key: "proyecto_creado", label: "Nuevo proyecto creado", desc: "Cuando se crea un nuevo proyecto en el sistema", icon: "📁" },
  { key: "rq_pendiente", label: "RQ pendiente de aprobacion", desc: "Cuando un requerimiento de pago necesita tu aprobacion", icon: "💳" },
  { key: "proyecto_facturacion", label: "Proyecto listo para facturar", desc: "Cuando un proyecto pasa a estado de facturacion", icon: "🧾" },
  { key: "proyecto_liquidado", label: "Proyecto liquidado", desc: "Cuando una liquidacion es aprobada y cerrada", icon: "✅" },
  { key: "cotizacion_aprobada", label: "Cotizacion aprobada por cliente", desc: "Cuando el cliente aprueba una proforma", icon: "🎯" },
]

export default function AlertasConfigPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)
    setEmail(user.email || "")
    const { data: cfg } = await supabase.from("alertas_config").select("*").eq("usuario_id", user.id).single()
    if (cfg) {
      setConfig(cfg)
      setEmail(cfg.email || user.email || "")
    } else {
      setConfig({
        proyecto_creado: false,
        rq_pendiente: true,
        proyecto_facturacion: true,
        proyecto_liquidado: false,
        cotizacion_aprobada: false,
      })
    }
    setLoading(false)
  }

  async function guardar() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { ...config, usuario_id: user.id, email, updated_at: new Date().toISOString() }
    const { data: existing } = await supabase.from("alertas_config").select("id").eq("usuario_id", user.id).single()
    if (existing) {
      await supabase.from("alertas_config").update(payload).eq("usuario_id", user.id)
    } else {
      await supabase.from("alertas_config").insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function probarEmail() {
    if (!email) { alert("Ingresa un email primero"); return }
    const res = await fetch("/api/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "proyecto_creado",
        destinatarios: [email],
        datos: { nombre: "Proyecto de prueba", codigo: "IZ-99999", cliente: "Cliente Ejemplo", creado_por: perfil?.nombre + " " + perfil?.apellido, proyecto_id: "test" }
      })
    })
    const data = await res.json()
    if (data.enviados > 0) alert("Email de prueba enviado a " + email)
    else alert("Error enviando email: " + JSON.stringify(data))
  }

  const toggle = (key: string) => setConfig((prev: any) => ({ ...prev, [key]: !prev[key] }))

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Alertas por email</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Configura qué notificaciones quieres recibir en tu correo
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", color: "#374151" }}>Email de notificaciones</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", flex: 1, outline: "none" }}
            type="email" value={email} placeholder="tu@email.com"
            onChange={e => setEmail(e.target.value)} />
          <button onClick={probarEmail}
            style={{ padding: "8px 16px", border: "1px solid #1D9E75", borderRadius: 8, background: "#fff", color: "#0F6E56", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Enviar prueba
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
          Las alertas se enviarán a este correo. Puedes cambiarlo en cualquier momento.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: "#374151" }}>Tipos de alerta</h2>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 0, marginBottom: 16 }}>Activa las notificaciones que quieres recibir</p>
        <div style={{ display: "grid", gap: 12 }}>
          {ALERTAS.map(a => (
            <div key={a.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: config?.[a.key] ? "#f0fdf4" : "#f9fafb", borderRadius: 10, border: "1px solid " + (config?.[a.key] ? "#bbf7d0" : "#e5e7eb"), cursor: "pointer", transition: "all 0.15s" }}
              onClick={() => toggle(a.key)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{a.desc}</div>
                </div>
              </div>
              <div style={{ position: "relative", width: 44, height: 24, flexShrink: 0 }}>
                <div style={{ width: 44, height: 24, borderRadius: 99, background: config?.[a.key] ? "#0F6E56" : "#d1d5db", transition: "background 0.2s" }} />
                <div style={{ position: "absolute", top: 2, left: config?.[a.key] ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
          {saving ? "Guardando..." : "Guardar configuracion"}
        </button>
        {saved && <span style={{ fontSize: 13, color: "#0F6E56", fontWeight: 600 }}>✓ Guardado correctamente</span>}
      </div>
    </div>
  )
}