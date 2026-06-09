"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import { useRouter } from "next/navigation"

const ESTADOS: Record<string, any> = {
  pendiente:    { label: "Pendiente",    bg: "#fef9c3", color: "#92400e" },
  en_progreso:  { label: "En progreso",  bg: "#dbeafe", color: "#1e40af" },
  completada:   { label: "Completada",   bg: "#dcfce7", color: "#15803d" },
  cancelada:    { label: "Cancelada",    bg: "#fee2e2", color: "#991b1b" },
}

const PRIORIDADES: Record<string, any> = {
  baja:    { label: "Baja",    bg: "#f3f4f6", color: "#6b7280" },
  media:   { label: "Media",   bg: "#fef9c3", color: "#92400e" },
  alta:    { label: "Alta",    bg: "#fed7aa", color: "#9a3412" },
  urgente: { label: "Urgente", bg: "#fee2e2", color: "#991b1b" },
}

const AV_ESTADOS: Record<string, any> = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  en_progreso: { label: "En progreso", bg: "#dbeafe", color: "#1e40af" },
  en_revision: { label: "En revision", bg: "#f5f3ff", color: "#6d28d9" },
  completado: { label: "Completado", bg: "#dcfce7", color: "#15803d" },
  cancelado: { label: "Cancelado", bg: "#fee2e2", color: "#991b1b" },
}

const formVacio = {
  titulo: "", descripcion: "", estado: "pendiente", prioridad: "media",
  proyecto_id: "", cliente_id: "", asignado_a: "", fecha_limite: "",
}

