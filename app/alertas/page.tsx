"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { V2FullFormTemplate } from "@/components/v2/templates"
import { V2Button, V2PageHeader, V2SectionCard } from "@/components/v2/system"

const ALERTAS = [
  { key: "proyecto_creado", label: "Nuevo proyecto creado", desc: "Cuando se crea un nuevo proyecto en el sistema", icon: "📁" },
  { key: "rq_pendiente", label: "RQ pendiente de aprobación", desc: "Cuando un requerimiento de pago necesita tu aprobación", icon: "💳" },
  { key: "proyecto_facturacion", label: "Proyecto listo para facturar", desc: "Cuando un proyecto pasa a estado de facturación", icon: "🧾" },
  { key: "proyecto_liquidado", label: "Proyecto liquidado", desc: "Cuando una liquidación es aprobada y cerrada", icon: "✅" },
  { key: "cotizacion_aprobada", label: "Cotización aprobada por cliente", desc: "Cuando el cliente aprueba una cotización", icon: "🎯" },
  { key: "tarea_nueva_email", label: "Nuevas tareas", desc: "Cuando alguien te asigna una tarea", icon: "📌" },
  { key: "tarea_comentario_email", label: "Comentarios en tareas", desc: "Cuando alguien comenta una tarea donde participas", icon: "💬" },
  { key: "tarea_estado_email", label: "Cambios de estado de tareas", desc: "Cuando una tarea se envía a revisión, se devuelve o se completa", icon: "🔁" },
  { key: "tarea_resumen_diario_email", label: "Resumen diario de tareas", desc: "Resumen diario a las 8:00 am cuando exista job programado", icon: "📬" },
]

export default function AlertasConfigPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)

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
        tarea_nueva_email: true,
        tarea_comentario_email: true,
        tarea_estado_email: true,
        tarea_resumen_diario_email: false,
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando configuración de alertas...
      </div>
    )
  }

  return (
    <V2FullFormTemplate
      header={
        <V2PageHeader
          eyebrow="Configuración"
          title="Alertas por email"
          subtitle="Configura qué notificaciones deseas recibir en tu correo electrónico"
        />
      }
      actions={
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <V2Button variant="primary" onClick={guardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </V2Button>
          {saved && (
            <span style={{ fontSize: 13, color: "var(--v2-success)", fontWeight: 600 }}>
              ✓ Guardado correctamente
            </span>
          )}
        </div>
      }
    >
      <div style={{ display: "grid", gap: 20, maxWidth: 680 }}>
        <V2SectionCard title="Email de notificaciones">
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
            <input
              style={{
                padding: "8px 12px",
                border: "1px solid var(--v2-border)",
                borderRadius: "var(--v2-radius)",
                fontSize: 13,
                fontFamily: "inherit",
                background: "var(--v2-surface)",
                color: "var(--v2-text)",
                flex: 1,
                outline: "none",
              }}
              type="email"
              value={email}
              placeholder="tu@email.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <V2Button variant="secondary" onClick={probarEmail}>
              Enviar prueba
            </V2Button>
          </div>
          <p style={{ fontSize: 12, color: "var(--v2-muted)", marginTop: 8, marginBottom: 0 }}>
            Las alertas se enviarán a este correo. Puedes cambiarlo en cualquier momento.
          </p>
        </V2SectionCard>

        <V2SectionCard title="Tipos de alerta">
          <p style={{ fontSize: 12, color: "var(--v2-muted)", marginTop: -4, marginBottom: 16 }}>
            Activa las notificaciones que deseas recibir automáticamente
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {ALERTAS.map((a) => (
              <div
                key={a.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: config?.[a.key] ? "var(--v2-success-subtle, #f0fdf4)" : "var(--v2-surface-subtle, #f9fafb)",
                  borderRadius: "var(--v2-radius)",
                  border: `1px solid ${config?.[a.key] ? "var(--v2-success-border, #bbf7d0)" : "var(--v2-border)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onClick={() => toggle(a.key)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--v2-text)" }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: "var(--v2-muted)", marginTop: 2 }}>{a.desc}</div>
                  </div>
                </div>
                <div style={{ position: "relative", width: 44, height: 24, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 99,
                      background: config?.[a.key] ? "var(--v2-brand, #0F6E56)" : "#d1d5db",
                      transition: "background 0.2s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      left: config?.[a.key] ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      transition: "left 0.2s",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </V2SectionCard>
      </div>
    </V2FullFormTemplate>
  )
}
