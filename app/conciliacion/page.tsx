"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const ESTADO_COLOR: Record<string, any> = {
  pendiente:   { bg: "#fef9c3", color: "#92400e", label: "Pendiente" },
  emitida:     { bg: "#dbeafe", color: "#1e40af", label: "Emitida" },
  cobrada:     { bg: "#dcfce7", color: "#15803d", label: "Cobrada" },
  conciliado:  { bg: "#f0fdf4", color: "#166534", label: "Conciliado ✓" },
  anulada:     { bg: "#fee2e2", color: "#991b1b", label: "Anulada" },
}

export default function ConciliacionPage() {
  const supabase = createClient()
  const [facturas, setFacturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "conciliados">("pendientes")
  const [busqueda, setBusqueda] = useState("")
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({ fecha_deposito: "", referencia_deposito: "" })
  const [perfil, setPerfil] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data } = await supabase
      .from("facturas")
      .select("*, proyecto:proyectos(nombre, codigo, cliente:clientes(razon_social))")
      .not("estado", "eq", "anulada")
      .order("fecha_emision", { ascending: false })
    setFacturas(data || [])
    setLoading(false)
  }

  async function conciliar(factura: any) {
    if (!form.fecha_deposito) { alert("Fecha de depósito es obligatoria"); return }
    setSaving(factura.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("facturas").update({
      conciliado: true,
      fecha_deposito: form.fecha_deposito,
      referencia_deposito: form.referencia_deposito || null,
      conciliado_at: new Date().toISOString(),
      conciliado_por: user?.id,
      estado: "cobrada",
    }).eq("id", factura.id)
    setSaving(null)
    setEditando(null)
    setForm({ fecha_deposito: "", referencia_deposito: "" })
    load()
  }

  async function desconciliar(facturaId: string) {
    if (!confirm("¿Deshacer la conciliación de esta factura?")) return
    await supabase.from("facturas").update({
      conciliado: false,
      fecha_deposito: null,
      referencia_deposito: null,
      conciliado_at: null,
      conciliado_por: null,
    }).eq("id", facturaId)
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }

  const filtradas = facturas.filter(f => {
    if (filtro === "pendientes" && f.conciliado) return false
    if (filtro === "conciliados" && !f.conciliado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!f.numero_factura?.toLowerCase().includes(q) && !f.proyecto?.cliente?.razon_social?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalCobrado = facturas.filter(f => f.conciliado).reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
  const totalPorConciliar = facturas.filter(f => !f.conciliado && f.estado === "cobrada").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
  const totalEmitido = facturas.filter(f => f.estado === "emitida").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
  const pendientesConciliar = facturas.filter(f => !f.conciliado && f.estado === "cobrada").length

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Conciliación bancaria</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Confirma qué facturas ya fueron depositadas en cuenta</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: "4px solid #059669" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Conciliado</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{fmt(totalCobrado)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{facturas.filter(f => f.conciliado).length} facturas confirmadas</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Por conciliar</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{fmt(totalPorConciliar)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{pendientesConciliar} facturas cobradas sin confirmar</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Emitidas (por cobrar)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>{fmt(totalEmitido)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{facturas.filter(f => f.estado === "emitida").length} facturas emitidas</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #0F6E56" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Total facturas</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F6E56" }}>{facturas.length}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>En el sistema</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {[
            { key: "pendientes", label: "Por conciliar" + (pendientesConciliar > 0 ? ` (${pendientesConciliar})` : "") },
            { key: "conciliados", label: "Conciliados" },
            { key: "todos", label: "Todos" },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as any)}
              style={{ padding: "6px 14px", border: "1px solid " + (filtro === f.key ? "#0F6E56" : "#e5e7eb"), borderRadius: 7, background: filtro === f.key ? "#0F6E56" : "#fff", color: filtro === f.key ? "#fff" : "#374151", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: filtro === f.key ? 700 : 400 }}>
              {f.label}
            </button>
          ))}
          <input style={{ ...inp, width: 240 }} placeholder="Buscar factura o cliente..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtradas.length} facturas</span>
        </div>
      </div>

      {/* Modal conciliación */}
      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Conciliar factura</h2>
              <button onClick={() => setEditando(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{editando.numero_factura}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{editando.proyecto?.cliente?.razon_social}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F6E56", marginTop: 4 }}>{fmt(editando.monto_final_abonado || 0)}</div>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>Fecha de depósito *</label>
                <input type="date" style={inp} value={form.fecha_deposito} onChange={e => setForm({ ...form, fecha_deposito: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>N° de operación / referencia</label>
                <input style={inp} value={form.referencia_deposito} placeholder="Ej: OP-2024-001234"
                  onChange={e => setForm({ ...form, referencia_deposito: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setEditando(null)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={() => conciliar(editando)} disabled={saving === editando.id} className="btn-primary" style={{ fontSize: 13 }}>
                {saving === editando.id ? "Guardando..." : "✓ Confirmar depósito"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla facturas */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtradas.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
            {filtro === "pendientes" ? "No hay facturas pendientes de conciliar 🎉" : "No hay facturas en este filtro"}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N° FACTURA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO / CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>EMISIÓN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DEPÓSITO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>REFERENCIA</th>
                <th style={{ padding: "10px 20px", width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f, idx) => {
                const ec = ESTADO_COLOR[f.conciliado ? "conciliado" : f.estado] || { bg: "#f3f4f6", color: "#6b7280", label: f.estado }
                return (
                  <tr key={f.id} style={{ borderTop: "1px solid #f3f4f6", background: f.conciliado ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{f.numero_factura}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{f.proyecto?.cliente?.razon_social || "—"}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{f.proyecto?.codigo} — {f.proyecto?.nombre}</div>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: f.conciliado ? "#059669" : "#0F6E56" }}>
                      {fmt(f.monto_final_abonado || 0)}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{ec.label}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{f.fecha_emision || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: f.fecha_deposito ? "#15803d" : "#9ca3af", fontWeight: f.fecha_deposito ? 600 : 400 }}>
                      {f.fecha_deposito || "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", fontFamily: f.referencia_deposito ? "monospace" : "inherit" }}>
                      {f.referencia_deposito || "—"}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      {f.conciliado ? (
                        <button onClick={() => desconciliar(f.id)}
                          style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fde68a", borderRadius: 6, background: "#fff", color: "#d97706", cursor: "pointer", fontFamily: "inherit" }}>
                          Deshacer
                        </button>
                      ) : (
                        <button onClick={() => { setEditando(f); setForm({ fecha_deposito: "", referencia_deposito: "" }) }}
                          className="btn-primary" style={{ fontSize: 12 }}>
                          ✓ Conciliar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}