export default function TareasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tareas, setTareas] = useState<any[]>([])
  const [audiovisuales, setAudiovisuales] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 50
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingCom, setSavingCom] = useState(false)
  const [form, setForm] = useState({ ...formVacio })
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroAsignado, setFiltroAsignado] = useState("mias")
  const [responsableId, setResponsableId] = useState("")
  const [ordenCampo, setOrdenCampo] = useState("fecha_limite")
  const [ordenDir, setOrdenDir] = useState("asc")
  const [avResponsableId, setAvResponsableId] = useState("")
  const [avProyectoId, setAvProyectoId] = useState("")
  const [avPrioridad, setAvPrioridad] = useState("todos")
  const [avAvance, setAvAvance] = useState("todos")
  const [avEstado, setAvEstado] = useState("activos")
  const [avFecha, setAvFecha] = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    const proyectoIdParam = new URLSearchParams(window.location.search).get("proyecto_id") || ""
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
      setFiltroAsignado("mias")
    } else {
      setFiltroAsignado("todos")
    }
    const { data: t } = await supabase
      .from("tareas")
      .select("*, proyecto:proyectos(nombre, codigo), cliente:clientes(razon_social), asignado:perfiles!asignado_a(nombre, apellido), creador:perfiles!creado_por(nombre, apellido)")
      .order("created_at", { ascending: false })
    setTareas(t || [])
    const { data: av } = await supabase
      .from("audiovisual_requerimientos")
      .select("*, proyecto:proyectos(id,nombre,codigo), productor:perfiles!productor_id(nombre,apellido), responsable:perfiles!responsable_audiovisual_id(nombre,apellido)")
      .order("fecha_entrega_solicitada", { ascending: true })
    setAudiovisuales(av || [])
    const { data: pr } = await supabase.from("proyectos").select("id, nombre, codigo").order("nombre")
    setProyectos(pr || [])
    const { data: cl } = await supabase.from("clientes").select("id, razon_social").order("razon_social")
    setClientes(cl || [])
    const { data: us } = await supabase.from("perfiles").select("id, nombre, apellido, perfil").order("nombre")
    setUsuarios(us || [])
    if (proyectoIdParam) {
      setEditando(null)
      setForm({ ...formVacio, proyecto_id: proyectoIdParam })
      setShowForm(true)
    }
    setLoading(false)
  }

  async function loadComentarios(tareaId: string) {
    const { data } = await supabase
      .from("tarea_comentarios")
      .select("*, usuario:perfiles(nombre, apellido)")
      .eq("tarea_id", tareaId)
      .order("created_at", { ascending: true })
    setComentarios(data || [])
  }

  function abrirNueva() {
    setEditando(null)
    setForm({ ...formVacio })
    setShowForm(true)
  }

  function abrirEditar(t: any) {
    setEditando(t)
    setForm({
      titulo: t.titulo || "",
      descripcion: t.descripcion || "",
      estado: t.estado || "pendiente",
      prioridad: t.prioridad || "media",
      proyecto_id: t.proyecto_id || "",
      cliente_id: t.cliente_id || "",
      asignado_a: t.asignado_a || "",
      fecha_limite: t.fecha_limite || "",
    })
    setShowForm(true)
  }

  async function abrirDetalle(t: any) {
    setSelected(t)
    await loadComentarios(t.id)
  }

  async function guardar() {
    if (!form.titulo) { alert("El título es obligatorio"); return }
    setSaving(true)
    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      estado: form.estado,
      prioridad: form.prioridad,
      proyecto_id: form.proyecto_id || null,
      cliente_id: form.cliente_id || null,
      asignado_a: form.asignado_a || null,
      fecha_limite: form.fecha_limite || null,
      creado_por: perfil?.id || null,
      fecha_completada: form.estado === "completada" ? new Date().toISOString() : null,
    }
    if (editando) {
      await supabase.from("tareas").update(payload).eq("id", editando.id)
      await registrarAccion({ accion: "editar", modulo: "tareas", entidad_tipo: "tarea", descripcion: "Tarea editada: " + form.titulo })
    } else {
      await supabase.from("tareas").insert(payload)
      await registrarAccion({ accion: "crear", modulo: "tareas", entidad_tipo: "tarea", descripcion: "Tarea creada: " + form.titulo })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    const payload: any = { estado }
    if (estado === "completada") payload.fecha_completada = new Date().toISOString()
    await supabase.from("tareas").update(payload).eq("id", id)
    setTareas(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t))
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, ...payload }))
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return
    await supabase.from("tareas").delete().eq("id", id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function agregarComentario() {
    if (!nuevoComentario.trim() || !selected) return
    setSavingCom(true)
    await supabase.from("tarea_comentarios").insert({
      tarea_id: selected.id,
      usuario_id: perfil?.id,
      comentario: nuevoComentario.trim(),
    })
    setNuevoComentario("")
    await loadComentarios(selected.id)
    setSavingCom(false)
  }

  async function eliminarComentario(id: string) {
    await supabase.from("tarea_comentarios").delete().eq("id", id)
    await loadComentarios(selected.id)
  }

  const tareasFiltradas = tareas.filter(t => {
    if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false
    if (filtroAsignado === "mias" && t.asignado_a !== perfil?.id) return false
    if (filtroAsignado === "responsable" && t.asignado_a !== responsableId) return false
    if (filtroAsignado === "creadas" && t.creado_por !== perfil?.id) return false
    return true
  }).sort((a, b) => {
    let valA: any = "", valB: any = ""
    if (ordenCampo === "titulo") { valA = a.titulo || ""; valB = b.titulo || "" }
    else if (ordenCampo === "proyecto") { valA = a.proyecto?.codigo || ""; valB = b.proyecto?.codigo || "" }
    else if (ordenCampo === "cliente") { valA = a.cliente?.razon_social || ""; valB = b.cliente?.razon_social || "" }
    else if (ordenCampo === "prioridad") { const ord: any = { urgente: 0, alta: 1, media: 2, baja: 3 }; valA = ord[a.prioridad] ?? 2; valB = ord[b.prioridad] ?? 2 }
    else if (ordenCampo === "asignado") { valA = a.asignado ? a.asignado.nombre + a.asignado.apellido : ""; valB = b.asignado ? b.asignado.nombre + b.asignado.apellido : "" }
    else if (ordenCampo === "estado") { valA = a.estado || ""; valB = b.estado || "" }
    else if (ordenCampo === "fecha_limite") { valA = a.fecha_limite || "9999"; valB = b.fecha_limite || "9999" }
    if (valA < valB) return ordenDir === "asc" ? -1 : 1
    if (valA > valB) return ordenDir === "asc" ? 1 : -1
    return 0
  })

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  const hoy = new Date().toISOString().split("T")[0]
  const estaVencida = (t: any) => t.fecha_limite && t.fecha_limite < hoy && t.estado !== "completada" && t.estado !== "cancelada"
  const enProximaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const rolesGerenciales = ["superadmin", "gerente_general", "gerente_produccion", "gerente_operaciones", "project_manager"]
  const puedeVerEquipo = rolesGerenciales.includes(perfil?.perfil)
  const puedeFiltrarAudiovisual = puedeVerEquipo || perfil?.perfil === "productor"
  const esSolicitanteAudiovisual = (r: any) => r.productor_id === perfil?.id || r.creado_por === perfil?.id
  const audiovisualesFiltrados = audiovisuales.filter(r => {
    if (!puedeVerEquipo && perfil?.perfil === "productor" && !esSolicitanteAudiovisual(r)) return false
    if (!puedeVerEquipo && perfil?.perfil !== "productor") {
      if (r.responsable_audiovisual_id !== perfil?.id && !esSolicitanteAudiovisual(r)) return false
      if (["completado", "cancelado"].includes(r.estado)) return false
    }
    if (puedeFiltrarAudiovisual && avResponsableId && r.responsable_audiovisual_id !== avResponsableId) return false
    if (puedeFiltrarAudiovisual && avProyectoId && r.proyecto_id !== avProyectoId) return false
    if (puedeFiltrarAudiovisual && avPrioridad !== "todos" && r.prioridad !== avPrioridad) return false
    if (puedeFiltrarAudiovisual && avAvance !== "todos" && String(r.avance) !== avAvance) return false
    if (puedeFiltrarAudiovisual && avEstado === "activos" && ["completado", "cancelado"].includes(r.estado)) return false
    if (puedeFiltrarAudiovisual && avEstado !== "activos" && avEstado !== "todos" && r.estado !== avEstado) return false
    if (puedeFiltrarAudiovisual && avFecha && r.fecha_entrega_solicitada !== avFecha) return false
    return true
  })
  const misTareas = perfil?.id ? tareas.filter(t => t.asignado_a === perfil.id) : tareas
  const responsableSeleccionado = usuarios.find(u => u.id === responsableId)
  const nombreResponsable = responsableSeleccionado ? `${responsableSeleccionado.nombre} ${responsableSeleccionado.apellido}` : "responsable"
  const subtituloTrabajo =
    filtroAsignado === "mias"
      ? `${misTareas.length} tareas asignadas a mí`
      : filtroAsignado === "responsable"
        ? `${tareasFiltradas.length} tareas de ${nombreResponsable}`
        : `${tareasFiltradas.length} tareas del equipo`
  const misPendientes = misTareas.filter(t => t.estado === "pendiente").length
  const misEnProgreso = misTareas.filter(t => t.estado === "en_progreso").length
  const misVencidas = misTareas.filter(estaVencida).length
  const proximasEntregas = misTareas.filter(t =>
    t.fecha_limite &&
    t.fecha_limite >= hoy &&
    t.fecha_limite <= enProximaSemana &&
    t.estado !== "completada" &&
    t.estado !== "cancelada"
  ).length
  const audiovisualesPendientes = audiovisualesFiltrados.filter(r => !["completado", "cancelado"].includes(r.estado)).length

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 80px)" }}>

      {/* ── PANEL IZQUIERDO ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Mi trabajo</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              {subtituloTrabajo}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/audiovisual/requerimientos")} className="btn-secondary" style={{ fontSize: 13 }}>Req. audiovisual</button>
            <button onClick={abrirNueva} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva tarea</button>
          </div>
        </div>

        {/* Dashboard personal */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Mis tareas pendientes", value: misPendientes, ...ESTADOS.pendiente },
            { label: "Mis tareas en progreso", value: misEnProgreso, ...ESTADOS.en_progreso },
            { label: "Mis tareas vencidas", value: misVencidas, bg: "#fee2e2", color: "#991b1b" },
            { label: "Próximas entregas", value: proximasEntregas, bg: "#f0fdf4", color: "#15803d" },
          ].map(c => (
            <div key={c.label} className="card" style={{ background: c.bg, border: "none", padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: "uppercase" }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#111827" }}>Pendientes audiovisuales</h2>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "3px 0 0" }}>
                {audiovisualesPendientes} requerimiento{audiovisualesPendientes !== 1 ? "s" : ""} operativo{audiovisualesPendientes !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={() => router.push("/audiovisual/requerimientos")} className="btn-secondary" style={{ fontSize: 12 }}>Abrir modulo</button>
          </div>

          {puedeFiltrarAudiovisual && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <select style={{ ...inp, width: "auto" }} value={avResponsableId} onChange={e => setAvResponsableId(e.target.value)}>
                <option value="">Todos los responsables</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
              </select>
              <select style={{ ...inp, width: "auto" }} value={avProyectoId} onChange={e => setAvProyectoId(e.target.value)}>
                <option value="">Todos los proyectos</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
              </select>
              <select style={{ ...inp, width: "auto" }} value={avPrioridad} onChange={e => setAvPrioridad(e.target.value)}>
                <option value="todos">Todas las prioridades</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <select style={{ ...inp, width: "auto" }} value={avAvance} onChange={e => setAvAvance(e.target.value)}>
                <option value="todos">Todos los avances</option>
                {[10,20,30,40,50,60,70,80,90,100].map(n => <option key={n} value={n}>{n}%</option>)}
              </select>
              <select style={{ ...inp, width: "auto" }} value={avEstado} onChange={e => setAvEstado(e.target.value)}>
                <option value="activos">Activos</option>
                <option value="todos">Todos los estados</option>
                {Object.entries(AV_ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input style={{ ...inp, width: "auto" }} type="date" value={avFecha} onChange={e => setAvFecha(e.target.value)} />
            </div>
          )}

          {audiovisualesFiltrados.length === 0 ? (
            <div style={{ padding: "18px 12px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay requerimientos audiovisuales pendientes para estos filtros</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280", width: 96 }}>TIPO</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280" }}>PROYECTO</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, color: "#6b7280" }}>PRIORIDAD</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, color: "#6b7280" }}>AVANCE</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280" }}>RESPONSABLE</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, color: "#6b7280" }}>ENTREGA</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {audiovisualesFiltrados.slice(0, 8).map(r => {
                  const pr = PRIORIDADES[r.prioridad] || PRIORIDADES.media
                  const es = AV_ESTADOS[r.estado] || AV_ESTADOS.pendiente
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "9px 10px" }}><span style={{ background: "#eef2ff", color: "#3730a3", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99 }}>Audiovisual</span></td>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{r.proyecto?.codigo || "-"}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{r.proyecto?.nombre || "-"}</div>
                      </td>
                      <td style={{ padding: "9px 10px", textAlign: "center" }}><span style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{pr.label}</span></td>
                      <td style={{ padding: "9px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: es.color, marginBottom: 3 }}>{r.avance || 10}%</div>
                        <div style={{ width: 54, height: 5, background: "#e5e7eb", borderRadius: 99, margin: "0 auto", overflow: "hidden" }}>
                          <div style={{ width: `${r.avance || 10}%`, height: "100%", background: es.color }} />
                        </div>
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: 12, color: "#374151" }}>{r.responsable ? `${r.responsable.nombre} ${r.responsable.apellido}` : "Sin responsable"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>{r.fecha_entrega_solicitada || "-"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right" }}>
                        <button onClick={() => router.push(`/audiovisual/requerimientos?requerimiento_id=${r.id}`)} className="btn-secondary" style={{ fontSize: 11 }}>Abrir</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroAsignado} onChange={e => {
            setFiltroAsignado(e.target.value)
            if (e.target.value !== "responsable") setResponsableId("")
          }}>
            <option value="mias">Mi trabajo</option>
            {puedeVerEquipo && <option value="todos">Todas las tareas</option>}
            {puedeVerEquipo && <option value="responsable">Por responsable</option>}
          </select>
          {puedeVerEquipo && filtroAsignado === "responsable" && (
            <select style={{ ...inp, width: "auto" }} value={responsableId} onChange={e => setResponsableId(e.target.value)}>
              <option value="">Seleccionar responsable</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          )}
          <select style={{ ...inp, width: "auto" }} value={ordenCampo} onChange={e => setOrdenCampo(e.target.value)}>
            <option value="fecha_limite">Ordenar: Fecha límite</option>
            <option value="titulo">Ordenar: Título</option>
            <option value="proyecto">Ordenar: Proyecto</option>
            <option value="cliente">Ordenar: Cliente</option>
            <option value="prioridad">Ordenar: Prioridad</option>
            <option value="asignado">Ordenar: Asignado a</option>
            <option value="estado">Ordenar: Estado</option>
          </select>
          <select style={{ ...inp, width: "auto" }} value={ordenDir} onChange={e => setOrdenDir(e.target.value)}>
            <option value="asc">↑ Ascendente</option>
            <option value="desc">↓ Descendente</option>
          </select>
        </div>
        {/* Lista de tareas */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {tareasFiltradas.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay tareas con estos filtros</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1D2040" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#fff" }}>TÍTULO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 120 }}>PROYECTO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 150 }}>CLIENTE</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 90 }}>PRIORIDAD</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 130 }}>ASIGNADO A</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#03E373", width: 110 }}>ESTADO</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fff", width: 100 }}>FECHA LÍMITE</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {tareasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((t, idx) => {
                  const es = ESTADOS[t.estado] || ESTADOS.pendiente
                  const pr = PRIORIDADES[t.prioridad] || PRIORIDADES.media
                  const vencida = estaVencida(t)
                  return (
                    <tr key={t.id} onClick={() => abrirDetalle(t)}
                      style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === t.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{t.titulo}</div>
                        {vencida && <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>VENCIDA</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{t.proyecto?.codigo || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{t.cliente?.razon_social || "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{pr.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#374151", whiteSpace: "nowrap" }}>
                        {t.asignado ? t.asignado.nombre + " " + t.asignado.apellido : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ background: es.bg, color: es.color, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{es.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: vencida ? "#991b1b" : "#6b7280", fontWeight: vencida ? 700 : 400, whiteSpace: "nowrap" }}>
                        {t.fecha_limite || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={e => { e.stopPropagation(); abrirEditar(t) }}
                            style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}>✏️</button>
                          <button onClick={e => { e.stopPropagation(); eliminar(t.id) }}
                            style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
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
      {selected && (
        <div style={{ width: 380, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827", flex: 1, paddingRight: 8 }}>{selected.titulo}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>×</button>
          </div>

          {/* Estado rápido */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>CAMBIAR ESTADO</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(ESTADOS).map(([k, v]) => (
                <button key={k} onClick={() => cambiarEstado(selected.id, k)}
                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, border: selected.estado === k ? "2px solid #1D9E75" : "1px solid #e5e7eb", background: selected.estado === k ? v.bg : "#fff", color: selected.estado === k ? v.color : "#6b7280", cursor: "pointer", fontWeight: selected.estado === k ? 700 : 400 }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Prioridad", value: PRIORIDADES[selected.prioridad]?.label || "—" },
              { label: "Asignado a", value: selected.asignado ? selected.asignado.nombre + " " + selected.asignado.apellido : "—" },
              { label: "Creado por", value: selected.creador ? selected.creador.nombre + " " + selected.creador.apellido : "—" },
              { label: "Proyecto", value: selected.proyecto ? selected.proyecto.codigo + " — " + selected.proyecto.nombre : "—" },
              { label: "Cliente", value: selected.cliente?.razon_social || "—" },
              { label: "Fecha límite", value: selected.fecha_limite || "—" },
              { label: "Completada", value: selected.fecha_completada ? new Date(selected.fecha_completada).toLocaleDateString("es-PE") : "—" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#9ca3af", fontWeight: 600 }}>{r.label}</span>
                <span style={{ color: "#374151", textAlign: "right", maxWidth: 200 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {selected.descripcion && (
            <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>DESCRIPCIÓN</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selected.descripcion}</div>
            </div>
          )}

          {/* Comentarios */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #f3f4f6" }}>
              COMENTARIOS ({comentarios.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {comentarios.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>Sin comentarios aún</div>}
              {comentarios.map(c => (
                <div key={c.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>
                      {c.usuario?.nombre} {c.usuario?.apellido}
                    </span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(c.created_at).toLocaleDateString("es-PE")}</span>
                      {c.usuario_id === perfil?.id && (
                        <button onClick={() => eliminarComentario(c.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 12 }}>×</button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{c.comentario}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="Escribe un comentario..."
                value={nuevoComentario}
                onChange={e => setNuevoComentario(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && agregarComentario()}
              />
              <button onClick={agregarComentario} disabled={savingCom || !nuevoComentario.trim()}
                style={{ padding: "7px 14px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                {savingCom ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FORM ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar tarea" : "Nueva tarea"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>TÍTULO *</label>
                <input style={inp} value={form.titulo} placeholder="Título de la tarea" onChange={e => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>DESCRIPCIÓN</label>
                <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.descripcion} placeholder="Detalle de la tarea..." onChange={e => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>ESTADO</label>
                  <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>PRIORIDAD</label>
                  <select style={inp} value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                    {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>ASIGNADO A</label>
                <select style={inp} value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.perfil}</option>)}
                </select>
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
                  <label style={lbl}>CLIENTE (opcional)</label>
                  <select style={inp} value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                    <option value="">Sin cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                  <select style={{ ...inp, width: "auto" }} value={ordenCampo} onChange={e => setOrdenCampo(e.target.value)}>
            <option value="fecha_limite">Ordenar: Fecha límite</option>
            <option value="titulo">Ordenar: Título</option>
            <option value="proyecto">Ordenar: Proyecto</option>
            <option value="cliente">Ordenar: Cliente</option>
            <option value="prioridad">Ordenar: Prioridad</option>
            <option value="asignado">Ordenar: Asignado a</option>
            <option value="estado">Ordenar: Estado</option>
          </select>
          <select style={{ ...inp, width: "auto" }} value={ordenDir} onChange={e => setOrdenDir(e.target.value)}>
            <option value="asc">↑ Ascendente</option>
            <option value="desc">↓ Descendente</option>
          </select>
                </div>
              </div>
              <div>
                <label style={lbl}>FECHA LÍMITE</label>
                <input type="date" style={inp} value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : editando ? "Actualizar" : "Crear tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
