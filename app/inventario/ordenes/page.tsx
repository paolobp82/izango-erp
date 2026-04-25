"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const TIPOS = ["salida", "ingreso", "devolucion", "traslado"]
const ESTADOS = ["borrador", "aprobada", "ejecutada", "cerrada", "cancelada"]

export default function OrdenesInventarioPage() {
  const supabase = createClient()
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [ubicaciones, setUbicaciones] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [ordenItems, setOrdenItems] = useState<any[]>([{ item_id: "", variante_id: "", cantidad_solicitada: 1 }])
  const [variantes, setVariantes] = useState<Record<string, any[]>>({})
  const [form, setForm] = useState({
    tipo: "salida", proyecto_id: "", ubicacion_origen_id: "", ubicacion_destino_id: "",
    direccion_destino: "", contacto_receptor: "", dni_receptor: "", telefono_receptor: "",
    transportista: "", vehiculo_placa: "", fecha_entrega: "", fecha_retorno_esperada: "", notas: ""
  })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: ords }, { data: its }, { data: ubs }, { data: pros }] = await Promise.all([
      supabase.from("inventario_ordenes").select("*, proyecto:proyectos(nombre,codigo), ubicacion_origen:inventario_ubicaciones!ubicacion_origen_id(nombre), ubicacion_destino:inventario_ubicaciones!ubicacion_destino_id(nombre), solicitado:perfiles!solicitado_por(nombre,apellido), inventario_orden_items(*, item:inventario_items(nombre))").order("created_at", { ascending: false }),
      supabase.from("inventario_items").select("*, inventario_variantes(*)").eq("activo", true).order("nombre"),
      supabase.from("inventario_ubicaciones").select("*").eq("activo", true),
      supabase.from("proyectos").select("id, nombre, codigo").order("nombre"),
    ])
    setOrdenes(ords || [])
    setItems(its || [])
    setUbicaciones(ubs || [])
    setProyectos(pros || [])
    setLoading(false)
  }

  async function cargarVariantes(itemId: string) {
    if (variantes[itemId]) return
    const { data } = await supabase.from("inventario_variantes").select("*").eq("item_id", itemId)
    setVariantes(prev => ({ ...prev, [itemId]: data || [] }))
  }

  function agregarItem() {
    setOrdenItems(prev => [...prev, { item_id: "", variante_id: "", cantidad_solicitada: 1 }])
  }

  function updateOrdenItem(idx: number, field: string, value: any) {
    setOrdenItems(prev => prev.map((oi, i) => {
      if (i !== idx) return oi
      if (field === "item_id") { cargarVariantes(value); return { ...oi, item_id: value, variante_id: "" } }
      return { ...oi, [field]: value }
    }))
  }

  function removeOrdenItem(idx: number) {
    setOrdenItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardar() {
    if (!form.tipo) { alert("Tipo es obligatorio"); return }
    if (ordenItems.filter(oi => oi.item_id).length === 0) { alert("Agrega al menos un item"); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      ...form,
      proyecto_id: form.proyecto_id || null,
      ubicacion_origen_id: form.ubicacion_origen_id || null,
      ubicacion_destino_id: form.ubicacion_destino_id || null,
      solicitado_por: user?.id,
      estado: "borrador"
    }
    const { data: orden } = await supabase.from("inventario_ordenes").insert(payload).select().single()
    if (orden) {
      const ois = ordenItems.filter(oi => oi.item_id).map(oi => ({
        orden_id: orden.id,
        item_id: oi.item_id,
        variante_id: oi.variante_id || null,
        cantidad_solicitada: parseInt(oi.cantidad_solicitada) || 1,
        cantidad_despachada: 0,
        cantidad_devuelta: 0,
      }))
      await supabase.from("inventario_orden_items").insert(ois)
    }
    setSaving(false)
    setShowForm(false)
    setOrdenItems([{ item_id: "", variante_id: "", cantidad_solicitada: 1 }])
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from("inventario_ordenes").update({ estado, updated_at: new Date().toISOString() }).eq("id", id)
    if (estado === "ejecutada") await ejecutarOrden(id)
    load()
  }

  async function ejecutarOrden(ordenId: string) {
    const { data: orden } = await supabase.from("inventario_ordenes").select("*, inventario_orden_items(*)").eq("id", ordenId).single()
    if (!orden) return
    const { data: { user } } = await supabase.auth.getUser()
    for (const oi of orden.inventario_orden_items) {
      if (orden.tipo === "salida" || orden.tipo === "devolucion" || orden.tipo === "traslado") {
        const { data: stock } = await supabase.from("inventario_stock_sin_variante").select("*").eq("item_id", oi.item_id).eq("ubicacion_id", orden.ubicacion_origen_id).single()
        if (stock) {
          await supabase.from("inventario_stock_sin_variante").update({ cantidad: Math.max(0, stock.cantidad - oi.cantidad_solicitada) }).eq("id", stock.id)
        }
      }
      if (orden.tipo === "ingreso" || orden.tipo === "traslado") {
        const { data: stock } = await supabase.from("inventario_stock_sin_variante").select("*").eq("item_id", oi.item_id).eq("ubicacion_id", orden.ubicacion_destino_id).single()
        if (stock) {
          await supabase.from("inventario_stock_sin_variante").update({ cantidad: stock.cantidad + oi.cantidad_solicitada }).eq("id", stock.id)
        } else {
          await supabase.from("inventario_stock_sin_variante").insert({ item_id: oi.item_id, ubicacion_id: orden.ubicacion_destino_id, cantidad: oi.cantidad_solicitada })
        }
      }
      await supabase.from("inventario_movimientos").insert({
        item_id: oi.item_id, variante_id: oi.variante_id || null,
        ubicacion_origen_id: orden.ubicacion_origen_id, ubicacion_destino_id: orden.ubicacion_destino_id,
        orden_id: ordenId, tipo: orden.tipo, cantidad: oi.cantidad_solicitada,
        proyecto_id: orden.proyecto_id || null, usuario_id: user?.id,
      })
    }
    await supabase.from("inventario_ordenes").update({ cantidad_despachada: orden.inventario_orden_items[0]?.cantidad_solicitada }).eq("id", ordenId)
  }

  const ESTADO_COLOR: any = {
    borrador: { bg: "#f3f4f6", color: "#6b7280" },
    aprobada: { bg: "#dbeafe", color: "#1e40af" },
    ejecutada: { bg: "#d1fae5", color: "#065f46" },
    cerrada: { bg: "#f0fdf4", color: "#15803d" },
    cancelada: { bg: "#fee2e2", color: "#dc2626" },
  }

  const TIPO_ICON: any = { salida: "📤", ingreso: "📥", devolucion: "🔄", traslado: "🚚" }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  const ordenesFiltradas = ordenes.filter(o => {
    const matchTipo = !filtroTipo || o.tipo === filtroTipo
    const matchEstado = !filtroEstado || o.estado === filtroEstado
    return matchTipo && matchEstado
  })

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Órdenes de Inventario</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{ordenes.length} órdenes registradas</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/inventario" className="btn-secondary" style={{ fontSize: 13, textDecoration: "none", padding: "7px 14px", borderRadius: 7 }}>← Inventario</a>
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva orden</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select style={{ ...inp, maxWidth: 160 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>
        <select style={{ ...inp, maxWidth: 160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {ordenesFiltradas.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay órdenes. Crea la primera.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ORDEN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESTINO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ITEMS</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ padding: "10px 20px", width: 180 }}></th>
              </tr>
            </thead>
            <tbody>
              {ordenesFiltradas.map((orden, idx) => {
                const ec = ESTADO_COLOR[orden.estado] || ESTADO_COLOR.borrador
                return (
                  <tr key={orden.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", fontFamily: "monospace" }}>{orden.numero_orden}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(orden.created_at).toLocaleDateString("es-PE")}</div>
                      {orden.fecha_entrega && <div style={{ fontSize: 11, color: "#6b7280" }}>Entrega: {orden.fecha_entrega}</div>}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontSize: 13 }}>{TIPO_ICON[orden.tipo]} {orden.tipo}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>
                      {orden.proyecto ? `${orden.proyecto.codigo} — ${orden.proyecto.nombre}` : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>
                      <div>{orden.direccion_destino || orden.ubicacion_destino?.nombre || "—"}</div>
                      {orden.contacto_receptor && <div style={{ fontSize: 11 }}>Recibe: {orden.contacto_receptor}</div>}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>
                      {orden.inventario_orden_items?.map((oi: any) => (
                        <div key={oi.id}>{oi.item?.nombre} × {oi.cantidad_solicitada}</div>
                      ))}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{orden.estado}</span>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {orden.estado === "borrador" && <button onClick={() => cambiarEstado(orden.id, "aprobada")} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #dbeafe", borderRadius: 6, background: "#fff", color: "#1e40af", cursor: "pointer" }}>Aprobar</button>}
                        {orden.estado === "aprobada" && <button onClick={() => cambiarEstado(orden.id, "ejecutada")} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#065f46", cursor: "pointer" }}>Ejecutar</button>}
                        {orden.estado === "ejecutada" && orden.tipo === "salida" && <button onClick={() => cambiarEstado(orden.id, "cerrada")} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#15803d", cursor: "pointer" }}>Cerrar</button>}
                        {orden.estado === "borrador" && <button onClick={() => cambiarEstado(orden.id, "cancelada")} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>Cancelar</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Nueva orden</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Tipo *</label>
                  <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Proyecto</label>
                  <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                    <option value="">Sin proyecto</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Ubicación origen</label>
                  <select style={inp} value={form.ubicacion_origen_id} onChange={e => setForm({ ...form, ubicacion_origen_id: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Ubicación destino</label>
                  <select style={inp} value={form.ubicacion_destino_id} onChange={e => setForm({ ...form, ubicacion_destino_id: e.target.value })}>
                    <option value="">Seleccionar o ingresar dirección</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Dirección de entrega (si no es almacén)</label>
                <input style={inp} value={form.direccion_destino} placeholder="Dirección del evento o punto de entrega" onChange={e => setForm({ ...form, direccion_destino: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Contacto receptor</label>
                  <input style={inp} value={form.contacto_receptor} placeholder="Nombre" onChange={e => setForm({ ...form, contacto_receptor: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>DNI receptor</label>
                  <input style={inp} value={form.dni_receptor} placeholder="DNI" onChange={e => setForm({ ...form, dni_receptor: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>Teléfono receptor</label>
                  <input style={inp} value={form.telefono_receptor} placeholder="9xxxxxxxx" onChange={e => setForm({ ...form, telefono_receptor: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Transportista</label>
                  <input style={inp} value={form.transportista} placeholder="Nombre o empresa" onChange={e => setForm({ ...form, transportista: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>Placa vehículo</label>
                  <input style={inp} value={form.vehiculo_placa} placeholder="ABC-123" onChange={e => setForm({ ...form, vehiculo_placa: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>Fecha entrega</label>
                  <input style={inp} type="date" value={form.fecha_entrega} onChange={e => setForm({ ...form, fecha_entrega: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={lbl}>Fecha retorno esperada</label>
                <input style={inp} type="date" value={form.fecha_retorno_esperada} onChange={e => setForm({ ...form, fecha_retorno_esperada: e.target.value })} />
              </div>

              {/* Items */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={lbl}>Items *</label>
                  <button onClick={agregarItem} style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>+ Agregar</button>
                </div>
                {ordenItems.map((oi, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                    <div>
                      <label style={lbl}>Item</label>
                      <select style={inp} value={oi.item_id} onChange={e => updateOrdenItem(i, "item_id", e.target.value)}>
                        <option value="">Seleccionar item</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Variante</label>
                      <select style={inp} value={oi.variante_id} onChange={e => updateOrdenItem(i, "variante_id", e.target.value)} disabled={!oi.item_id}>
                        <option value="">Sin variante</option>
                        {(variantes[oi.item_id] || []).map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Cant.</label>
                      <input style={inp} type="number" min="1" value={oi.cantidad_solicitada} onChange={e => updateOrdenItem(i, "cantidad_solicitada", e.target.value)} />
                    </div>
                    <button onClick={() => removeOrdenItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, paddingBottom: 4 }}>×</button>
                  </div>
                ))}
              </div>

              <div>
                <label style={lbl}>Notas</label>
                <textarea style={{ ...inp, height: 60, resize: "vertical" }} value={form.notas} placeholder="Notas adicionales" onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : "Crear orden"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}