"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"

const DEPARTAMENTOS_PERU = [
  "Amazonas","Ancash","Apurimac","Arequipa","Ayacucho","Cajamarca","Callao","Cusco",
  "Huancavelica","Huanuco","Ica","Junin","La Libertad","Lambayeque","Lima","Loreto",
  "Madre de Dios","Moquegua","Pasco","Piura","Puno","San Martin","Tacna","Tumbes","Ucayali"
]

const TIPOS: Record<string, any> = {
  salida:   { label: "Salida",   icon: "📤", color: "#1e40af", bg: "#dbeafe" },
  retorno:  { label: "Retorno",  icon: "↩", color: "#6d28d9", bg: "#f5f3ff" },
  traslado: { label: "Traslado", icon: "🚚", color: "#92400e", bg: "#fef9c3" },
}

const ESTADOS: Record<string, any> = {
  borrador:    { label: "Borrador",    bg: "#f3f4f6", color: "#6b7280" },
  aprobado:    { label: "Aprobado",    bg: "#dbeafe", color: "#1e40af" },
  en_transito: { label: "En transito", bg: "#fef9c3", color: "#92400e" },
  entregado:   { label: "Entregado",   bg: "#dcfce7", color: "#15803d" },
  retornado:   { label: "Retornado",   bg: "#f5f3ff", color: "#6d28d9" },
  cancelado:   { label: "Cancelado",   bg: "#fee2e2", color: "#991b1b" },
}

const ROLES_APROBADOR = ["gerente_produccion", "gerente_general", "superadmin", "logistica"]

const formVacio = {
  tipo: "salida",
  proyecto_id: "", ubicacion_origen_id: "",
  departamento: "", provincia: "", distrito: "", direccion_destino: "",
  contacto_receptor: "", dni_receptor: "", telefono_receptor: "",
  transportista: "", vehiculo_placa: "",
  fecha_salida: "", fecha_entrega_estimada: "", fecha_retorno_estimada: "",
  notas: "",
}

