"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const TIPO_COLOR: Record<string, any> = {
  info:    { bg: "#dbeafe", color: "#1e40af", icon: "ℹ️" },
  success: { bg: "#dcfce7", color: "#15803d", icon: "✅" },
  warning: { bg: "#fef9c3", color: "#92400e", icon: "⚠️" },
  error:   { bg: "#fee2e2", color: "#991b1b", icon: "❌" },
}

export default function Notificaciones({ usuarioId }: { usuarioId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    // Polling cada 30 segundos
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [usuarioId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function load() {
    const { data } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(20)
    setNotifs(data || [])
  }

  async function marcarLeida(id: string) {
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  async function marcarTodasLeidas() {
    await supabase.from("notificaciones").update({ leida: true }).eq("usuario_id", usuarioId).eq("leida", false)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
  }

  async function eliminar(id: string) {
    await supabase.from("notificaciones").delete().eq("id", id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  function timeAgo(date: string) {
    const diff = (Date.now() - new Date(date).getTime()) / 1000
    if (diff < 60) return "hace un momento"
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
    return `hace ${Math.floor(diff / 86400)} d`
  }

  const noLeidas = notifs.filter(n => !n.leida).length

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        {noLeidas > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, background: "#dc2626", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
              Notificaciones
              {noLeidas > 0 && <span style={{ marginLeft: 8, background: "#dc2626", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{noLeidas}</span>}
            </div>
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas} style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                Sin notificaciones
              </div>
            ) : notifs.map(n => {
              const t = TIPO_COLOR[n.tipo] || TIPO_COLOR.info
              return (
                <div key={n.id}
                  style={{ padding: "12px 16px", borderBottom: "1px solid #f9fafb", background: n.leida ? "#fff" : "#f0fdf4", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}
                  onClick={() => { marcarLeida(n.id); if (n.enlace) { setOpen(false); router.push(n.enlace) } }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{t.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.leida ? 400 : 700, color: "#111827", lineHeight: 1.4 }}>{n.titulo}</div>
                    {n.mensaje && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, lineHeight: 1.4 }}>{n.mensaje}</div>}
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    {!n.leida && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0F6E56", marginTop: 4 }} />
                    )}
                    <button onClick={e => { e.stopPropagation(); eliminar(n.id) }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 14, padding: 0 }}>×</button>
                  </div>
                </div>
              )
            })}
          </div>

          {notifs.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <button onClick={async () => { await supabase.from("notificaciones").delete().eq("usuario_id", usuarioId).eq("leida", true); load() }}
                style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Limpiar notificaciones leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}