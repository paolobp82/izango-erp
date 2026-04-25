"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const CATEGORIAS = ["activo", "consumible", "material"]
const UNIDADES = ["unidad", "kg", "metro", "litro", "caja", "par", "juego"]

export default function InventarioPage() {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [ubicaciones, setUbicaciones] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroBusqueda, setFiltroBusqueda] = useState("")
  const [variantes, setVariantes] = useState<string[]>([])
  const [form, setForm] = useState({
    nombre: "", descripcion: "", categoria: "activo", unidad: "unidad",
    tiene_variantes: false, stock_minimo: 0, cliente_id: "", foto_url: ""
  })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: its }, { data: ubs }, { data: cls }] = await Promise.all([
      supabase.from("inventario_items").select("*, cliente:clientes(razon_social), inventario_stock_sin_variante(cantidad, ubicacion:inventario_ubicaciones(nombre))").eq("activo", true).order("nombre"),
      supabase.from("inventario_ubicaciones").select("*").eq("activo", true),
      supabase.from("clientes").select("id, razon_social").order("razon_social"),
    ])
    setItems(its || [])
    setUbicaciones(ubs || [])
    setClientes(cls || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setVariantes([])
    setForm({ nombre: "", descripcion: "", categoria: "activo", unidad: "unidad", tiene_variantes: false, stock_minimo: 0, cliente_id: "", foto_url: "" })
    setShowForm(true)
  }

  function abrirEditar(item: any) {
    setEditando(item)
    setForm({
      nombre: item.nombre, descripcion: item.descripcion || "", categoria: item.categoria,
      unidad: item.unidad, tiene_variantes: item.tiene_variantes, stock_minimo: item.stock_minimo || 0,
      cliente_id: item.cliente_id || "", foto_url: item.foto_url || ""
    })
    setVariantes([])
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nombre) { alert("Nombre es obligatorio"); return }
    setSaving(true)
    const payload = { ...form, cliente_id: form.cliente_id || null, updated_at: new Date().toISOString() }
    if (editando) {
      await supabase.from("inventario_items").update(payload).eq("id", editando.id)
    } else {
      const { data: item } = await supabase.from("inventario_items").insert({ ...payload, activo: true }).select().single()
      if (item && form.tiene_variantes && variantes.filter(v => v.trim()).length > 0) {
        const vars = variantes.filter(v => v.trim()).map(v => ({ item_id: item.id, nombre: v.trim() }))
        await supabase.from("inventario_variantes").insert(vars)
      }
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Desactivar este item?")) return
    await supabase.from("inventario_items").update({ activo: false }).eq("id", id)
    load()
  }

  const itemsFiltrados = items.filter(i => {
    const matchCat = !filtroCategoria || i.categoria === filtroCategoria
    const matchBus = !filtroBusqueda || i.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())
    return matchCat && matchBus
  })

  const getStockTotal = (item: any) => {
    if (!item.inventario_stock_sin_variante) return 0
    return item.inventario_stock_sin_variante.reduce((s: number, st: any) => s + (st.cantidad || 0), 0)
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Inventario</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{items.length} items registrados</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/inventario/ordenes")} className="btn-secondary" style={{ fontSize: 13 }}>📋 Ordenes</button>
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo item</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input style={{ ...inp, maxWidth: 280 }} placeholder="Buscar item..." value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} />
        <select style={{ ...inp, maxWidth: 160 }} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Cards de stock por ubicación */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {ubicaciones.map(ub => {
          const total = items.reduce((s, i) => {
            const st = i.inventario_stock_sin_variante?.find((x: any) => x.ubicacion?.nombre === ub.nombre)
            return s + (st?.cantidad || 0)
          }, 0)
          return (
            <div key={ub.id} className="card" style={{ padding: "14px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>{ub.nombre}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{total}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>items en stock</div>
            </div>
          )
        })}
      </div>

      {/* Tabla items */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {itemsFiltrados.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay items. Crea el primero.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ITEM</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CATEGORÍA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CLIENTE</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>STOCK TOTAL</th>
                {ubicaciones.map(ub => (
                  <th key={ub.id} style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{ub.nombre.toUpperCase()}</th>
                ))}
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>STOCK MÍN.</th>
                <th style={{ padding: "10px 20px", width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.map((item, idx) => {
                const stockTotal = getStockTotal(item)
                const bajominimo = stockTotal <= (item.stock_minimo || 0) && item.stock_minimo > 0
                return (
                  <tr key={item.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {item.foto_url ? (
                          <img src={item.foto_url} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{item.nombre}</div>
                          {item.descripcion && <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.descripcion}</div>}
                          {item.tiene_variantes && <span style={{ fontSize: 10, color: "#7c3aed", background: "#ede9fe", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>Con variantes</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: item.categoria === "activo" ? "#dbeafe" : item.categoria === "consumible" ? "#fef3c7" : "#f0fdf4", color: item.categoria === "activo" ? "#1e40af" : item.categoria === "consumible" ? "#92400e" : "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{item.categoria}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{item.cliente?.razon_social || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: bajominimo ? "#dc2626" : "#111827" }}>{stockTotal}</span>
                      {bajominimo && <div style={{ fontSize: 10, color: "#dc2626" }}>⚠ Stock bajo</div>}
                    </td>
                    {ubicaciones.map(ub => {
                      const st = item.inventario_stock_sin_variante?.find((x: any) => x.ubicacion?.nombre === ub.nombre)
                      return <td key={ub.id} style={{ padding: "12px", textAlign: "center", fontSize: 13, color: "#475569" }}>{st?.cantidad || 0}</td>
                    })}
                    <td style={{ padding: "12px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>{item.stock_minimo || 0}</td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => abrirEditar(item)} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                        <button onClick={() => eliminar(item.id)} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editando ? "Editar item" : "Nuevo item"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input style={inp} value={form.nombre} placeholder="Nombre del item" onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <input style={inp} value={form.descripcion} placeholder="Descripción opcional" onChange={e => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Categoría</label>
                  <select style={inp} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Unidad</label>
                  <select style={inp} value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Stock mínimo</label>
                  <input style={inp} type="number" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label style={lbl}>Cliente (si es de cliente)</label>
                  <select style={inp} value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                    <option value="">Propio de Izango</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>URL Fotografía</label>
                <input style={inp} value={form.foto_url} placeholder="https://..." onChange={e => setForm({ ...form, foto_url: e.target.value })} />
              </div>
              {!editando && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                    <input type="checkbox" checked={form.tiene_variantes} onChange={e => setForm({ ...form, tiene_variantes: e.target.checked })} style={{ width: 15, height: 15 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Tiene variantes (tallas, medidas, pesos)</span>
                  </label>
                  {form.tiene_variantes && (
                    <div>
                      <label style={lbl}>Variantes (una por línea)</label>
                      <textarea style={{ ...inp, height: 80, resize: "vertical" }}
                        placeholder="S&#10;M&#10;L&#10;XL"
                        value={variantes.join("\n")}
                        onChange={e => setVariantes(e.target.value.split("\n"))} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear item"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}