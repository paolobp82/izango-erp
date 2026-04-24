"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const TIPOS = ["evento", "cliente", "campaña", "linea_negocio", "otro"]
const TIPO_COLOR: Record<string, any> = {
  evento:        { bg: "#dbeafe", color: "#1e40af" },
  cliente:       { bg: "#dcfce7", color: "#15803d" },
  campaña:       { bg: "#f5f3ff", color: "#6d28d9" },
  linea_negocio: { bg: "#fed7aa", color: "#9a3412" },
  otro:          { bg: "#f3f4f6", color: "#6b7280" },
}

export default function CentroCostosPage() {
  const supabase = createClient()
  const [centros, setCentros] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [rqs, setRqs] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({ nombre: "", tipo: "evento", descripcion: "", presupuesto: "" })
  const [itemForm, setItemForm] = useState({ tipo: "egreso", descripcion: "", monto: "", fecha: "", proyecto_id: "", rq_id: "", factura_id: "" })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: cs }, { data: ps }, { data: rs }, { data: fs }] = await Promise.all([
      supabase.from("centro_costos").select("*").eq("activo", true).order("nombre"),
      supabase.from("proyectos").select("id, nombre, codigo").order("created_at", { ascending: false }).limit(20),
      supabase.from("requerimientos_pago").select("id, numero_rq, descripcion, monto_solicitado").eq("estado", "pagado").limit(50),
      supabase.from("facturas").select("id, numero_factura, monto_final_abonado").limit(50),
    ])
    setCentros(cs || [])
    setProyectos(ps || [])
    setRqs(rs || [])
    setFacturas(fs || [])
    setLoading(false)
  }

  async function loadItems(centroId: string) {
    const { data } = await supabase.from("centro_costos_items").select("*, proyecto:proyectos(nombre,codigo)").eq("centro_id", centroId).order("fecha", { ascending: false })
    setItems(data || [])
  }

  async function guardarCentro() {
    if (!form.nombre) { alert("Nombre es obligatorio"); return }
    setSaving(true)
    if (editando) {
      await supabase.from("centro_costos").update({ ...form, presupuesto: Number(form.presupuesto) || 0 }).eq("id", editando.id)
    } else {
      await supabase.from("centro_costos").insert({ ...form, presupuesto: Number(form.presupuesto) || 0 })
    }
    setSaving(false)
    setShowForm(false)
    setEditando(null)
    setForm({ nombre: "", tipo: "evento", descripcion: "", presupuesto: "" })
    load()
  }

  async function guardarItem() {
    if (!itemForm.descripcion || !itemForm.monto || !selected) return
    setSaving(true)
    await supabase.from("centro_costos_items").insert({
      centro_id: selected.id,
      tipo: itemForm.tipo,
      descripcion: itemForm.descripcion,
      monto: Number(itemForm.monto),
      fecha: itemForm.fecha || null,
      proyecto_id: itemForm.proyecto_id || null,
      rq_id: itemForm.rq_id || null,
      factura_id: itemForm.factura_id || null,
    })
    setSaving(false)
    setShowItemForm(false)
    setItemForm({ tipo: "egreso", descripcion: "", monto: "", fecha: "", proyecto_id: "", rq_id: "", factura_id: "" })
    loadItems(selected.id)
    load()
  }

  async function eliminarCentro(id: string) {
    if (!confirm("¿Eliminar este centro de costos?")) return
    await supabase.from("centro_costos").update({ activo: false }).eq("id", id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function eliminarItem(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return
    await supabase.from("centro_costos_items").delete().eq("id", id)
    loadItems(selected.id)
  }

  function abrirEditar(centro: any) {
    setEditando(centro)
    setForm({ nombre: centro.nombre, tipo: centro.tipo, descripcion: centro.descripcion || "", presupuesto: centro.presupuesto || "" })
    setShowForm(true)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  // Calcular totales por centro
  const getCentroTotales = async (centroId: string) => {
    const { data } = await supabase.from("centro_costos_items").select("tipo, monto").eq("centro_id", centroId)
    const ingresos = (data || []).filter(i => i.tipo === "ingreso").reduce((s, i) => s + i.monto, 0)
    const egresos = (data || []).filter(i => i.tipo === "egreso").reduce((s, i) => s + i.monto, 0)
    return { ingresos, egresos, neto: ingresos - egresos }
  }

  const totalPresupuesto = centros.reduce((s, c) => s + (c.presupuesto || 0), 0)
  const ingresosMes = items.filter(i => i.tipo === "ingreso").reduce((s, i) => s + i.monto, 0)
  const egresosMes = items.filter(i => i.tipo === "egreso").reduce((s, i) => s + i.monto, 0)

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Centro de costos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Agrupa gastos e ingresos por tipo de evento o cliente</p>
        </div>
        <button onClick={() => { setEditando(null); setForm({ nombre: "", tipo: "evento", descripcion: "", presupuesto: "" }); setShowForm(true) }}
          className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo centro</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: "4px solid #0F6E56" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Centros activos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F6E56" }}>{centros.length}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Presupuesto total</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>{fmt(totalPresupuesto)}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #d97706" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Tipos de centro</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#d97706" }}>{new Set(centros.map(c => c.tipo)).size}</div>
        </div>
      </div>

      {/* Modales */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar centro" : "Nuevo centro de costos"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div><label style={lbl}>Nombre *</label><input style={inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Presupuesto S/</label><input type="number" style={inp} value={form.presupuesto} onChange={e => setForm({ ...form, presupuesto: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Descripcion</label><textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarCentro} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "..." : editando ? "Actualizar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {showItemForm && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Agregar movimiento</h2>
              <button onClick={() => setShowItemForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={inp} value={itemForm.tipo} onChange={e => setItemForm({ ...itemForm, tipo: e.target.value })}>
                    <option value="egreso">Egreso</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                </div>
                <div><label style={lbl}>Monto S/ *</label><input type="number" style={inp} value={itemForm.monto} onChange={e => setItemForm({ ...itemForm, monto: e.target.value })} /></div>
                <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={itemForm.fecha} onChange={e => setItemForm({ ...itemForm, fecha: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Descripcion *</label><input style={inp} value={itemForm.descripcion} placeholder="Concepto del movimiento" onChange={e => setItemForm({ ...itemForm, descripcion: e.target.value })} /></div>
              <div>
                <label style={lbl}>Proyecto vinculado</label>
                <select style={inp} value={itemForm.proyecto_id} onChange={e => setItemForm({ ...itemForm, proyecto_id: e.target.value })}>
                  <option value="">Sin proyecto</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowItemForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarItem} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "..." : "Agregar"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "300px 1fr" : "1fr", gap: 16 }}>
        {/* Lista centros */}
        <div className="card" style={{ padding: 0, overflow: "hidden", alignSelf: "start" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 600, color: "#374151" }}>Centros de costos</div>
          {centros.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay centros. Crea el primero.</div>
          ) : centros.map((c, idx) => {
            const tc = TIPO_COLOR[c.tipo] || { bg: "#f3f4f6", color: "#6b7280" }
            return (
              <div key={c.id} onClick={() => { setSelected(c); loadItems(c.id) }}
                style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: selected?.id === c.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{c.nombre}</div>
                    <span style={{ background: tc.bg, color: tc.color, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "capitalize" }}>{c.tipo}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {c.presupuesto > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#0F6E56" }}>{fmt(c.presupuesto)}</div>}
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <button onClick={e => { e.stopPropagation(); abrirEditar(c) }} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
                      <button onClick={e => { e.stopPropagation(); eliminarCentro(c.id) }} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid #fee2e2", borderRadius: 4, background: "#fff", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {selected && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>{selected.nombre}</h2>
                  {selected.descripcion && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{selected.descripcion}</p>}
                </div>
                <button onClick={() => setShowItemForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Agregar movimiento</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #2563eb" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>Presupuesto</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#2563eb" }}>{fmt(selected.presupuesto || 0)}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #059669" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>Ingresos</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>{fmt(ingresosMes)}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #dc2626" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>Egresos</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{fmt(egresosMes)}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid " + (ingresosMes - egresosMes >= 0 ? "#059669" : "#dc2626") }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>Neto</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: ingresosMes - egresosMes >= 0 ? "#059669" : "#dc2626" }}>{fmt(ingresosMes - egresosMes)}</div>
                </div>
              </div>
              {selected.presupuesto > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                    <span>Ejecución presupuestal</span>
                    <span>{Math.min(100, Math.round(egresosMes / selected.presupuesto * 100))}%</span>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.min(100, egresosMes / selected.presupuesto * 100) + "%", background: egresosMes > selected.presupuesto ? "#dc2626" : "#0F6E56", borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 600, color: "#374151" }}>Movimientos ({items.length})</div>
              {items.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay movimientos. Agrega el primero.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCION</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHA</th>
                      <th style={{ padding: "10px 20px", width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.descripcion}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{item.proyecto?.codigo || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: item.tipo === "ingreso" ? "#dcfce7" : "#fee2e2", color: item.tipo === "ingreso" ? "#15803d" : "#991b1b", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                            {item.tipo === "ingreso" ? "↑ Ingreso" : "↓ Egreso"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: item.tipo === "ingreso" ? "#059669" : "#dc2626" }}>
                          {item.tipo === "ingreso" ? "+" : "-"}{fmt(item.monto)}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>{item.fecha || "—"}</td>
                        <td style={{ padding: "10px 20px", textAlign: "right" }}>
                          <button onClick={() => eliminarItem(item.id)} style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #fee2e2", borderRadius: 5, background: "#fff", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}