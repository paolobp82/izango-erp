"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/purity, react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
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
  en_transito: { label: "En tránsito", bg: "#fef9c3", color: "#92400e" },
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
      supabase.from("envios_materiales").select("*, proyecto:proyectos(nombre,codigo,deleted_at), ubicacion_origen:inventario_ubicaciones!ubicacion_origen_id(nombre), solicitante:perfiles!solicitado_por(nombre,apellido), aprobador:perfiles!aprobado_por(nombre,apellido), envio_items(*, item:inventario_items(nombre), variante:inventario_variantes(nombre))").order("created_at", { ascending: false }),
      supabase.from("inventario_items").select("*, inventario_variantes(*)").eq("activo", true).order("nombre"),
      supabase.from("inventario_ubicaciones").select("*").eq("activo", true),
      supabase.from("proyectos").select("id, nombre, codigo").is("deleted_at", null).order("nombre"),
    ])
    setEnvios((envs || []).filter((envio: any) => !rowBelongsToDeletedProject(envio)))
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
    if (lineas.filter(l => l.item_id).length === 0) { alert("Agrega al menos un ítem"); return }
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
        await supabase.from("envio_items").update({ cantidad_retornada: cant }).eq("id", selected.id)
      }
    }
    await cambiarEstado(selected.id, "retornado")
    setShowRetorno(false)
    setRetornoCantidades({})
    load()
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

  async function subirArchivoEnvio(file: File, carpeta: string) {
    const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const path = `envios-materiales/${carpeta}/${Date.now()}-${nombreSeguro}`
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from("assets").getPublicUrl(path)
    return data.publicUrl
  }

  async function registrarEntregaEnvio(envio: any) {
    const recibidoPor = prompt("¿Quién recibió el envío?", envio.contacto_receptor || "")
    if (!recibidoPor) return

    const fechaReal = prompt("Fecha real de entrega (YYYY-MM-DD)", new Date().toISOString().slice(0, 10))
    if (!fechaReal) return

    alert("Selecciona el cargo firmado en PDF/JPG/PNG.")
    const cargoFirmado = await seleccionarArchivoEntrega(".pdf,.jpg,.jpeg,.png")
    if (!cargoFirmado) return

    alert("Selecciona la evidencia fotográfica o archivo adicional. Puedes cancelar si no aplica.")
    const evidencia = await seleccionarArchivoEntrega(".pdf,.jpg,.jpeg,.png")

    try {
      const cargoUrl = await subirArchivoEnvio(cargoFirmado, "cargos-firmados")
      const evidenciaUrl = evidencia ? await subirArchivoEnvio(evidencia, "evidencias") : null

      const { error } = await supabase.from("envios_materiales").update({
        cargo_firmado_url: cargoUrl,
        evidencia_url: evidenciaUrl,
        recibido_por: recibidoPor,
        fecha_entrega_real: fechaReal,
        estado: "entregado",
        updated_at: new Date().toISOString(),
      }).eq("id", envio.id)

      if (error) {
        alert("Error registrando entrega: " + error.message)
        return
      }

      await registrarAccion({
        accion: "registrar_entrega",
        modulo: "envios_materiales",
        entidad_id: envio.id,
        entidad_tipo: "envio",
        descripcion: "Entrega registrada con cargo firmado y evidencia"
      })

      alert("Entrega registrada correctamente.")
      load()
      if (selected?.id === envio.id) {
        setSelected((p: any) => ({
          ...p,
          cargo_firmado_url: cargoUrl,
          evidencia_url: evidenciaUrl,
          recibido_por: recibidoPor,
          fecha_entrega_real: fechaReal,
          estado: "entregado",
        }))
      }
    } catch (error: any) {
      alert("Error subiendo evidencia: " + (error?.message || error))
    }
  }

  function imprimirCargo(envio: any) {
    const html = `
  <html>
  <head>
    <title>Cargo Logístico</title>
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
    <h1>CARGO DE ENTREGA DE MATERIALES</h1>

    <div class="box">
      <b>N° Envío:</b> ${envio.numero_envio || "-"}<br/>
      <b>Proyecto:</b> ${envio.proyecto?.codigo || "-"}<br/>
      <b>Dirección:</b> ${envio.direccion_destino || "-"}<br/>
      <b>Receptor:</b> ${envio.contacto_receptor || "-"}<br/>
      <b>DNI:</b> ${envio.dni_receptor || "-"}<br/>
      <b>Teléfono:</b> ${envio.telefono_receptor || "-"}<br/>
      <b>Fecha:</b> ${envio.fecha_salida || "-"}
    </div>

    <p>Se deja constancia de la recepción de los materiales detallados en la presente guía logística.</p>

    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Cantidad</th>
          <th>Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${(envio.envio_items || []).map((i:any)=>`
          <tr>
            <td>${i.item?.nombre || "-"}</td>
            <td>${i.cantidad_enviada || 0}</td>
            <td>${i.observacion || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="firma">
      <div>
        _______________________<br/>
        Entregado por (Firma)
      </div>
      <div>
        _______________________<br/>
        Recibido por (Firma y DNI)
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

  const esAprobador = ROLES_APROBADOR.includes(perfil?.perfil)
  const filtrados = envios.filter(e => {
    if (filtroTipo && e.tipo !== filtroTipo) return false
    if (filtroEstado && e.estado !== filtroEstado) return false
    if (filtroDept && e.departamento !== filtroDept) return false
    return true
  })

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando envíos de materiales...
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    {
      key: "tipo",
      header: "Tipo",
      render: (e) => {
        const tp = TIPOS[e.tipo] || TIPOS.salida
        return (
          <span style={{ background: tp.bg, color: tp.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            {tp.icon} {tp.label}
          </span>
        )
      },
    },
    {
      key: "proyecto",
      header: "Proyecto",
      render: (e) => <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>{e.proyecto?.codigo || "—"}</span>,
    },
    {
      key: "destino",
      header: "Destino",
      render: (e) => (
        <div>
          <div style={{ fontSize: 13, color: "var(--v2-text)" }}>{e.direccion_destino}</div>
          <div style={{ fontSize: 11.5, color: "var(--v2-muted)" }}>{[e.distrito, e.provincia, e.departamento].filter(Boolean).join(", ")}</div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Ítems",
      align: "center",
      render: (e) => <span style={{ fontWeight: 700, fontSize: 13, color: "var(--v2-text)" }}>{e.envio_items?.length || 0}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      render: (e) => {
        const est = ESTADOS[e.estado] || ESTADOS.borrador
        return (
          <select
            value={e.estado}
            onChange={(ev) => cambiarEstado(e.id, ev.target.value)}
            disabled={!esAprobador && e.estado !== "borrador"}
            style={{ padding: "4px 8px", borderRadius: "var(--v2-radius-sm)", border: "1px solid var(--v2-border)", background: est.bg, color: est.color, fontSize: 12, fontWeight: 700 }}
          >
            {Object.entries(ESTADOS).map(([k, v]: any) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        )
      },
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (e) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <V2Button variant="ghost" size="compact" onClick={() => setSelected(e)}>
            Ver detalle
          </V2Button>
          <V2Button variant="ghost" size="compact" onClick={() => imprimirCargo(e)}>
            Cargo PDF
          </V2Button>
          {["aprobado", "en_transito", "entregado"].includes(e.estado) && (
            <V2Button variant="secondary" size="compact" onClick={() => registrarEntregaEnvio(e)}>
              Entrega
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
            eyebrow="Logística"
            title="Envíos de Materiales"
            subtitle={`${filtrados.length} envíos a provincia y locales registrados`}
            actions={
              <V2Button variant="primary" onClick={() => { setForm({ ...formVacio }); setShowForm(true) }}>
                + Nuevo envío
              </V2Button>
            }
          />
        }
        toolbar={
          <V2FilterBar
            searchValue=""
            onSearchChange={() => {}}
            activeFiltersCount={(filtroTipo ? 1 : 0) + (filtroEstado ? 1 : 0) + (filtroDept ? 1 : 0)}
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
                      { label: "Salida", value: "salida" },
                      { label: "Retorno", value: "retorno" },
                      { label: "Traslado", value: "traslado" },
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
                      ...Object.entries(ESTADOS).map(([k, v]: any) => ({ label: v.label, value: k })),
                    ]}
                  />
                </div>
                <div style={{ width: 180 }}>
                  <V2Select
                    compact
                    value={filtroDept}
                    onChange={(e) => setFiltroDept(e.target.value)}
                    options={[
                      { label: "Todos los depto.", value: "" },
                      ...DEPARTAMENTOS_PERU.map((d) => ({ label: d, value: d })),
                    ]}
                  />
                </div>
              </>
            }
            showClearButton={Boolean(filtroTipo || filtroEstado || filtroDept)}
            onClearFilters={() => {
              setFiltroTipo("")
              setFiltroEstado("")
              setFiltroDept("")
            }}
          />
        }
        table={
          <V2DataTable
            columns={columns}
            rows={filtrados}
            getRowKey={(e) => e.id}
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay envíos registrados.
              </div>
            }
          />
        }
      />

      {/* Detalle modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Detalle del envío #{selected.numero_envio || selected.id.slice(0, 8)}</h2>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>Proyecto</label><div style={{ fontSize: 13, color: "var(--v2-text)" }}>{selected.proyecto?.nombre || "Sin proyecto"}</div></div>
              <div><label style={lbl}>Destino</label><div style={{ fontSize: 13, color: "var(--v2-text)" }}>{selected.direccion_destino}</div></div>
              <div><label style={lbl}>Receptor</label><div style={{ fontSize: 13, color: "var(--v2-text)" }}>{selected.contacto_receptor || "—"} ({selected.telefono_receptor || "—"})</div></div>
              <div><label style={lbl}>Transportista</label><div style={{ fontSize: 13, color: "var(--v2-text)" }}>{selected.transportista || "—"} / {selected.vehiculo_placa || "—"}</div></div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--v2-muted)", marginBottom: 8, textTransform: "uppercase" }}>Ítems enviados ({selected.envio_items?.length || 0})</div>
            <div style={{ display: "grid", gap: 6, marginBottom: 20 }}>
              {(selected.envio_items || []).map((it: any) => (
                <div key={it.id} style={{ background: "var(--v2-surface-subtle)", padding: "8px 12px", borderRadius: "var(--v2-radius-sm)", display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>{it.item?.nombre} {it.variante ? `(${it.variante.nombre})` : ""}</span>
                  <span style={{ fontWeight: 700 }}>{it.cantidad_enviada} unid. {it.cantidad_retornada > 0 ? `(Retornadas: ${it.cantidad_retornada})` : ""}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              {selected.tipo === "salida" && selected.estado === "entregado" && (
                <V2Button variant="secondary" onClick={() => setShowRetorno(true)}>Registrar retorno</V2Button>
              )}
              <V2Button variant="ghost" onClick={() => setSelected(null)}>Cerrar</V2Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo envío */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 780, maxHeight: "92vh", overflowY: "auto", boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Nuevo envío de materiales</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Tipo *</label><select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="salida">Salida a provincia / obra</option><option value="retorno">Retorno a almacén</option><option value="traslado">Traslado entre sedes</option></select></div>
                <div><label style={lbl}>Proyecto</label><select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}><option value="">Sin proyecto</option>{proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}</select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Departamento</label><select style={inp} value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })}><option value="">Seleccionar</option>{DEPARTAMENTOS_PERU.map(d => <option key={d}>{d}</option>)}</select></div>
                <div><label style={lbl}>Provincia</label><input style={inp} value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} /></div>
                <div><label style={lbl}>Distrito</label><input style={inp} value={form.distrito} onChange={e => setForm({ ...form, distrito: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Dirección de destino *</label><input style={inp} value={form.direccion_destino} placeholder="Dirección exacta de la obra o almacén" onChange={e => setForm({ ...form, direccion_destino: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Contacto receptor</label><input style={inp} value={form.contacto_receptor} onChange={e => setForm({ ...form, contacto_receptor: e.target.value })} /></div>
                <div><label style={lbl}>DNI receptor</label><input style={inp} value={form.dni_receptor} onChange={e => setForm({ ...form, dni_receptor: e.target.value })} /></div>
                <div><label style={lbl}>Teléfono receptor</label><input style={inp} value={form.telefono_receptor} onChange={e => setForm({ ...form, telefono_receptor: e.target.value })} /></div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)", marginTop: 8 }}>Ítems a enviar</div>
              {lineas.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 1fr auto", gap: 8, alignItems: "end" }}>
                  <div>
                    <select style={inp} value={l.item_id} onChange={e => updateLinea(i, "item_id", e.target.value)}>
                      <option value="">Seleccionar ítem</option>
                      {items.map(it => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <select style={inp} value={l.variante_id} onChange={e => updateLinea(i, "variante_id", e.target.value)} disabled={!l.item_id}>
                      <option value="">Sin variante</option>
                      {(variantes[l.item_id] || []).map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                    </select>
                  </div>
                  <div><input style={inp} type="number" min="1" value={l.cantidad_enviada} onChange={e => updateLinea(i, "cantidad_enviada", e.target.value)} /></div>
                  <div><input style={inp} placeholder="Observaciones" value={l.observacion} onChange={e => updateLinea(i, "observacion", e.target.value)} /></div>
                  <button onClick={() => removeLinea(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--v2-danger)", fontSize: 18 }}>×</button>
                </div>
              ))}
              <V2Button variant="ghost" size="compact" onClick={agregarLinea}>+ Agregar ítem</V2Button>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Crear envío"}</V2Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal retorno */}
      {showRetorno && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 560, boxShadow: "var(--v2-shadow-lg)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "var(--v2-text)" }}>Registrar retorno de materiales</h3>
            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              {(selected.envio_items || []).map((it: any) => (
                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>{it.item?.nombre} (Enviados: {it.cantidad_enviada})</span>
                  <input
                    type="number"
                    min="0"
                    max={it.cantidad_enviada}
                    style={{ ...inp, width: 90 }}
                    value={retornoCantidades[it.id] || 0}
                    onChange={e => setRetornoCantidades({ ...retornoCantidades, [it.id]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <V2Button variant="ghost" onClick={() => setShowRetorno(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={registrarRetorno}>Confirmar retorno</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
