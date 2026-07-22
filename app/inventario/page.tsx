"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/purity, react-hooks/immutability, react-hooks/exhaustive-deps, @next/next/no-img-element */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2KpiCard,
  V2PageHeader,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

const CATEGORIAS = ["activo", "consumible", "material"]
const UNIDADES = ["unidad", "kg", "metro", "litro", "caja", "par", "juego"]

export default function InventarioPage() {
  const supabase = createClient()
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
    let itemId = editando?.id
    if (editando) {
      await supabase.from("inventario_items").update(payload).eq("id", editando.id)
    } else {
      const { data: nuevo } = await supabase.from("inventario_items").insert({ ...payload, activo: true, entidad: "peru" }).select().single()
      itemId = nuevo?.id
    }
    if (!editando && form.tiene_variantes && variantes.length > 0 && itemId) {
      const vars = variantes.map(v => v.trim()).filter(Boolean).map(v => ({ item_id: itemId, nombre: v, sku: `${form.nombre.slice(0,3).toUpperCase()}-${v.toUpperCase()}` }))
      if (vars.length > 0) await supabase.from("inventario_variantes").insert(vars)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este ítem del inventario?")) return
    await supabase.from("inventario_items").update({ activo: false }).eq("id", id)
    load()
  }

  function getStockTotal(item: any) {
    if (!item.inventario_stock_sin_variante) return 0
    return item.inventario_stock_sin_variante.reduce((s: number, x: any) => s + (x.cantidad || 0), 0)
  }

  const itemsFiltrados = items.filter(item => {
    const matchCat = !filtroCategoria || item.categoria === filtroCategoria
    const matchBusq = !filtroBusqueda || item.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) || item.descripcion?.toLowerCase().includes(filtroBusqueda.toLowerCase())
    return matchCat && matchBusq
  })

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando catálogo de inventario...
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    {
      key: "item",
      header: "Ítem",
      render: (item) => {
        const stockTotal = getStockTotal(item)
        const bajominimo = stockTotal <= (item.stock_minimo || 0) && item.stock_minimo > 0
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {item.foto_url ? (
              <img src={item.foto_url} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} alt={item.nombre} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--v2-surface-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                📦
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>{item.nombre}</div>
              {item.descripcion && <div style={{ fontSize: 11.5, color: "var(--v2-muted)" }}>{item.descripcion}</div>}
              {item.tiene_variantes && <span style={{ fontSize: 10, color: "#7c3aed", background: "#ede9fe", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>Con variantes</span>}
              {bajominimo && <span style={{ fontSize: 10, color: "#dc2626", background: "#fee2e2", padding: "1px 6px", borderRadius: 99, fontWeight: 600, marginLeft: 4 }}>⚠ Stock bajo</span>}
            </div>
          </div>
        )
      },
    },
    {
      key: "categoria",
      header: "Categoría",
      render: (item) => (
        <span style={{
          background: item.categoria === "activo" ? "#dbeafe" : item.categoria === "consumible" ? "#fef3c7" : "#f0fdf4",
          color: item.categoria === "activo" ? "#1e40af" : item.categoria === "consumible" ? "#92400e" : "#15803d",
          padding: "2px 8px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {item.categoria}
        </span>
      ),
    },
    {
      key: "cliente",
      header: "Cliente",
      render: (item) => <span style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{item.cliente?.razon_social || "—"}</span>,
    },
    {
      key: "stock_total",
      header: "Stock Total",
      align: "center",
      render: (item) => <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>{getStockTotal(item)}</span>,
    },
    ...ubicaciones.map((ub) => ({
      key: `ub_${ub.id}`,
      header: ub.nombre,
      align: "center" as const,
      render: (item: any) => {
        const st = item.inventario_stock_sin_variante?.find((x: any) => x.ubicacion?.nombre === ub.nombre)
        return <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>{st?.cantidad || 0}</span>
      },
    })),
    {
      key: "stock_minimo",
      header: "Mínimo",
      align: "center",
      render: (item) => <span style={{ fontSize: 12, color: "var(--v2-subtle)" }}>{item.stock_minimo || 0}</span>,
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (item) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <V2Button variant="ghost" size="compact" onClick={() => abrirEditar(item)}>
            Editar
          </V2Button>
          <V2Button variant="destructive" size="compact" onClick={() => eliminar(item.id)}>
            ×
          </V2Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Inventario"
            title="Catálogo de Ítems"
            subtitle={`${itemsFiltrados.length} de ${items.length} ítems en almacén`}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ImportExport
                  modulo="inventario_items"
                  campos={[
                    { key: "nombre", label: "Nombre", requerido: true },
                    { key: "descripcion", label: "Descripción" },
                    { key: "categoria", label: "Categoría", requerido: true },
                    { key: "unidad", label: "Unidad", requerido: true },
                    { key: "stock_minimo", label: "Stock mínimo" },
                  ]}
                  datos={itemsFiltrados}
                  onImportar={async (registros) => {
                    let exitosos = 0
                    const errores: string[] = []
                    for (const r of registros) {
                      const { error } = await supabase.from("inventario_items").insert({ ...r, activo: true, entidad: "peru" })
                      if (error) errores.push(r.nombre + ": " + error.message)
                      else exitosos++
                    }
                    load()
                    return { exitosos, errores }
                  }}
                />
                <V2Button variant="primary" onClick={abrirNuevo}>
                  + Nuevo ítem
                </V2Button>
              </div>
            }
          />
        }
        summary={
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`, gap: 14 }}>
            {ubicaciones.map((ub) => {
              const total = items.reduce((s, item) => {
                const st = item.inventario_stock_sin_variante?.find((x: any) => x.ubicacion?.nombre === ub.nombre)
                return s + (st?.cantidad || 0)
              }, 0)
              return (
                <V2KpiCard
                  key={ub.id}
                  label={ub.nombre}
                  value={String(total)}
                  icon="folder"
                />
              )
            })}
          </div>
        }
        toolbar={
          <V2FilterBar
            searchValue={filtroBusqueda}
            onSearchChange={setFiltroBusqueda}
            activeFiltersCount={filtroCategoria ? 1 : 0}
            hideDrawerButton
            onToggleDrawer={() => {}}
            quickFilters={
              <div style={{ width: 180 }}>
                <V2Select
                  compact
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  options={[
                    { label: "Todas las categorías", value: "" },
                    ...CATEGORIAS.map((c) => ({ label: c, value: c })),
                  ]}
                />
              </div>
            }
            showClearButton={Boolean(filtroCategoria || filtroBusqueda)}
            onClearFilters={() => {
              setFiltroBusqueda("")
              setFiltroCategoria("")
            }}
          />
        }
        table={
          <V2DataTable
            columns={columns}
            rows={itemsFiltrados}
            getRowKey={(item) => item.id}
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay ítems registrados en el catálogo.
              </div>
            }
          />
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>{editando ? "Editar ítem" : "Nuevo ítem"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input style={inp} value={form.nombre} placeholder="Nombre del ítem" onChange={e => setForm({ ...form, nombre: e.target.value })} />
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>Tiene variantes (tallas, medidas, pesos)</span>
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
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear ítem"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}