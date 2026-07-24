"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { V2FullFormTemplate } from "@/components/v2/templates"
import { V2Button, V2PageHeader, V2SectionCard } from "@/components/v2/system"

type MensajeIA = { rol: "user" | "assistant"; contenido: string }
type PerfilIA = { id: string }
type ConversacionIA = { id: string; titulo?: string | null; updated_at: string }

export default function IAPage() {
  const supabase = useMemo(() => createClient(), [])
  const [mensajes, setMensajes] = useState<MensajeIA[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [perfil, setPerfil] = useState<PerfilIA | null>(null)
  const [conversacionId, setConversacionId] = useState<string|null>(null)
  const [conversaciones, setConversaciones] = useState<ConversacionIA[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [mensajes])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
        setPerfil(p)
        const { data: convs } = await supabase.from("ia_conversaciones").select("*").eq("usuario_id", user.id).order("updated_at", { ascending: false }).limit(20)
        setConversaciones(convs || [])
      }
      setLoadingHistorial(false)
    }
    init()
  }, [supabase])

  async function nuevaConversacion() {
    if (!perfil) return
    const { data } = await supabase.from("ia_conversaciones").insert({ usuario_id: perfil.id, titulo: "Nueva conversación" }).select().single()
    if (data) {
      setConversacionId(data.id)
      setMensajes([])
      setConversaciones(prev => [data, ...prev])
    }
  }

  async function cargarConversacion(id: string) {
    setConversacionId(id)
    const { data } = await supabase.from("ia_mensajes").select("*").eq("conversacion_id", id).order("created_at")
    setMensajes((data || []).map((m) => ({ rol: m.rol, contenido: m.contenido })))
  }

  async function enviar() {
    if (!input.trim() || loading || !perfil) return

    let convId = conversacionId
    if (!convId) {
      const { data } = await supabase.from("ia_conversaciones").insert({
        usuario_id: perfil.id,
        titulo: input.slice(0, 50)
      }).select().single()
      if (data) {
        convId = data.id
        setConversacionId(data.id)
        setConversaciones(prev => [data, ...prev])
      }
    }

    const nuevoMensaje: MensajeIA = { rol: "user", contenido: input }
    const nuevosMensajes = [...mensajes, nuevoMensaje]
    setMensajes(nuevosMensajes)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ia-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: nuevosMensajes, conversacion_id: convId })
      })
      const data = await res.json()
      if (data.respuesta) {
        setMensajes(prev => [...prev, { rol: "assistant", contenido: data.respuesta }])
        if (mensajes.length === 0 && convId) {
          await supabase.from("ia_conversaciones").update({ titulo: input.slice(0, 50) }).eq("id", convId)
          setConversaciones(prev => prev.map(c => c.id === convId ? { ...c, titulo: input.slice(0, 50) } : c))
        }
      } else {
        setMensajes(prev => [...prev, { rol: "assistant", contenido: "Error: " + (data.error || "No se pudo obtener respuesta") }])
      }
    } catch {
      setMensajes(prev => [...prev, { rol: "assistant", contenido: "Error de conexión. Intenta nuevamente." }])
    }
    setLoading(false)
  }

  const SUGERENCIAS = [
    "¿Cuáles son los proyectos activos y su estado?",
    "¿Qué RQs están pendientes de aprobación?",
    "¿Cuál es el margen promedio de las liquidaciones?",
    "¿Qué items del inventario están por debajo del stock mínimo?",
    "¿Hay vacaciones pendientes de aprobar?",
    "Resume el pipeline de CRM actual",
  ]

  return (
    <V2FullFormTemplate
      header={
        <V2PageHeader
          eyebrow="Inteligencia Artificial"
          title="Asistente Izango IA"
          subtitle="Consultas inteligentes con contexto operativo en tiempo real del ERP"
          actions={
            <V2Button variant="primary" onClick={nuevaConversacion}>
              + Nueva conversación
            </V2Button>
          }
        />
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, minHeight: "calc(100vh - 220px)" }}>
        {/* Historial conversations */}
        <V2SectionCard title="Historial">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {loadingHistorial ? (
              <div style={{ fontSize: 12, color: "var(--v2-muted)", textAlign: "center", padding: 12 }}>Cargando...</div>
            ) : conversaciones.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--v2-muted)", textAlign: "center", padding: 12 }}>Sin conversaciones previas</div>
            ) : (
              conversaciones.map(c => (
                <button
                  key={c.id}
                  onClick={() => cargarConversacion(c.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: "var(--v2-radius-sm)",
                    border: "1px solid " + (conversacionId === c.id ? "var(--v2-brand)" : "var(--v2-border)"),
                    background: conversacionId === c.id ? "var(--v2-surface-subtle)" : "var(--v2-surface)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: conversacionId === c.id ? "var(--v2-brand)" : "var(--v2-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.titulo || "Conversación"}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--v2-muted)", marginTop: 2 }}>{new Date(c.updated_at).toLocaleDateString("es-PE")}</div>
                </button>
              ))
            )}
          </div>
        </V2SectionCard>

        {/* Chat area */}
        <V2SectionCard title="Panel de Chat">
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, padding: "12px 0", overflowY: "auto", minHeight: 360, maxHeight: 500 }}>
              {mensajes.length === 0 && (
                <div style={{ textAlign: "center", maxWidth: 560, margin: "20px auto 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 12, color: "var(--v2-brand)" }}>✦</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "var(--v2-text)", marginBottom: 8 }}>¿En qué puedo ayudarte hoy?</div>
                  <div style={{ fontSize: 13, color: "var(--v2-muted)", marginBottom: 20 }}>Acceso directo a datos de proyectos, cotizaciones, inventario, RRHH y más.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {SUGERENCIAS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(s)}
                        style={{
                          padding: "10px 12px",
                          background: "var(--v2-surface-subtle)",
                          border: "1px solid var(--v2-border)",
                          borderRadius: "var(--v2-radius)",
                          fontSize: 12,
                          color: "var(--v2-text)",
                          cursor: "pointer",
                          textAlign: "left",
                          lineHeight: 1.4,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {mensajes.map((m, i) => (
                <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: m.rol === "user" ? "flex-end" : "flex-start" }}>
                  {m.rol === "assistant" && (
                    <div style={{ width: 28, height: 28, background: "var(--v2-brand)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0, marginTop: 2 }}>
                      <span style={{ color: "#fff", fontSize: 14 }}>✦</span>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "75%", padding: "10px 14px", borderRadius: m.rol === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.rol === "user" ? "var(--v2-brand)" : "var(--v2-surface-subtle)",
                    color: m.rol === "user" ? "#fff" : "var(--v2-text)",
                    fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
                    border: m.rol === "assistant" ? "1px solid var(--v2-border)" : "none"
                  }}>
                    {m.contenido}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, background: "var(--v2-brand)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: 14 }}>✦</span>
                  </div>
                  <div style={{ padding: "10px 14px", background: "var(--v2-surface-subtle)", borderRadius: "12px 12px 12px 2px", border: "1px solid var(--v2-border)", fontSize: 13, color: "var(--v2-muted)" }}>
                    Consultando datos del ERP...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ paddingTop: 14, borderTop: "1px solid var(--v2-border)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar() } }}
                  placeholder="Escribe tu consulta sobre el ERP... (Enter para enviar)"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid var(--v2-border)",
                    borderRadius: "var(--v2-radius)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    background: "var(--v2-surface)",
                    color: "var(--v2-text)",
                    resize: "none",
                    outline: "none",
                    minHeight: 44,
                    maxHeight: 120,
                    lineHeight: 1.5,
                  }}
                  rows={1}
                />
                <V2Button variant="primary" onClick={enviar} disabled={loading || !input.trim()}>
                  {loading ? "..." : "Enviar ↑"}
                </V2Button>
              </div>
              <div style={{ fontSize: 11, color: "var(--v2-muted)", marginTop: 6 }}>El asistente responde con datos reales del ERP.</div>
            </div>
          </div>
        </V2SectionCard>
      </div>
    </V2FullFormTemplate>
  )
}
