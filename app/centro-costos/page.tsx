"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const TIPOS = ["evento", "cliente", "campaña", "linea_negocio", "produccion", "movilidad", "personal", "materiales", "otro"]
const TIPO_COLOR: Record<string, any> = {
  evento:        { bg: "#dbeafe", color: "#1e40af" },
  cliente:       { bg: "#dcfce7", color: "#15803d" },
  campaña:       { bg: "#f5f3ff", color: "#6d28d9" },
  linea_negocio: { bg: "#fed7aa", color: "#9a3412" },
  produccion:    { bg: "#fce7f3", color: "#9d174d" },
  movilidad:     { bg: "#e0f2fe", color: "#0369a1" },
  personal:      { bg: "#fef9c3", color: "#92400e" },
  materiales:    { bg: "#f0fdf4", color: "#166534" },
  otro:          { bg: "#f3f4f6", color: "#6b7280" },
}

export default function CentroCostosPage() {
  const supabase = createClient()
  const [centros, setCentros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [itemsDetalle, setItemsDetalle] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({ nombre: "", tipo: "evento", descripcion: "", presupuesto: "" })

  useEffect(() => { load() }, [])

  async function load() {
    // Traer centros con suma ejecutado desde cotizacion_items aprobados
    const { data: cs } = await supabase
      .from("centro_costos")
      .select("*")
      .eq("activo", true)
      .order("nombre")
    setCentros(cs || [])
    setLoading(false)
  }

  async function loadDetalle(centroId: string) {
    const { data } = await supabase
      .from("cotizacion_items")
      .select("*, cotizacion:cotizaciones(version, estado, proyecto:proyectos(nombre, codigo))")
      .eq("centro_costo_id", centroId)
      .not("cotizacion.estado", "is", null)
      .order("created_at", { ascending: false })
    setItemsDetalle(data || [])
  }

  async function guardarCentro() {
    if (!form.nombre) { alert("Nombre es obligatorio"); return }
    setSaving(true)
    if (editando) {
      await supabase.from("centro_costos").update({ ...form, presupuesto: Number(form.presupuesto) || 0 }).eq("id", editando.id)
    } else {
      await supabase.from("centro_costos").insert({ ...form, presupuesto: Number(form.presupuesto) || 0, ejecutado: 0 })
    }
    setSaving(false)
    setShowForm(false)
    setEditando(null)
    setForm({ nombre: "", tipo: "evento", descripcion: "", presupuesto: "" })
    load()
  }

  async function eliminarCentro(id: string) {
    if (!confirm("¿Eliminar este centro de costos?")) return
    await supabase.from("centro_costos").update({ activo: false }).eq("id", id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  function abrirEditar(centro: any) {
    setEditando(centro)
    setForm({ nombre: centro.nombre, tipo: centro.tipo, descripcion: centro.descripcion || "", presupuesto: centro.presupuesto || "" })
    setShowForm(true)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  const totalPresupuesto = centros.reduce((s, c) => s + (c.presupuesto || 0), 0)
  const totalEjecutado = centros.reduce((s, c) => s + (c.ejecutado || 0), 0)
  const totalSaldo = totalPresupuesto - totalEjecutado

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Centro de costos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Presupuesto vs ejecutado por categoría. Los costos se actualizan automáticamente al aprobar cotizaciones.
          </p>
        </div>
        <button onClick={() => { setEditando(null); setForm({ nombre: "", tipo: "evento", descripcion: "", presupuesto: "" }); setShowForm(true) }}
          className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo centro</button>
      </div>

      {/* KPIs globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: "4px solid #0F6E56" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Centros activos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F6E56" }}>{centros.length}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Presupuesto total</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb" }}>{fmt(totalPresupuesto)}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #dc2626" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Ejecutado total</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{fmt(totalEjecutado)}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid " + (totalSaldo >= 0 ? "#059669" : "#dc2626") }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Saldo disponible</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalSaldo >= 0 ? "#059669" : "#dc2626" }}>{fmt(totalSaldo)}</div>
        </div>
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar centro" : "Nuevo centro de costos"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div><label style={lbl}>Nombre *</label><input style={inp} value={form.nombre} placeholder="Ej: Movilidad, Personal, Materiales" onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Presupuesto S/</label><input type="number" style={inp} value={form.presupuesto} placeholder="0.00" onChange={e => setForm({ ...form, presupuesto: e.target.value })} /></div>
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

      {/* Tabla principal presupuesto vs ejecutado */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Presupuesto vs Ejecutado</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Los costos ejecutados se actualizan al aprobar cotizaciones</div>
        </div>
        {centros.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
            No hay centros de costos. Crea el primero para empezar a trackear gastos.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CENTRO DE COSTOS</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#2563eb" }}>PRESUPUESTO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#dc2626" }}>EJECUTADO</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>SALDO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>EJECUCIÓN</th>
                <th style={{ padding: "10px 20px", width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {centros.map((c, idx) => {
                const tc = TIPO_COLOR[c.tipo] || { bg: "#f3f4f6", color: "#6b7280" }
                const presupuesto = c.presupuesto || 0
                const ejecutado = c.ejecutado || 0
                const saldo = presupuesto - ejecutado
                const pct = presupuesto > 0 ? Math.min(100, (ejecutado / presupuesto) * 100) : 0
                const sobreEjecutado = ejecutado > presupuesto && presupuesto > 0
                return (
                  <tr key={c.id} style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === c.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", cursor: "pointer" }}
                        onClick={() => { setSelected(c); loadDetalle(c.id) }}>
                        {c.nombre}
                      </div>
                      {c.descripcion && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{c.descripcion}</div>}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: tc.bg, color: tc.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{c.tipo}</span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#2563eb" }}>{presupuesto > 0 ? fmt(presupuesto) : "—"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: sobreEjecutado ? "#dc2626" : "#374151" }}>{ejecutado > 0 ? fmt(ejecutado) : "—"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: saldo >= 0 ? "#059669" : "#dc2626" }}>
                      {presupuesto > 0 ? fmt(saldo) : "—"}
                    </td>
                    <td style={{ padding: "12px", minWidth: 160 }}>
                      {presupuesto > 0 ? (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 3 }}>
                            <span>{pct.toFixed(0)}% ejecutado</span>
                            {sobreEjecutado && <span style={{ color: "#dc2626", fontWeight: 700 }}>⚠ Sobre presupuesto</span>}
                          </div>
                          <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: pct + "%", background: sobreEjecutado ? "#dc2626" : pct > 80 ? "#f59e0b" : "#0F6E56", borderRadius: 4 }} />
                          </div>
                        </div>
                      ) : <span style={{ fontSize: 11, color: "#9ca3af" }}>Sin presupuesto</span>}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => { setSelected(c); loadDetalle(c.id) }} className="btn-secondary" style={{ fontSize: 12 }}>Ver</button>
                        <button onClick={() => abrirEditar(c)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>✎</button>
                        <button onClick={() => eliminarCentro(c.id)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                <td colSpan={2} style={{ padding: "12px 20px", fontWeight: 700, fontSize: 13, color: "#374151" }}>TOTALES</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, fontSize: 14, color: "#2563eb" }}>{fmt(totalPresupuesto)}</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, fontSize: 14, color: "#dc2626" }}>{fmt(totalEjecutado)}</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, fontSize: 14, color: totalSaldo >= 0 ? "#059669" : "#dc2626" }}>{fmt(totalSaldo)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Panel detalle del centro seleccionado */}
      {selected && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F6E56" }}>
              Detalle — {selected.nombre}
              <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8, fontWeight: 400 }}>Ítems de cotizaciones vinculados a este centro</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
          </div>
          {itemsDetalle.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              No hay ítems vinculados a este centro aún. Asigna este centro en los ítems de cotizaciones para trackear costos.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCIÓN</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>COTIZACIÓN</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>COSTO</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRECIO CLIENTE</th>
                  <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO COT.</th>
                </tr>
              </thead>
              <tbody>
                {itemsDetalle.map((item, idx) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.descripcion || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#374151" }}>{item.cotizacion?.proyecto?.codigo} — {item.cotizacion?.proyecto?.nombre}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>V{item.cotizacion?.version}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{fmt(item.costo_total || 0)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#0F6E56" }}>{fmt(item.precio_cliente || 0)}</td>
                    <td style={{ padding: "10px 20px" }}>
                      <span style={{ background: item.cotizacion?.estado === "aprobada_cliente" ? "#dcfce7" : "#fef9c3", color: item.cotizacion?.estado === "aprobada_cliente" ? "#15803d" : "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                        {item.cotizacion?.estado || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Instrucciones */}
      <div style={{ marginTop: 16, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>¿Cómo funciona?</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          1. Crea centros de costos con su presupuesto asignado (ej: "Movilidad — S/ 5,000")<br />
          2. Al crear ítems en una cotización, asigna cada ítem a un centro de costos<br />
          3. Cuando la cotización es aprobada por el cliente, los costos se suman automáticamente al campo "Ejecutado"<br />
          4. Esta tabla muestra en tiempo real: Presupuesto vs Ejecutado vs Saldo disponible
        </div>
      </div>
    </div>
  )
}