"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"

const COSTOS_INTERNOS = [
  { key: "costo_almacenaje", label: "Almacenaje" },
  { key: "costo_impresion", label: "Impresion" },
  { key: "costo_permisos", label: "Permisos" },
  { key: "costo_instalacion", label: "Instalacion" },
  { key: "costo_performer", label: "Performer" },
  { key: "costo_alquiler", label: "Alquiler" },
  { key: "costo_supervision", label: "Supervision" },
  { key: "costo_movilidad", label: "Movilidad" },
]

function calcItem(form: any) {
  const costoTotal = COSTOS_INTERNOS.reduce((s, c) => s + (Number(form[c.key]) || 0), 0)
  const margenPct = Number(form.margen_pct) || 0
  const precioCliente = margenPct < 100 ? costoTotal / (1 - margenPct / 100) : costoTotal
  return { costoTotal, precioCliente }
}

const emptyForm = {
  descripcion: "", categoria: "", notas: "",
  margen_pct: 40, proveedor_id: "", proveedor_nombre: "",
  costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
  costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
}

export default function BibliotecaPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm] = useState<any>(emptyForm)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("items_biblioteca").select("*, proveedor:proveedores(nombre)").eq("activo", true).order("descripcion")
    setItems(data || [])
    const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre")
    setProveedores(provs || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function abrirEditar(item: any) {
    setEditando(item)
    setForm({
      descripcion: item.descripcion || "", categoria: item.categoria || "",
      notas: item.notas || "", margen_pct: item.margen_pct || 40,
      proveedor_id: item.proveedor_id || "", proveedor_nombre: item.proveedor_nombre || "",
      costo_almacenaje: item.costo_almacenaje || 0, costo_impresion: item.costo_impresion || 0,
      costo_permisos: item.costo_permisos || 0, costo_instalacion: item.costo_instalacion || 0,
      costo_performer: item.costo_performer || 0, costo_alquiler: item.costo_alquiler || 0,
      costo_supervision: item.costo_supervision || 0, costo_movilidad: item.costo_movilidad || 0,
    })
    setShowForm(true)
  }

  async function guardar() {
    if (!form.descripcion) { alert("La descripcion es obligatoria"); return }
    setSaving(true)
    const { costoTotal, precioCliente } = calcItem(form)
    const prov = proveedores.find(p => p.id === form.proveedor_id)
    const payload = {
      ...form,
      costo_total: costoTotal,
      precio_cliente: precioCliente,
      proveedor_id: form.proveedor_id || null,
      proveedor_nombre: prov?.nombre || form.proveedor_nombre || null,
    }
    if (editando) {
      await supabase.from("items_biblioteca").update(payload).eq("id", editando.id)
    } else {
      await supabase.from("items_biblioteca").insert(payload)
    }
    await registrarAccion({ accion: editando ? "editar" : "crear", modulo: "biblioteca", entidad_tipo: "item", descripcion: (editando ? "Item editado: " : "Item creado: ") + form.descripcion })
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function eliminar(id: string, desc: string) {
    if (!confirm("Eliminar item " + desc + "?")) return
    await supabase.from("items_biblioteca").update({ activo: false }).eq("id", id)
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const { costoTotal, precioCliente } = calcItem(form)
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  const filtrados = items.filter(i => !busqueda || i.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) || i.categoria?.toLowerCase().includes(busqueda.toLowerCase()))

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Biblioteca de items</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{items.length} items guardados</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo item</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar item" : "Nuevo item"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>DESCRIPCION *</label>
                  <input style={inp} value={form.descripcion} placeholder="Descripcion del item"
                    onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>CATEGORIA</label>
                  <input style={inp} value={form.categoria} placeholder="Ej: Impresion, RRHH"
                    onChange={e => setForm({ ...form, categoria: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={lbl}>PROVEEDOR</label>
                <select style={inp} value={form.proveedor_id}
                  onChange={e => {
                    const prov = proveedores.find(p => p.id === e.target.value)
                    setForm({ ...form, proveedor_id: e.target.value, proveedor_nombre: prov?.nombre || "" })
                  }}>
                  <option value="">Sin proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 8 }}>COSTOS INTERNOS</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {COSTOS_INTERNOS.map(cat => (
                    <div key={cat.key}>
                      <label style={{ ...lbl, fontSize: 10 }}>{cat.label.toUpperCase()}</label>
                      <input type="number" style={inp} value={form[cat.key] || ""}
                        placeholder="0" onChange={e => setForm({ ...form, [cat.key]: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>MARGEN %</label>
                  <input type="number" style={inp} value={form.margen_pct}
                    onChange={e => setForm({ ...form, margen_pct: Number(e.target.value) })} />
                </div>
                <div style={{ background: "#fef2f2", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 2 }}>COSTO TOTAL</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{fmt(costoTotal)}</div>
                </div>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 2 }}>PRECIO CLIENTE</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0F6E56" }}>{fmt(precioCliente)}</div>
                </div>
              </div>
              <div>
                <label style={lbl}>NOTAS</label>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.notas}
                  placeholder="Notas adicionales..."
                  onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : editando ? "Actualizar" : "Crear item"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <input style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: 280 }}
          placeholder="Buscar item..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay items. Crea el primero.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCION</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CATEGORIA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>COSTO</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MARGEN</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRECIO CLI.</th>
                <th style={{ padding: "10px 20px", width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item, idx) => (
                <tr key={item.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{item.descripcion}</div>
                    {item.notas && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{item.notas}</div>}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {item.categoria && <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{item.categoria}</span>}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{item.proveedor?.nombre || item.proveedor_nombre || "—"}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{fmt(item.costo_total)}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 600, color: item.margen_pct >= 35 ? "#0F6E56" : "#ca8a04" }}>{item.margen_pct}%</td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{fmt(item.precio_cliente)}</td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => abrirEditar(item)} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                      <button onClick={() => eliminar(item.id, item.descripcion)}
                        style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )

}