export default function EnviosMaterialesPage() {
  const supabase = createClient()
  const [envios, setEnvios] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [ubicaciones, setUbicaciones] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [envioItems, setEnvioItems] = useState<any[]>([])
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroDept, setFiltroDept] = useState("")
  const [form, setForm] = useState<any>({ ...formVacio })
  const [lineas, setLineas] = useState<any[]>([{ item_id: "", variante_id: "", cantidad_enviada: 1, observacion: "" }])
  const [variantes, setVariantes] = useState<Record<string, any[]>>({})
  const [showRetorno, setShowRetorno] = useState(false)
  const [retornoCantidades, setRetornoCantidades] = useState<Record<string, number>>({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const [{ data: envs }, { data: its }, { data: ubs }, { data: pros }] = await Promise.all([
      supabase.from("envios_materiales").select("*, proyecto:proyectos(nombre,codigo), ubicacion_origen:inventario_ubicaciones!ubicacion_origen_id(nombre), solicitante:perfiles!solicitado_por(nombre,apellido), aprobador:perfiles!aprobado_por(nombre,apellido), envio_items(*, item:inventario_items(nombre), variante:inventario_variantes(nombre))").order("created_at", { ascending: false }),
      supabase.from("inventario_items").select("*, inventario_variantes(*)").eq("activo", true).order("nombre"),
      supabase.from("inventario_ubicaciones").select("*").eq("activo", true),
      supabase.from("proyectos").select("id, nombre, codigo").order("nombre"),
    ])
    setEnvios(envs || [])
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

  function agregarLinea() {
    setLineas(prev => [...prev, { item_id: "", variante_id: "", cantidad_enviada: 1, observacion: "" }])
  }

  function updateLinea(idx: number, field: string, value: any) {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l
      if (field === "item_id") { cargarVariantes(value); return { ...l, item_id: value, variante_id: "" } }
      return { ...l, [field]: value }
    }))
  }

  function removeLinea(idx: number) {
    setLineas(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardar() {
    if (!form.tipo || !form.direccion_destino) { alert("Tipo y dirección de destino son obligatorios"); return }
    if (lineas.filter(l => l.item_id).length === 0) { alert("Agrega al menos un item"); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: envio } = await supabase.from("envios_materiales").insert({
      tipo: form.tipo,
      proyecto_id: form.proyecto_id || null,
      ubicacion_origen_id: form.ubicacion_origen_id || null,
      departamento: form.departamento || null,
      provincia: form.provincia || null,
      distrito: form.distrito || null,
      direccion_destino: form.direccion_destino,
      contacto_receptor: form.contacto_receptor || null,
      dni_receptor: form.dni_receptor || null,
      telefono_receptor: form.telefono_receptor || null,
      transportista: form.transportista || null,
      vehiculo_placa: form.vehiculo_placa || null,
      fecha_salida: form.fecha_salida || null,
      fecha_entrega_estimada: form.fecha_entrega_estimada || null,
      fecha_retorno_estimada: form.fecha_retorno_estimada || null,
      solicitado_por: user?.id,
      notas: form.notas || null,
      entidad: "peru",
    }).select().single()

    if (envio) {
      const its = lineas.filter(l => l.item_id).map(l => ({
        envio_id: envio.id,
        item_id: l.item_id,
        variante_id: l.variante_id || null,
        cantidad_enviada: parseInt(l.cantidad_enviada) || 1,
        cantidad_retornada: 0,
        observacion: l.observacion || null,
      }))
      await supabase.from("envio_items").insert(its)
    }
    await registrarAccion({ accion: "crear", modulo: "envios_materiales", entidad_tipo: "envio", descripcion: "Envío creado: " + form.tipo + " → " + form.direccion_destino })
    setSaving(false)
    setShowForm(false)
    setForm({ ...formVacio })
    setLineas([{ item_id: "", variante_id: "", cantidad_enviada: 1, observacion: "" }])
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const update: any = { estado, updated_at: new Date().toISOString() }
    if (estado === "aprobado") update.aprobado_por = user?.id
    if (estado === "entregado") update.fecha_entrega_real = new Date().toISOString().split("T")[0]
    if (estado === "retornado") update.fecha_retorno_real = new Date().toISOString().split("T")[0]
    await supabase.from("envios_materiales").update(update).eq("id", id)
    await registrarAccion({ accion: "cambiar_estado", modulo: "envios_materiales", entidad_id: id, entidad_tipo: "envio", descripcion: "Estado cambiado a: " + estado })
    load()
    if (selected?.id === id) setSelected((p: any) => ({ ...p, estado }))
  }

  async function registrarRetorno() {
    for (const [itemId, cant] of Object.entries(retornoCantidades)) {
      if (cant > 0) {
        await supabase.from("envio_items").update({ cantidad_retornada: cant }).eq("id", itemId)
      }
    }
    await cambiarEstado(selected.id, "retornado")
    setShowRetorno(false)
    setRetornoCantidades({})
    load()
  }

  async function abrirDetalle(envio: any) {
    setSelected(envio)
    const { data } = await supabase.from("envio_items").select("*, item:inventario_items(nombre), variante:inventario_variantes(nombre)").eq("envio_id", envio.id)
    setEnvioItems(data || [])
  }

  const puedeAprobar = perfil && ROLES_APROBADOR.includes(perfil.perfil)
  const enviosFiltrados = envios.filter(e => {
    if (filtroTipo && e.tipo !== filtroTipo) return false
    if (filtroEstado && e.estado !== filtroEstado) return false
    if (filtroDept && e.departamento !== filtroDept) return false
    return true
  })

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 80px)" }}>

      {/* ── PANEL IZQUIERDO ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Envíos de Materiales</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{envios.length} envíos registrados</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo envío</button>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select style={{ ...inp, width: "auto" }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroDept} onChange={e => setFiltroDept(e.target.value)}>
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS_PERU.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {enviosFiltrados.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No hay envíos registrados</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N° ENVÍO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESTINO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHAS</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                  <th style={{ padding: "10px 16px", width: 200 }}></th>
                </tr>
              </thead>
              <tbody>
                {enviosFiltrados.map((e, idx) => {
                  const tipo = TIPOS[e.tipo] || TIPOS.salida
                  const estado = ESTADOS[e.estado] || ESTADOS.borrador
                  const activo = selected?.id === e.id
                  return (
                    <tr key={e.id} onClick={() => abrirDetalle(e)}
                      style={{ borderTop: "1px solid #f3f4f6", background: activo ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", fontFamily: "monospace" }}>{e.numero_envio}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(e.created_at).toLocaleDateString("es-PE")}</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ background: tipo.bg, color: tipo.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                          {tipo.icon} {tipo.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{e.departamento || "—"}{e.provincia ? ` / ${e.provincia}` : ""}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{e.direccion_destino}</div>
                        {e.contacto_receptor && <div style={{ fontSize: 11, color: "#6b7280" }}>👤 {e.contacto_receptor}</div>}
                      </td>
                      <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>
                        {e.proyecto ? `${e.proyecto.codigo}` : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {e.fecha_salida && <div style={{ fontSize: 11, color: "#6b7280" }}>Salida: {e.fecha_salida}</div>}
                        {e.fecha_entrega_estimada && <div style={{ fontSize: 11, color: "#6b7280" }}>Entrega est.: {e.fecha_entrega_estimada}</div>}
                        {e.fecha_retorno_estimada && <div style={{ fontSize: 11, color: "#6b7280" }}>Retorno est.: {e.fecha_retorno_estimada}</div>}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ background: estado.bg, color: estado.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{estado.label}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }} onClick={ev => ev.stopPropagation()}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {puedeAprobar && e.estado === "borrador" && (
                            <button onClick={() => cambiarEstado(e.id, "aprobado")}
                              style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #dbeafe", borderRadius: 6, background: "#fff", color: "#1e40af", cursor: "pointer" }}>Aprobar</button>
                          )}
                          {e.estado === "aprobado" && (
                            <button onClick={() => cambiarEstado(e.id, "en_transito")}
                              style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #fde68a", borderRadius: 6, background: "#fff", color: "#92400e", cursor: "pointer" }}>En transito</button>
                          )}
                          {e.estado === "en_transito" && (
                            <button onClick={() => cambiarEstado(e.id, "entregado")}
                              style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #d1fae5", borderRadius: 6, background: "#fff", color: "#065f46", cursor: "pointer" }}>Entregado</button>
                          )}
                          {e.estado === "entregado" && e.tipo !== "salida" && (
                            <button onClick={() => { abrirDetalle(e); setShowRetorno(true) }}
                              style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #e9d5ff", borderRadius: 6, background: "#fff", color: "#6d28d9", cursor: "pointer" }}>Retorno</button>
                          )}
                          {["borrador", "aprobado"].includes(e.estado) && puedeAprobar && (
                            <button onClick={() => cambiarEstado(e.id, "cancelado")}
                              style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── PANEL DERECHO (detalle) ── */}
      {selected && (
        <div style={{ width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", fontFamily: "monospace" }}>{selected.numero_envio}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{TIPOS[selected.tipo]?.icon} {TIPOS[selected.tipo]?.label}</div>
            </div>
            <button onClick={() => { setSelected(null); setShowRetorno(false) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>×</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Estado", value: ESTADOS[selected.estado]?.label || selected.estado },
              { label: "Departamento", value: selected.departamento || "—" },
              { label: "Provincia", value: selected.provincia || "—" },
              { label: "Distrito", value: selected.distrito || "—" },
              { label: "Dirección", value: selected.direccion_destino || "—" },
              { label: "Contacto", value: selected.contacto_receptor || "—" },
              { label: "DNI receptor", value: selected.dni_receptor || "—" },
              { label: "Teléfono", value: selected.telefono_receptor || "—" },
              { label: "Transportista", value: selected.transportista || "—" },
              { label: "Placa", value: selected.vehiculo_placa || "—" },
              { label: "Origen", value: selected.ubicacion_origen?.nombre || "—" },
              { label: "Proyecto", value: selected.proyecto ? `${selected.proyecto.codigo} — ${selected.proyecto.nombre}` : "—" },
              { label: "Fecha salida", value: selected.fecha_salida || "—" },
              { label: "Entrega estimada", value: selected.fecha_entrega_estimada || "—" },
              { label: "Entrega real", value: selected.fecha_entrega_real || "—" },
              { label: "Retorno estimado", value: selected.fecha_retorno_estimada || "—" },
              { label: "Retorno real", value: selected.fecha_retorno_real || "—" },
              { label: "Solicitado por", value: selected.solicitante ? `${selected.solicitante.nombre} ${selected.solicitante.apellido}` : "—" },
              { label: "Aprobado por", value: selected.aprobador ? `${selected.aprobador.nombre} ${selected.aprobador.apellido}` : "—" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 6, borderBottom: "1px solid #f9fafb" }}>
                <span style={{ color: "#9ca3af", fontWeight: 600 }}>{r.label}</span>
                <span style={{ color: "#374151", textAlign: "right", maxWidth: 200 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {selected.notas && (
            <div style={{ marginBottom: 16, padding: 10, background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>NOTAS</div>
              <div style={{ fontSize: 12, color: "#374151" }}>{selected.notas}</div>
            </div>
          )}

          {/* Items del envío */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>MATERIALES ({envioItems.length})</div>
            {envioItems.map(it => (
              <div key={it.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{it.item?.nombre}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>× {it.cantidad_enviada}</span>
                </div>
                {it.variante && <div style={{ fontSize: 11, color: "#9ca3af" }}>{it.variante.nombre}</div>}
                {it.observacion && <div style={{ fontSize: 11, color: "#6b7280" }}>{it.observacion}</div>}
                {it.cantidad_retornada > 0 && (
                  <div style={{ fontSize: 11, color: "#6d28d9", fontWeight: 600 }}>Retornado: {it.cantidad_retornada}</div>
                )}
              </div>
            ))}
          </div>

          {/* Formulario retorno */}
          {showRetorno && selected.estado === "entregado" && (
            <div style={{ marginTop: 16, padding: 14, background: "#f5f3ff", border: "1px solid #e9d5ff", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", marginBottom: 10 }}>Registrar retorno de materiales</div>
              {envioItems.map(it => (
                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{it.item?.nombre} (enviado: {it.cantidad_enviada})</span>
                  <input type="number" min="0" max={it.cantidad_enviada}
                    style={{ ...inp, width: 70, textAlign: "center" }}
                    value={retornoCantidades[it.id] ?? 0}
                    onChange={e => setRetornoCantidades(prev => ({ ...prev, [it.id]: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setShowRetorno(false)} className="btn-secondary" style={{ fontSize: 12, flex: 1 }}>Cancelar</button>
                <button onClick={registrarRetorno}
                  style={{ flex: 1, padding: "7px", background: "#6d28d9", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  Confirmar retorno
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL NUEVO ENVÍO ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>Nuevo envío de materiales</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {/* Tipo */}
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(TIPOS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, tipo: k })}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: form.tipo === k ? `2px solid ${v.color}` : "1px solid #e5e7eb", background: form.tipo === k ? v.bg : "#fff", color: form.tipo === k ? v.color : "#6b7280", fontWeight: form.tipo === k ? 700 : 400, cursor: "pointer", fontSize: 13 }}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>PROYECTO (opcional)</label>
                  <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                    <option value="">Sin proyecto</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>ALMACÉN ORIGEN</label>
                  <select style={inp} value={form.ubicacion_origen_id} onChange={e => setForm({ ...form, ubicacion_origen_id: e.target.value })}>
                    <option value="">Seleccionar almacén</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Destino */}
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 }}>📍 Destino</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 10 }}>
                  <div>
                    <label style={lbl}>DEPARTAMENTO</label>
                    <select style={inp} value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })}>
                      <option value="">Seleccionar</option>
                      {DEPARTAMENTOS_PERU.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>PROVINCIA</label>
                    <input style={inp} value={form.provincia} placeholder="Provincia" onChange={e => setForm({ ...form, provincia: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>DISTRITO</label>
                    <input style={inp} value={form.distrito} placeholder="Distrito" onChange={e => setForm({ ...form, distrito: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>DIRECCIÓN EXACTA *</label>
                  <input style={inp} value={form.direccion_destino} placeholder="Av., calle, número, referencia..." onChange={e => setForm({ ...form, direccion_destino: e.target.value })} />
                </div>
              </div>

              {/* Receptor */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>CONTACTO RECEPTOR</label>
                  <input style={inp} value={form.contacto_receptor} placeholder="Nombre completo" onChange={e => setForm({ ...form, contacto_receptor: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>DNI RECEPTOR</label>
                  <input style={inp} value={form.dni_receptor} placeholder="DNI" onChange={e => setForm({ ...form, dni_receptor: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>TELÉFONO RECEPTOR</label>
                  <input style={inp} value={form.telefono_receptor} placeholder="9xxxxxxxx" onChange={e => setForm({ ...form, telefono_receptor: e.target.value })} />
                </div>
              </div>

              {/* Transporte */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>TRANSPORTISTA</label>
                  <input style={inp} value={form.transportista} placeholder="Nombre o empresa" onChange={e => setForm({ ...form, transportista: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>PLACA VEHÍCULO</label>
                  <input style={inp} value={form.vehiculo_placa} placeholder="ABC-123" onChange={e => setForm({ ...form, vehiculo_placa: e.target.value })} />
                </div>
              </div>

              {/* Fechas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FECHA SALIDA</label>
                  <input type="date" style={inp} value={form.fecha_salida} onChange={e => setForm({ ...form, fecha_salida: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>ENTREGA ESTIMADA</label>
                  <input type="date" style={inp} value={form.fecha_entrega_estimada} onChange={e => setForm({ ...form, fecha_entrega_estimada: e.target.value })} />
                </div>
                {form.tipo !== "salida" && (
                  <div>
                    <label style={lbl}>RETORNO ESTIMADO</label>
                    <input type="date" style={inp} value={form.fecha_retorno_estimada} onChange={e => setForm({ ...form, fecha_retorno_estimada: e.target.value })} />
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={lbl}>MATERIALES *</label>
                  <button onClick={agregarLinea} style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>+ Agregar</button>
                </div>
                {lineas.map((l, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                    <div>
                      <label style={lbl}>ITEM</label>
                      <select style={inp} value={l.item_id} onChange={e => updateLinea(i, "item_id", e.target.value)}>
                        <option value="">Seleccionar</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>VARIANTE</label>
                      <select style={inp} value={l.variante_id} onChange={e => updateLinea(i, "variante_id", e.target.value)} disabled={!l.item_id}>
                        <option value="">Sin variante</option>
                        {(variantes[l.item_id] || []).map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>CANT.</label>
                      <input type="number" min="1" style={inp} value={l.cantidad_enviada} onChange={e => updateLinea(i, "cantidad_enviada", e.target.value)} />
                    </div>
                    <button onClick={() => removeLinea(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, paddingBottom: 4 }}>×</button>
                  </div>
                ))}
              </div>

              <div>
                <label style={lbl}>NOTAS</label>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.notas} placeholder="Instrucciones especiales, observaciones..." onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : "Crear envío"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
