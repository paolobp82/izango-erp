"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
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
  { key: "costo_otros", label: "Otros" },
]

const CENTROS_COSTOS_DEFAULT = ["Produccion", "Administracion", "Comercial", "Logistica", "Marketing", "RRHH", "Tecnologia", "Gerencia"]

function calcItem(form: any) {
  const costoTotal = COSTOS_INTERNOS.reduce((s, c) => s + (Number(form[c.key]) || 0), 0)
  // Si hay precio cliente manual, calcular margen desde precio
  if (form.precio_cliente_manual && Number(form.precio_cliente_manual) > 0) {
    const precioManual = Number(form.precio_cliente_manual)
    const margenCalculado = costoTotal > 0 ? ((precioManual - costoTotal) / precioManual) * 100 : 0
    return { costoTotal, precioCliente: precioManual, margenCalculado }
  }
  const margenPct = Number(form.margen_pct) || 0
  const precioCliente = margenPct < 100 ? costoTotal / (1 - margenPct / 100) : costoTotal
  return { costoTotal, precioCliente, margenCalculado: margenPct }
}

const emptyForm = {
  descripcion: "", categoria: "", notas: "", centro_costos: "",
  margen_pct: 40, precio_cliente_manual: "", proveedor_id: "", proveedor_nombre: "",
  costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
  costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
  costo_otros: 0,
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
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [form, setForm] = useState<any>(emptyForm)
  const [categorias, setCategorias] = useState<string[]>([])
  const [nuevaCategoria, setNuevaCategoria] = useState("")
  const [showNuevaCategoria, setShowNuevaCategoria] = useState(false)
  const [loadError, setLoadError] = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    setLoadError("")
    const { data, error } = await supabase
      .from("items_biblioteca")
      .select("*, proveedor:proveedores(nombre)")
      .or("activo.eq.true,activo.is.null")
      .order("descripcion")
    if (error) {
      console.error("Error cargando Biblioteca de items:", error)
      setLoadError(error.message || "No se pudo cargar la Biblioteca de items.")
      setItems([])
    } else {
      setItems(data || [])
    }
    // Extraer categorias unicas de los items
    const cats = Array.from(new Set((data || []).map((i: any) => i.categoria).filter(Boolean))) as string[]
    setCategorias(cats)
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
      notas: item.notas || "", centro_costos: item.centro_costos || "",
      margen_pct: item.margen_pct || 40,
      precio_cliente_manual: item.precio_cliente_manual || "",
      proveedor_id: item.proveedor_id || "", proveedor_nombre: item.proveedor_nombre || "",
      costo_almacenaje: item.costo_almacenaje || 0, costo_impresion: item.costo_impresion || 0,
      costo_permisos: item.costo_permisos || 0, costo_instalacion: item.costo_instalacion || 0,
      costo_performer: item.costo_performer || 0, costo_alquiler: item.costo_alquiler || 0,
      costo_supervision: item.costo_supervision || 0, costo_movilidad: item.costo_movilidad || 0,
      costo_otros: item.costo_otros || 0,
    })
    setShowForm(true)
  }

  function agregarCategoria() {
    if (!nuevaCategoria.trim()) return
    const cat = nuevaCategoria.trim()
    if (!categorias.includes(cat)) setCategorias(prev => [...prev, cat].sort())
    setForm({ ...form, categoria: cat })
    setNuevaCategoria("")
    setShowNuevaCategoria(false)
  }

  async function guardar() {
    if (!form.descripcion) { alert("La descripcion es obligatoria"); return }
    setSaving(true)
    const { costoTotal, precioCliente, margenCalculado } = calcItem(form)
    const prov = proveedores.find(p => p.id === form.proveedor_id)
    const payload = {
      ...form,
      costo_total: costoTotal,
      precio_cliente: precioCliente,
      margen_pct: Math.round(margenCalculado * 10) / 10,
      precio_cliente_manual: form.precio_cliente_manual ? Number(form.precio_cliente_manual) : null,
      proveedor_id: form.proveedor_id || null,
      proveedor_nombre: prov?.nombre || form.proveedor_nombre || null,
      centro_costos: form.centro_costos || null,
    }
    if (editando) {
      await supabase.from("items_biblioteca").update(payload).eq("id", editando.id)
    } else {
      await supabase.from("items_biblioteca").insert({ ...payload, activo: true })
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
  const { costoTotal, precioCliente, margenCalculado } = calcItem(form)
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  const todasCategorias = Array.from(new Set([...CENTROS_COSTOS_DEFAULT, ...categorias])).sort()
  const filtrados = items.filter(i => {
    if (filtroCategoria && i.categoria !== filtroCategoria) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const coincide = [
        i.descripcion,
        i.categoria,
        i.origen_proyecto_nombre,
        i.origen_proyecto_codigo,
        i.origen_cotizacion_version ? `proforma v${i.origen_cotizacion_version}` : "",
        i.origen_fecha ? new Date(i.origen_fecha).toLocaleDateString("es-PE") : "",
        i.proveedor?.nombre,
        i.proveedor_nombre,
      ].some(valor => String(valor || "").toLowerCase().includes(q))
      if (!coincide) return false
    }
    return true
  })
  const categoriasItems = Array.from(new Set(items.map(i => i.categoria).filter(Boolean))) as string[]

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Biblioteca de items</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{items.length} items guardados</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ImportExport modulo="biblioteca" campos={[{key:"descripcion",label:"Descripcion",requerido:true},{key:"categoria",label:"Categoria"},{key:"centro_costos",label:"Centro costos"},{key:"costo_almacenaje",label:"Costo almacenaje"},{key:"costo_impresion",label:"Costo impresion"},{key:"costo_alquiler",label:"Costo alquiler"},{key:"margen_pct",label:"Margen %"},{key:"proveedor_nombre",label:"Proveedor"}]} datos={items} onImportar={async (registros) => { let exitosos=0; const errores:string[]=[]; for(const r of registros){const costoTotal=(Number(r.costo_almacenaje)||0)+(Number(r.costo_impresion)||0)+(Number(r.costo_alquiler)||0); const margen=Number(r.margen_pct)||40; const precioCliente=margen<100?costoTotal/(1-margen/100):costoTotal; const{error}=await supabase.from("items_biblioteca").insert({...r,costo_total:costoTotal,precio_cliente:precioCliente,activo:true}); if(error)errores.push(r.descripcion+": "+error.message); else exitosos++;} load(); return{exitosos,errores}; }} />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo item</button>
        </div>
      </div>

      {loadError && (
        <div style={{ padding: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          No se pudo cargar la Biblioteca de items: {loadError}
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar item" : "Nuevo item"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>

              {/* Descripcion y categoria */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>DESCRIPCION *</label>
                  <input style={inp} value={form.descripcion} placeholder="Descripcion del item"
                    onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>CATEGORIA</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <select style={{ ...inp, flex: 1 }} value={form.categoria}
                      onChange={e => {
                        if (e.target.value === "__nueva__") setShowNuevaCategoria(true)
                        else setForm({ ...form, categoria: e.target.value })
                      }}>
                      <option value="">Sin categoria</option>
                      {categoriasItems.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__nueva__">+ Nueva categoria</option>
                    </select>
                  </div>
                  {showNuevaCategoria && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      <input style={{ ...inp, flex: 1 }} value={nuevaCategoria} placeholder="Nueva categoria..."
                        onChange={e => setNuevaCategoria(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && agregarCategoria()} />
                      <button onClick={agregarCategoria}
                        style={{ padding: "6px 10px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                        OK
                      </button>
                      <button onClick={() => setShowNuevaCategoria(false)}
                        style={{ padding: "6px 8px", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#6b7280" }}>
                        x
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Centro de costos y proveedor */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>CENTRO DE COSTOS</label>
                  <select style={inp} value={form.centro_costos}
                    onChange={e => setForm({ ...form, centro_costos: e.target.value })}>
                    <option value="">Sin centro de costos</option>
                    {CENTROS_COSTOS_DEFAULT.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
              </div>

              {/* Costos internos */}
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

              {/* Margen y precio */}
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Precio y margen</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
                  <div>
                    <label style={lbl}>MARGEN %</label>
                    <input type="number" style={{ ...inp, borderColor: !form.precio_cliente_manual ? "#1D9E75" : "#e5e7eb" }}
                      value={form.margen_pct}
                      onChange={e => setForm({ ...form, margen_pct: Number(e.target.value), precio_cliente_manual: "" })} />
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Ingresa margen para calcular precio</div>
                  </div>
                  <div>
                    <label style={lbl}>PRECIO CLIENTE (editable)</label>
                    <input type="number" style={{ ...inp, borderColor: form.precio_cliente_manual ? "#1D9E75" : "#e5e7eb" }}
                      value={form.precio_cliente_manual}
                      placeholder={fmt(precioCliente)}
                      onChange={e => setForm({ ...form, precio_cliente_manual: e.target.value })} />
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>O ingresa precio para calcular margen</div>
                  </div>
                  <div style={{ background: "#fef2f2", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 2 }}>COSTO TOTAL</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{fmt(costoTotal)}</div>
                  </div>
                  <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 2 }}>RESULTADO</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{fmt(precioCliente)}</div>
                    <div style={{ fontSize: 11, color: margenCalculado >= 35 ? "#0F6E56" : "#ca8a04", fontWeight: 600 }}>
                      Margen: {margenCalculado.toFixed(1)}%
                    </div>
                  </div>
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

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", minWidth: 200 }}
            placeholder="Buscar item..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las categorias</option>
            {categoriasItems.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(busqueda || filtroCategoria) && (
            <button onClick={() => { setBusqueda(""); setFiltroCategoria("") }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
              Limpiar
            </button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtrados.length} items</span>
        </div>
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
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CENTRO COSTOS</th>
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
                    {item.origen_cotizacion_id && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                        Origen: {item.origen_proyecto_codigo ? item.origen_proyecto_codigo + " - " : ""}{item.origen_proyecto_nombre || "Proyecto"}
                        {item.origen_cotizacion_version ? ` · Proforma v${item.origen_cotizacion_version}` : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {item.categoria && <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{item.categoria}</span>}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{item.centro_costos || "—"}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{item.proveedor?.nombre || item.proveedor_nombre || "—"}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{fmt(item.costo_total)}</td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 600, color: item.margen_pct >= 35 ? "#0F6E56" : "#ca8a04" }}>{item.margen_pct}%</td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>
                    {fmt(item.precio_cliente)}
                    {item.precio_cliente_manual && <div style={{ fontSize: 10, color: "#6b7280" }}>precio manual</div>}
                  </td>
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
