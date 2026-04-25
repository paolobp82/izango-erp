"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"

export default function IAPage() {
  const supabase = createClient()
  const [mensajes, setMensajes] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [conversacionId, setConversacionId] = useState<string|null>(null)
  const [conversaciones, setConversaciones] = useState<any[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [mensajes])

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
    setMensajes((data || []).map((m: any) => ({ rol: m.rol, contenido: m.contenido })))
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

    const nuevoMensaje = { rol: "user", contenido: input }
    const nuevosMensajes = [...mensajes, nuevoMensaje]
    setMensajes(nuevosMensajes)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ia-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: nuevosMensajes, conversacion_id: convId, perfil_id: perfil.id })
      })
      const data = await res.json()
      if (data.respuesta) {
        setMensajes(prev => [...prev, { rol: "assistant", contenido: data.respuesta }])
        // Actualizar titulo si es el primer mensaje
        if (mensajes.length === 0 && convId) {
          await supabase.from("ia_conversaciones").update({ titulo: input.slice(0, 50) }).eq("id", convId)
          setConversaciones(prev => prev.map(c => c.id === convId ? { ...c, titulo: input.slice(0, 50) } : c))
        }
      } else {
        setMensajes(prev => [...prev, { rol: "assistant", contenido: "Error: " + (data.error || "No se pudo obtener respuesta") }])
      }
    } catch (err) {
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
    <div style={{ display: "flex", height: "calc(100vh - 80px)", gap: 0 }}>
      {/* Sidebar conversaciones */}
      <div style={{ width: 260, borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", background: "#fafafa" }}>
        <div style={{ padding: "16px 12px", borderBottom: "1px solid #f3f4f6" }}>
          <button onClick={nuevaConversacion} style={{ width: "100%", padding: "8px 12px", background: "#1D2040", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Nueva conversación
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {loadingHistorial ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 16 }}>Cargando...</div>
          ) : conversaciones.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 16 }}>Sin conversaciones previas</div>
          ) : (
            conversaciones.map(c => (
              <button key={c.id} onClick={() => cargarConversacion(c.id)}
                style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7, border: "none", background: conversacionId === c.id ? "#E1F5EE" : "transparent", cursor: "pointer", marginBottom: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: conversacionId === c.id ? "#04342C" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.titulo || "Conversación"}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(c.updated_at).toLocaleDateString("es-PE")}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Area de chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "#1D2040", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#03E373", fontSize: 18 }}>✦</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Asistente Izango IA</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Powered by Claude — con contexto real del ERP</div>
          </div>
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {mensajes.length === 0 && (
            <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>¿En qué puedo ayudarte?</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Tengo acceso a los datos reales del ERP — proyectos, cotizaciones, inventario, RRHH y más.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUGERENCIAS.map((s, i) => (
                  <button key={i} onClick={() => setInput(s)}
                    style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#374151", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mensajes.map((m, i) => (
            <div key={i} style={{ marginBottom: 20, display: "flex", justifyContent: m.rol === "user" ? "flex-end" : "flex-start" }}>
              {m.rol === "assistant" && (
                <div style={{ width: 28, height: 28, background: "#1D2040", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: "#03E373", fontSize: 14 }}>✦</span>
                </div>
              )}
              <div style={{
                maxWidth: "70%", padding: "12px 16px", borderRadius: m.rol === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: m.rol === "user" ? "#1D2040" : "#f8fafc",
                color: m.rol === "user" ? "#fff" : "#111827",
                fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
                border: m.rol === "assistant" ? "1px solid #e2e8f0" : "none"
              }}>
                {m.contenido}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, background: "#1D2040", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#03E373", fontSize: 14 }}>✦</span>
              </div>
              <div style={{ padding: "10px 16px", background: "#f8fafc", borderRadius: "12px 12px 12px 2px", border: "1px solid #e2e8f0", fontSize: 13, color: "#9ca3af" }}>
                Consultando datos del ERP...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar() } }}
              placeholder="Pregunta algo sobre el ERP... (Enter para enviar, Shift+Enter para nueva línea)"
              style={{ flex: 1, padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", minHeight: 44, maxHeight: 120, lineHeight: 1.5 }}
              rows={1}
            />
            <button onClick={enviar} disabled={loading || !input.trim()}
              style={{ padding: "10px 20px", background: loading || !input.trim() ? "#e2e8f0" : "#1D2040", border: "none", borderRadius: 10, color: loading || !input.trim() ? "#9ca3af" : "#fff", fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "default" : "pointer", whiteSpace: "nowrap" }}>
              {loading ? "..." : "Enviar ↑"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>El asistente tiene acceso a datos reales del ERP en tiempo real.</div>
        </div>
      </div>
    </div>
  )
}