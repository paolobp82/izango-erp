"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { registrarAccion } from "@/lib/trazabilidad"
import { buscarItemsCotizados } from "@/lib/quote-item-search"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  V2Tabs,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"
import styles from "./Biblioteca.module.css"

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<any[]>([])
  const [itemsCotizados, setItemsCotizados] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [vista, setVista] = useState<"biblioteca" | "cotizados">(searchParams.get("tab") === "cotizados" ? "cotizados" : "biblioteca")
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
    const cotizados = await buscarItemsCotizados(supabase, { limit: 1000 })
    if (cotizados.error) console.error("Error cargando items cotizados en Biblioteca:", cotizados.error)
    setItemsCotizados(cotizados.data || [])
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

  const filtrados = useMemo(() => {
    return items.filter(i => {
      if (filtroCategoria && i.categoria !== filtroCategoria) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const coincide = [
          i.descripcion,
          i.categoria,
          i.origen_proyecto_nombre,
          i.origen_proyecto_codigo,
          i.origen_cotizacion_version ? `cotización v${i.origen_cotizacion_version}` : "",
          i.origen_fecha ? new Date(i.origen_fecha).toLocaleDateString("es-PE") : "",
          i.proveedor?.nombre,
          i.proveedor_nombre,
        ].some(valor => String(valor || "").toLowerCase().includes(q))
        if (!coincide) return false
      }
      return true
    })
  }, [items, filtroCategoria, busqueda])

  const cotizadosFiltrados = useMemo(() => {
    return itemsCotizados.filter(item => {
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const cot = item.cotizacion
        const proy = cot?.proyecto
        const cliente = proy?.cliente
        const coincide = [item.descripcion, proy?.codigo, proy?.nombre, cliente?.razon_social, cot?.version ? `v${cot.version}` : ""]
          .some(valor => String(valor || "").toLowerCase().includes(q))
        if (!coincide) return false
      }
      if (filtroCategoria && item.categoria !== filtroCategoria) return false
      return true
    })
  }, [itemsCotizados, busqueda, filtroCategoria])

  const categoriasItems = useMemo(() => {
    return Array.from(new Set(items.map(i => i.categoria).filter(Boolean))) as string[]
  }, [items])

  const columnsBiblioteca: V2TableColumn<any>[] = [
    {
      key: "descripcion",
      header: "Descripción",
      render: (item) => (
        <div>
          <strong style={{ color: "var(--v2-text)", fontWeight: 800 }}>{item.descripcion}</strong>
          {item.notas && <div style={{ fontSize: 11, color: "var(--v2-muted)", marginTop: 2 }}>{item.notas}</div>}
          {item.origen_cotizacion_id && (
            <div style={{ fontSize: 11, color: "var(--v2-muted)", marginTop: 4 }}>
              Origen: {item.origen_proyecto_codigo ? item.origen_proyecto_codigo + " - " : ""}{item.origen_proyecto_nombre || "Proyecto"}
              {item.origen_cotizacion_version ? ` · Cotización v${item.origen_cotizacion_version}` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
      render: (item) => (
        item.categoria ? (
          <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            {item.categoria}
          </span>
        ) : "—"
      ),
    },
    {
      key: "centro_costos",
      header: "Centro Costos",
      render: (item) => item.centro_costos || "—",
    },
    {
      key: "proveedor",
      header: "Proveedor",
      render: (item) => item.proveedor?.nombre || item.proveedor_nombre || "—",
    },
    {
      key: "costo",
      header: "Costo",
      align: "right",
      render: (item) => <span style={{ fontWeight: 600, color: "#dc2626" }}>{fmt(item.costo_total)}</span>,
    },
    {
      key: "margen",
      header: "Margen",
      align: "center",
      render: (item) => (
        <span style={{ fontWeight: 600, color: item.margen_pct >= 35 ? "#0F6E56" : "#ca8a04" }}>
          {item.margen_pct}%
        </span>
      ),
    },
    {
      key: "precio_cliente",
      header: "Precio Cli.",
      align: "right",
      render: (item) => (
        <div>
          <span style={{ fontWeight: 700, color: "#0F6E56" }}>{fmt(item.precio_cliente)}</span>
          {item.precio_cliente_manual && <div style={{ fontSize: 10, color: "var(--v2-muted)" }}>precio manual</div>}
        </div>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (item) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <V2Button
            type="button"
            size="compact"
            variant="secondary"
            onClick={() => abrirEditar(item)}
          >
            Editar
          </V2Button>
          <V2Button
            type="button"
            size="compact"
            variant="secondary"
            onClick={() => eliminar(item.id, item.descripcion)}
            style={{ color: "#dc2626" }}
          >
            Eliminar
          </V2Button>
        </div>
      ),
    },
  ]

  const columnsCotizados: V2TableColumn<any>[] = [
    {
      key: "descripcion",
      header: "Ítem Cotizado",
      render: (item) => <strong style={{ color: "var(--v2-text)", fontWeight: 800 }}>{item.descripcion || "Sin descripción"}</strong>,
    },
    {
      key: "proyecto",
      header: "Proyecto",
      render: (item) => {
        const proy = item.cotizacion?.proyecto
        return (
          <div>
            <strong>{proy?.codigo || "—"}</strong>
            <div style={{ color: "var(--v2-muted)", fontSize: 11 }}>{proy?.nombre || "Sin proyecto"}</div>
          </div>
        )
      },
    },
    {
      key: "cliente",
      header: "Cliente",
      render: (item) => item.cotizacion?.proyecto?.cliente?.razon_social || "—",
    },
    {
      key: "cotizacion",
      header: "Cotización",
      render: (item) => {
        const cot = item.cotizacion
        return (
          <span style={{ color: "#6d28d9", fontWeight: 700 }}>
            V{cot?.version || "?"} · {cot?.estado || "sin estado"}
          </span>
        )
      },
    },
    {
      key: "precio",
      header: "Precio",
      align: "right",
      render: (item) => <span style={{ fontWeight: 700, color: "#0F6E56" }}>{fmt(item.precio_cliente)}</span>,
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (item) => {
        const cot = item.cotizacion
        const href = cot?.proyecto_id && cot?.id ? `/proyectos/${cot.proyecto_id}/cotizaciones/${cot.id}` : ""
        return (
          href ? (
            <V2Button
              type="button"
              size="compact"
              variant="secondary"
              onClick={() => router.push(href)}
            >
              Abrir
            </V2Button>
          ) : null
        )
      },
    },
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            title="Biblioteca de Ítems"
            subtitle={`${items.length} ítems guardados · ${itemsCotizados.length} ítems cotizados`}
            actions={
              <V2Button onClick={abrirNuevo} size="compact">
                + Nuevo item
              </V2Button>
            }
          />
        }
        summary={
          <div style={{ marginBottom: "16px" }}>
            <V2Tabs
              activeId={vista}
              items={[
                { id: "biblioteca", label: "Biblioteca" },
                { id: "cotizados", label: "Buscador de ítems cotizados" },
              ]}
              onChange={(id: any) => {
                setVista(id)
                router.replace(`/biblioteca${id === "cotizados" ? "?tab=cotizados" : ""}`)
              }}
            />
          </div>
        }
        toolbar={
          <V2FilterBar
            searchValue={busqueda}
            onSearchChange={(val) => {
              setBusqueda(val)
            }}
            activeFiltersCount={filtroCategoria !== "" ? 1 : 0}
            hideDrawerButton={true}
            onToggleDrawer={() => {}}
            quickFilters={
              <div style={{ width: "200px", flexShrink: 0 }}>
                <V2Select
                  options={[
                    { label: "Todas las categorías", value: "" },
                    ...categoriasItems.map((c) => ({ label: c, value: c })),
                  ]}
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  compact
                />
              </div>
            }
            showClearButton={busqueda !== "" || filtroCategoria !== ""}
            onClearFilters={() => {
              setBusqueda("")
              setFiltroCategoria("")
            }}
          />
        }
        table={
          loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
              Cargando Biblioteca de ítems...
            </div>
          ) : (
            <>
              {loadError && (
                <div style={{ padding: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                  No se pudo cargar la Biblioteca de items: {loadError}
                </div>
              )}

              {vista === "cotizados" ? (
                <>
                  {/* Desktop Table View */}
                  <div className={styles.tableContainer}>
                    <V2DataTable
                      columns={columnsCotizados}
                      rows={cotizadosFiltrados}
                      getRowKey={(item) => item.id}
                      empty={
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                          No se encontraron ítems cotizados.
                        </div>
                      }
                    />
                  </div>

                  {/* Mobile Card View */}
                  <div className={styles.cardsContainer}>
                    {cotizadosFiltrados.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                        No se encontraron ítems cotizados.
                      </div>
                    ) : (
                      cotizadosFiltrados.map((item) => {
                        const cot = item.cotizacion
                        const proy = cot?.proyecto
                        const cliente = proy?.cliente
                        const href = cot?.proyecto_id && cot?.id ? `/proyectos/${cot.proyecto_id}/cotizaciones/${cot.id}` : ""
                        return (
                          <div key={item.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                              <h4 className={styles.cardTitle}>{item.descripcion || "Sin descripción"}</h4>
                              <span style={{ color: "#6d28d9", fontWeight: 700, fontSize: 10 }}>
                                V{cot?.version || "?"}
                              </span>
                            </div>

                            <div className={styles.cardContent}>
                              <div>
                                <span className={styles.cardLabel}>Proyecto:</span>
                                {proy?.codigo || "—"} ({proy?.nombre || "Sin proyecto"})
                              </div>
                              <div>
                                <span className={styles.cardLabel}>Cliente:</span>
                                {cliente?.razon_social || "—"}
                              </div>
                              <div>
                                <span className={styles.cardLabel}>Cotización Estado:</span>
                                {cot?.estado || "sin estado"}
                              </div>
                              <div>
                                <span className={styles.cardLabel}>Precio:</span>
                                <span style={{ color: "#0F6E56", fontWeight: "bold" }}>{fmt(item.precio_cliente)}</span>
                              </div>
                            </div>

                            <div className={styles.cardActions}>
                              {href && (
                                <V2Button
                                  type="button"
                                  size="compact"
                                  variant="secondary"
                                  onClick={() => router.push(href)}
                                >
                                  Abrir
                                </V2Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className={styles.tableContainer}>
                    <V2DataTable
                      columns={columnsBiblioteca}
                      rows={filtrados}
                      getRowKey={(item) => item.id}
                      empty={
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                          No hay items. Crea el primero.
                        </div>
                      }
                    />
                  </div>

                  {/* Mobile Card View */}
                  <div className={styles.cardsContainer}>
                    {filtrados.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                        No hay items. Crea el primero.
                      </div>
                    ) : (
                      filtrados.map((item) => (
                        <div key={item.id} className={styles.card}>
                          <div className={styles.cardHeader}>
                            <h4 className={styles.cardTitle}>
                              {item.descripcion}
                              {item.notas && <div style={{ fontSize: 11, color: "var(--v2-muted)", fontWeight: "normal", marginTop: 2 }}>{item.notes}</div>}
                            </h4>
                            {item.categoria && (
                              <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600 }}>
                                {item.categoria}
                              </span>
                            )}
                          </div>

                          <div className={styles.cardContent}>
                            <div>
                              <span className={styles.cardLabel}>Centro Costos:</span>
                              {item.centro_costos || "—"}
                            </div>
                            <div>
                              <span className={styles.cardLabel}>Proveedor:</span>
                              {item.proveedor?.nombre || item.proveedor_nombre || "—"}
                            </div>
                            <div>
                              <span className={styles.cardLabel}>Costo:</span>
                              <span style={{ color: "#dc2626", fontWeight: "bold" }}>{fmt(item.costo_total)}</span>
                            </div>
                            <div>
                              <span className={styles.cardLabel}>Margen:</span>
                              {item.margen_pct}%
                            </div>
                            <div>
                              <span className={styles.cardLabel}>Precio Cliente:</span>
                              <span style={{ color: "#0F6E56", fontWeight: "bold" }}>{fmt(item.precio_cliente)}</span>
                            </div>
                          </div>

                          <div className={styles.cardActions}>
                            <V2Button
                              type="button"
                              size="compact"
                              variant="secondary"
                              onClick={() => abrirEditar(item)}
                            >
                              Editar
                            </V2Button>
                            <V2Button
                              type="button"
                              size="compact"
                              variant="secondary"
                              onClick={() => eliminar(item.id, item.descripcion)}
                              style={{ color: "#dc2626" }}
                            >
                              Eliminar
                            </V2Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* Import/Export toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: 12 }}>
                <ImportExport
                  modulo="biblioteca"
                  campos={[
                    { key: "descripcion", label: "Descripcion", requerido: true },
                    { key: "categoria", label: "Categoria" },
                    { key: "centro_costos", label: "Centro costos" },
                    { key: "costo_almacenaje", label: "Costo almacenaje" },
                    { key: "costo_impresion", label: "Costo impresion" },
                    { key: "costo_alquiler", label: "Costo alquiler" },
                    { key: "margen_pct", label: "Margen %" },
                    { key: "proveedor_nombre", label: "Proveedor" },
                  ]}
                  datos={items}
                  onImportar={async (registros) => {
                    let exitosos = 0
                    const errores: string[] = []
                    for (const r of registros) {
                      const costoTotal = (Number(r.costo_almacenaje) || 0) + (Number(r.costo_impresion) || 0) + (Number(r.costo_alquiler) || 0)
                      const margen = Number(r.margen_pct) || 40
                      const precioCliente = margen < 100 ? costoTotal / (1 - margen / 100) : costoTotal
                      const { error } = await supabase.from("items_biblioteca").insert({
                        ...r,
                        costo_total: costoTotal,
                        precio_cliente: precioCliente,
                        activo: true,
                      })
                      if (error) errores.push(r.descripcion + ": " + error.message)
                      else exitosos++
                    }
                    load()
                    return { exitosos, errores }
                  }}
                  variant="v2"
                />
              </div>
            </>
          )
        }
      />

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
    </>
  )
}
