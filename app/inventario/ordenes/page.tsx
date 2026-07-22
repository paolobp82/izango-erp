"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/purity, react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { rowBelongsToDeletedProject } from "@/lib/projects"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

const TIPOS = ["salida", "ingreso", "devolucion", "traslado"]
const ESTADOS = ["borrador", "aprobada", "ejecutada", "cerrada", "cancelada"]

const ESTADO_COLOR: Record<string, { bg: string; color: string }> = {
  borrador: { bg: "#f3f4f6", color: "#6b7280" },
  aprobada: { bg: "#dbeafe", color: "#1e40af" },
  ejecutada: { bg: "#d1fae5", color: "#065f46" },
  cerrada: { bg: "#e0e7ff", color: "#3730a3" },
  cancelada: { bg: "#fee2e2", color: "#dc2626" },
}

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
      supabase.from("inventario_ordenes").select("*, proyecto:proyectos(nombre,codigo,deleted_at), ubicacion_origen:inventario_ubicaciones!ubicacion_origen_id(nombre), ubicacion_destino:inventario_ubicaciones!ubicacion_destino_id(nombre), solicitado:perfiles!solicitado_por(nombre,apellido), inventario_orden_items(*, item:inventario_items(nombre))").order("created_at", { ascending: false }),
      supabase.from("inventario_items").select("*, inventario_variantes(*)").eq("activo", true).order("nombre"),
      supabase.from("inventario_ubicaciones").select("*").eq("activo", true),
      supabase.from("proyectos").select("id, nombre, codigo").is("deleted_at", null).order("nombre"),
    ])
    setOrdenes((ords || []).filter((orden: any) => !rowBelongsToDeletedProject(orden)))
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
    if (ordenItems.filter(i => i.item_id).length === 0) { alert("Agrega al menos un ítem"); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: orden } = await supabase.from("inventario_ordenes").insert({
      tipo: form.tipo,
      proyecto_id: form.proyecto_id || null,
      ubicacion_origen_id: form.ubicacion_origen_id || null,
      ubicacion_destino_id: form.ubicacion_destino_id || null,
      direccion_destino: form.direccion_destino || null,
      contacto_receptor: form.contacto_receptor || null,
      dni_receptor: form.dni_receptor || null,
      telefono_receptor: form.telefono_receptor || null,
      transportista: form.transportista || null,
      vehiculo_placa: form.vehiculo_placa || null,
      fecha_entrega: form.fecha_entrega || null,
      fecha_retorno_esperada: form.fecha_retorno_esperada || null,
      solicitado_por: user?.id,
      estado: "borrador",
      notas: form.notas || null,
      entidad: "peru",
    }).select().single()

    if (orden) {
      const ois = ordenItems.filter(i => i.item_id).map(i => ({
        orden_id: orden.id,
        item_id: i.item_id,
        variante_id: i.variante_id || null,
        cantidad_solicitada: parseInt(i.cantidad_solicitada) || 1,
        cantidad_atendida: 0,
      }))
      await supabase.from("inventario_orden_items").insert(ois)
    }

    setSaving(false)
    setShowForm(false)
    setForm({
      tipo: "salida", proyecto_id: "", ubicacion_origen_id: "", ubicacion_destino_id: "",
      direccion_destino: "", contacto_receptor: "", dni_receptor: "", telefono_receptor: "",
      transportista: "", vehiculo_placa: "", fecha_entrega: "", fecha_retorno_esperada: "", notas: ""
    })
    setOrdenItems([{ item_id: "", variante_id: "", cantidad_solicitada: 1 }])
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const update: any = { estado, updated_at: new Date().toISOString() }

    if (estado === "aprobada") update.aprobada_por = user?.id
    if (estado === "ejecutada") update.ejecutada_por = user?.id
    if (estado === "cerrada") update.cerrada_por = user?.id

    await supabase.from("inventario_ordenes").update(update).eq("id", id)

    if (estado === "ejecutada") {
      const { data: ord } = await supabase
        .from("inventario_ordenes")
        .select("*, inventario_orden_items(*)")
        .eq("id", id)
        .single()

      if (ord) {
        for (const item of ord.inventario_orden_items) {
          const cantidad = Number(item.cantidad_solicitada || 0)
          if (!cantidad) continue

          if (ord.tipo === "salida" && ord.ubicacion_origen_id) {
            await actualizarStock(item.item_id, item.variante_id, ord.ubicacion_origen_id, -cantidad)
          }

          if (ord.tipo === "ingreso" && ord.ubicacion_destino_id) {
            await actualizarStock(item.item_id, item.variante_id, ord.ubicacion_destino_id, cantidad)
          }

          if (ord.tipo === "devolucion" && ord.ubicacion_destino_id) {
            await actualizarStock(item.item_id, item.variante_id, ord.ubicacion_destino_id, cantidad)
          }

          if (ord.tipo === "traslado") {
            if (ord.ubicacion_origen_id) {
              await actualizarStock(item.item_id, item.variante_id, ord.ubicacion_origen_id, -cantidad)
            }
            if (ord.ubicacion_destino_id) {
              await actualizarStock(item.item_id, item.variante_id, ord.ubicacion_destino_id, cantidad)
            }
          }
        }
      }
    }

    load()
  }

  async function actualizarStock(itemId: string, varianteId: string | null, ubicacionId: string, delta: number) {
    if (varianteId) {
      const { data: actual } = await supabase
        .from("inventario_stock_variante")
        .select("id, cantidad")
        .eq("variante_id", varianteId)
        .eq("ubicacion_id", ubicacionId)
        .single()

      if (actual) {
        await supabase
          .from("inventario_stock_variante")
          .update({ cantidad: Math.max(0, Number(actual.cantidad || 0) + delta) })
          .eq("id", actual.id)
      } else if (delta > 0) {
        await supabase.from("inventario_stock_variante").insert({
          variante_id: varianteId,
          ubicacion_id: ubicacionId,
          cantidad: delta,
        })
      }
    } else {
      const { data: actual } = await supabase
        .from("inventario_stock_sin_variante")
        .select("id, cantidad")
        .eq("item_id", itemId)
        .eq("ubicacion_id", ubicacionId)
        .single()

      if (actual) {
        await supabase
          .from("inventario_stock_sin_variante")
          .update({ cantidad: Math.max(0, Number(actual.cantidad || 0) + delta) })
          .eq("id", actual.id)
      } else if (delta > 0) {
        await supabase.from("inventario_stock_sin_variante").insert({
          item_id: itemId,
          ubicacion_id: ubicacionId,
          cantidad: delta,
        })
      }
    }
  }

  function seleccionarArchivoEntrega(accept: string) {
    return new Promise<File | null>((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = accept
      input.onchange = () => resolve(input.files?.[0] || null)
      input.click()
    })
  }

  async function subirArchivoOrden(file: File, carpeta: string) {
    const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const path = `inventario-ordenes/${carpeta}/${Date.now()}-${nombreSeguro}`
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from("assets").getPublicUrl(path)
    return data.publicUrl
  }

  async function registrarEntregaOrden(orden: any) {
    const recibidoPor = prompt("¿Quién recibió la orden?", orden.contacto_receptor || "")
    if (!recibidoPor) return

    const fechaReal = prompt("Fecha real de entrega (YYYY-MM-DD)", new Date().toISOString().slice(0, 10))
    if (!fechaReal) return

    alert("Selecciona el cargo firmado en PDF/JPG/PNG.")
    const cargoFirmado = await seleccionarArchivoEntrega(".pdf,.jpg,.jpeg,.png")
    if (!cargoFirmado) return

    alert("Selecciona la evidencia fotográfica o archivo adicional. Puedes cancelar si no aplica.")
    const evidencia = await seleccionarArchivoEntrega(".pdf,.jpg,.jpeg,.png")

    try {
      const cargoUrl = await subirArchivoOrden(cargoFirmado, "cargos-firmados")
      const evidenciaUrl = evidencia ? await subirArchivoOrden(evidencia, "evidencias") : null

      const { error } = await supabase.from("inventario_ordenes").update({
        cargo_firmado_url: cargoUrl,
        evidencia_url: evidenciaUrl,
        recibido_por: recibidoPor,
        fecha_entrega_real: fechaReal,
        estado: orden.tipo === "salida" ? "cerrada" : orden.estado,
        updated_at: new Date().toISOString(),
      }).eq("id", orden.id)

      if (error) {
        alert("Error registrando entrega: " + error.message)
        return
      }

      alert("Entrega registrada correctamente.")
      load()
    } catch (error: any) {
      alert("Error subiendo evidencia: " + (error?.message || error))
    }
  }

  function imprimirCargoInventario(orden: any) {
    const html = `
  <html>
  <head>
    <title>Cargo de Orden ${orden.codigo || ""}</title>
    <style>
      body{font-family:Arial;padding:30px;color:#111}
      h1{margin:0 0 20px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left}
      .box{margin-bottom:20px;line-height:1.7}
      .firma{margin-top:80px;display:flex;justify-content:space-between}
      .firma div{width:40%;text-align:center}
    </style>
  </head>
  <body>
    <h1>CARGO DE MOVIMIENTO DE INVENTARIO</h1>

    <div class="box">
      <b>Código:</b> ${orden.codigo || "-"}<br/>
      <b>Tipo:</b> ${orden.tipo || "-"}<br/>
      <b>Proyecto:</b> ${orden.proyecto ? orden.proyecto.codigo + " — " + orden.proyecto.nombre : "-"}<br/>
      <b>Origen:</b> ${orden.ubicacion_origen?.nombre || "-"}<br/>
      <b>Destino:</b> ${orden.ubicacion_destino?.nombre || orden.direccion_destino || "-"}<br/>
      <b>Receptor:</b> ${orden.contacto_receptor || "-"}<br/>
      <b>DNI:</b> ${orden.dni_receptor || "-"}<br/>
      <b>Teléfono:</b> ${orden.telefono_receptor || "-"}<br/>
      <b>Fecha:</b> ${orden.fecha_entrega || "-"}
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Cantidad solicitada</th>
        </tr>
      </thead>
      <tbody>
        ${(orden.inventario_orden_items || []).map((i:any)=>`
          <tr>
            <td>${i.item?.nombre || "-"}</td>
            <td>${i.cantidad_solicitada || 0}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="firma">
      <div>
        _______________________<br/>
        Entrega (Almacén)
      </div>
      <div>
        _______________________<br/>
        Recibe (Responsable)
      </div>
    </div>
  </body>
  </html>
  `
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const ordenesFiltradas = ordenes.filter(o => {
    if (filtroTipo && o.tipo !== filtroTipo) return false
    if (filtroEstado && o.estado !== filtroEstado) return false
    return true
  })

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando órdenes de inventario...
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    {
      key: "codigo",
      header: "Código",
      render: (o) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--v2-text)" }}>{o.codigo}</div>
          <div style={{ fontSize: 11, color: "var(--v2-muted)" }}>{new Date(o.created_at).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (o) => <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--v2-text)", textTransform: "capitalize" }}>{o.tipo}</span>,
    },
    {
      key: "proyecto",
      header: "Proyecto / Destino",
      render: (o) => (
        <div>
          <div style={{ fontSize: 13, color: "var(--v2-text)" }}>{o.proyecto ? o.proyecto.codigo : o.ubicacion_destino?.nombre || o.direccion_destino || "—"}</div>
          <div style={{ fontSize: 11.5, color: "var(--v2-muted)" }}>De: {o.ubicacion_origen?.nombre || "—"}</div>
        </div>
      ),
    },
    {
      key: "solicitado",
      header: "Solicitante",
      render: (o) => <span style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{o.solicitado ? `${o.solicitado.nombre} ${o.solicitado.apellido}` : "—"}</span>,
    },
    {
      key: "items",
      header: "Ítems",
      align: "center",
      render: (o) => <span style={{ fontWeight: 700, fontSize: 13, color: "var(--v2-text)" }}>{o.inventario_orden_items?.length || 0}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      align: "center",
      render: (o) => {
        const ec = ESTADO_COLOR[o.estado] || ESTADO_COLOR.borrador
        return (
          <span style={{ background: ec.bg, color: ec.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            {o.estado}
          </span>
        )
      },
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (o) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <V2Button variant="ghost" size="compact" onClick={() => imprimirCargoInventario(o)}>
            Cargo PDF
          </V2Button>
          {o.estado === "ejecutada" && (
            <V2Button variant="secondary" size="compact" onClick={() => registrarEntregaOrden(o)}>
              Entrega
            </V2Button>
          )}
          {o.estado === "borrador" && (
            <V2Button variant="ghost" size="compact" onClick={() => cambiarEstado(o.id, "aprobada")}>
              Aprobar
            </V2Button>
          )}
          {o.estado === "aprobada" && (
            <V2Button variant="ghost" size="compact" onClick={() => cambiarEstado(o.id, "ejecutada")}>
              Ejecutar
            </V2Button>
          )}
          {o.estado === "ejecutada" && o.tipo === "salida" && (
            <V2Button variant="ghost" size="compact" onClick={() => cambiarEstado(o.id, "cerrada")}>
              Cerrar
            </V2Button>
          )}
          {o.estado === "borrador" && (
            <V2Button variant="destructive" size="compact" onClick={() => cambiarEstado(o.id, "cancelada")}>
              Cancelar
            </V2Button>
          )}
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
            title="Órdenes de Movimiento"
            subtitle={`${ordenesFiltradas.length} órdenes de ingreso, salida y devolución`}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ImportExport
                  modulo="inventario_ordenes"
                  campos={[
                    { key: "codigo", label: "Código", requerido: true },
                    { key: "tipo", label: "Tipo", requerido: true },
                    { key: "estado", label: "Estado" },
                    { key: "direccion_destino", label: "Dirección destino" },
                    { key: "contacto_receptor", label: "Contacto receptor" },
                  ]}
                  datos={ordenesFiltradas}
                  onImportar={async (registros) => {
                    let exitosos = 0
                    const errores: string[] = []
                    for (const r of registros) {
                      const { error } = await supabase.from("inventario_ordenes").insert({ ...r, estado: r.estado || "borrador" })
                      if (error) errores.push(r.codigo + ": " + error.message)
                      else exitosos++
                    }
                    load()
                    return { exitosos, errores }
                  }}
                />
                <V2Button variant="primary" onClick={() => setShowForm(true)}>
                  + Nueva orden
                </V2Button>
              </div>
            }
          />
        }
        toolbar={
          <V2FilterBar
            searchValue=""
            onSearchChange={() => {}}
            activeFiltersCount={(filtroTipo ? 1 : 0) + (filtroEstado ? 1 : 0)}
            hideDrawerButton
            onToggleDrawer={() => {}}
            quickFilters={
              <>
                <div style={{ width: 160 }}>
                  <V2Select
                    compact
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    options={[
                      { label: "Todos los tipos", value: "" },
                      ...TIPOS.map((t) => ({ label: t, value: t })),
                    ]}
                  />
                </div>
                <div style={{ width: 160 }}>
                  <V2Select
                    compact
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    options={[
                      { label: "Todos los estados", value: "" },
                      ...ESTADOS.map((e) => ({ label: e, value: e })),
                    ]}
                  />
                </div>
              </>
            }
            showClearButton={Boolean(filtroTipo || filtroEstado)}
            onClearFilters={() => {
              setFiltroTipo("")
              setFiltroEstado("")
            }}
          />
        }
        table={
          <V2DataTable
            columns={columns}
            rows={ordenesFiltradas}
            getRowKey={(o) => o.id}
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay órdenes de inventario registradas.
              </div>
            }
          />
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Nueva orden</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
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

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={lbl}>Ítems *</label>
                  <V2Button variant="ghost" size="compact" onClick={agregarItem}>+ Agregar ítem</V2Button>
                </div>
                {ordenItems.map((oi, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                    <div>
                      <label style={lbl}>Ítem</label>
                      <select style={inp} value={oi.item_id} onChange={e => updateOrdenItem(i, "item_id", e.target.value)}>
                        <option value="">Seleccionar ítem</option>
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
                    <button onClick={() => removeOrdenItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--v2-danger)", fontSize: 18, paddingBottom: 4 }}>×</button>
                  </div>
                ))}
              </div>

              <div>
                <label style={lbl}>Notas</label>
                <textarea style={{ ...inp, height: 60, resize: "vertical" }} value={form.notas} placeholder="Notas adicionales" onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Crear orden"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
