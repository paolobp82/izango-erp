"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { estadoOrigenCotizacionItem, esItemHistoricoCotizacion } from "@/lib/cotizaciones"
import { cargarItemsAprobadosAlGestor } from "@/lib/gestor"

const ESTADO_TAREA: Record<string, any> = {
  pendiente:   { bg: "#f3f4f6", color: "#6b7280",  label: "Pendiente" },
  en_progreso: { bg: "#dbeafe", color: "#1e40af",  label: "En progreso" },
  completada:  { bg: "#dcfce7", color: "#15803d",  label: "Completada" },
  bloqueada:   { bg: "#fee2e2", color: "#991b1b",  label: "Bloqueada" },
}

const COLORES = ["#0F6E56","#2563eb","#d97706","#dc2626","#8b5cf6","#0891b2","#059669","#db2777"]
const ESTADOS_GESTOR_PROYECTO = ["en_curso", "terminado", "liquidado", "pendiente_facturacion", "facturado"]

function exportarExcel(tareas: any[], proyectoNombre: string) {
  const headers = ["Titulo","Descripcion","Responsable","Estado","Fecha inicio","Fecha fin","Color"]
  const rows = tareas.map(t => [
    t.titulo || "", t.descripcion || "", t.responsable_nombre || "",
    t.estado || "", t.fecha_inicio || "", t.fecha_fin || "", t.color || ""
  ])
  const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `tareas-${proyectoNombre.replace(/\s+/g,"-")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function GestorPage() {
  const supabase = createClient()
  const [proyectos, setProyectos] = useState<any[]>([])
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"kanban" | "lista" | "gantt">("kanban")
  const [showForm, setShowForm] = useState(false)
  const [editandoTarea, setEditandoTarea] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filtroUsuario, setFiltroUsuario] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [ordenFecha, setOrdenFecha] = useState<"asc" | "desc" | "">("") 
  const [importando, setImportando] = useState(false)
  const [errorGestor, setErrorGestor] = useState("")
  const [form, setForm] = useState({ titulo: "", descripcion: "", responsable_id: "", responsable_nombre: "", estado: "pendiente", fecha_inicio: "", fecha_fin: "", color: "#0F6E56" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: provs, error } = await supabase.from("proyectos").select("*, cliente:clientes(razon_social)").is("deleted_at", null).order("created_at", { ascending: false })
    if (error) setErrorGestor(error.message)
    setProyectos((provs || []).filter((p: any) => ESTADOS_GESTOR_PROYECTO.includes(p.estado) && p.cotizacion_aprobada_id))
    const { data: perfs } = await supabase.from("perfiles").select("id, nombre, apellido, perfil").order("nombre")
    setPerfiles(perfs || [])
    setLoading(false)
  }

  async function loadTareas(proyectoId: string) {
    const proyectoActivo = proyectos.find((p: any) => p.id === proyectoId)
    if (!proyectoActivo) { setTareas([]); setProyectoSeleccionado(null); return }
    setErrorGestor("")
    if (proyectoActivo.cotizacion_aprobada_id) {
      try {
        await cargarItemsAprobadosAlGestor(supabase, proyectoId, proyectoActivo.cotizacion_aprobada_id)
      } catch (error) {
        console.error("Error cargando items aprobados al gestor:", { proyectoId, error })
        setErrorGestor(error instanceof Error ? error.message : "No se pudieron cargar los items aprobados al gestor")
      }
    }
    const { data, error } = await supabase.from("proyecto_tareas").select("*").eq("proyecto_id", proyectoId).order("orden")
    if (error) {
      console.error("Error cargando tareas del gestor:", { proyectoId, error })
      setErrorGestor(error.message)
    }
    setTareas((data || []).map((tarea: any) => ({
      ...tarea,
      estado_origen_cotizacion: estadoOrigenCotizacionItem({
        proyecto: proyectoActivo,
        cotizacionId: tarea.cotizacion_id,
        cotizacionItemId: tarea.cotizacion_item_id,
      }),
    })))
  }

  function seleccionarProyecto(p: any) {
    setProyectoSeleccionado(p)
    setFiltroUsuario("")
    setFiltroEstado("")
    setOrdenFecha("")
    loadTareas(p.id)
  }

  async function guardarTarea() {
    if (!form.titulo || !proyectoSeleccionado) return
    if (editandoTarea && esTareaHistorica(editandoTarea)) {
      alert("Este ítem pertenece a una cotización que ya no es la vigente.")
      return
    }
    setSaving(true)
    const perf = perfiles.find(p => p.id === form.responsable_id)
    const payload = {
      ...form,
      proyecto_id: proyectoSeleccionado.id,
      responsable_nombre: perf ? perf.nombre + " " + perf.apellido : form.responsable_nombre,
      orden: editandoTarea ? editandoTarea.orden : tareas.length,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    }
    if (editandoTarea) {
      await supabase.from("proyecto_tareas").update(payload).eq("id", editandoTarea.id)
    } else {
      await supabase.from("proyecto_tareas").insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditandoTarea(null)
    setForm({ titulo: "", descripcion: "", responsable_id: "", responsable_nombre: "", estado: "pendiente", fecha_inicio: "", fecha_fin: "", color: "#0F6E56" })
    loadTareas(proyectoSeleccionado.id)
  }

  async function cambiarEstadoTarea(tareaId: string, estado: string) {
    const tarea = tareas.find((t: any) => t.id === tareaId)
    if (tarea && esTareaHistorica(tarea)) {
      alert("No se puede cambiar el estado operativo de un ítem de una versión anterior.")
      return
    }
    await supabase.from("proyecto_tareas").update({ estado }).eq("id", tareaId)
    setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, estado } : t))
  }

  async function eliminarTarea(tareaId: string) {
    const tarea = tareas.find((t: any) => t.id === tareaId)
    if (tarea && esTareaHistorica(tarea)) {
      alert("No se eliminan ítems históricos de versiones anteriores.")
      return
    }
    if (!confirm("Eliminar esta tarea?")) return
    await supabase.from("proyecto_tareas").delete().eq("id", tareaId)
    setTareas(prev => prev.filter(t => t.id !== tareaId))
  }

  function abrirEditar(tarea: any) {
    if (esTareaHistorica(tarea)) {
      alert("Este ítem pertenece a una cotización que ya no es la vigente.")
      return
    }
    setEditandoTarea(tarea)
    setForm({ titulo: tarea.titulo, descripcion: tarea.descripcion || "", responsable_id: tarea.responsable_id || "", responsable_nombre: tarea.responsable_nombre || "", estado: tarea.estado, fecha_inicio: tarea.fecha_inicio || "", fecha_fin: tarea.fecha_fin || "", color: tarea.color || "#0F6E56" })
    setShowForm(true)
  }

  function esTareaHistorica(tarea: any) {
    return esItemHistoricoCotizacion({
      proyecto: proyectoSeleccionado,
      cotizacionId: tarea?.cotizacion_id,
      cotizacionItemId: tarea?.cotizacion_item_id,
    })
  }

  function BadgeOrigenCotizacion({ tarea }: { tarea: any }) {
    if (tarea.estado_origen_cotizacion === "historico") {
      return (
        <span title="Este ítem pertenece a una cotización que ya no es la vigente." style={{ display: "inline-block", marginTop: 4, background: "#fef3c7", color: "#92400e", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
          Versión anterior
        </span>
      )
    }
    if (tarea.estado_origen_cotizacion === "sin_origen") {
      return (
        <span title="Este ítem no tiene vínculo identificable a cotización." style={{ display: "inline-block", marginTop: 4, background: "#f3f4f6", color: "#6b7280", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
          Sin origen
        </span>
      )
    }
    return null
  }

  async function importarCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !proyectoSeleccionado) return
    setImportando(true)
    const text = await file.text()
    const lines = text.split("\n").filter(l => l.trim())
    const rows = lines.slice(1)
    let importados = 0
    for (const row of rows) {
      const cols = row.split(",").map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim())
      if (!cols[0]) continue
      const perf = perfiles.find(p => (p.nombre + " " + p.apellido).toLowerCase() === (cols[2] || "").toLowerCase())
      await supabase.from("proyecto_tareas").insert({
        proyecto_id: proyectoSeleccionado.id,
        titulo: cols[0] || "",
        descripcion: cols[1] || "",
        responsable_nombre: cols[2] || "",
        responsable_id: perf?.id || null,
        estado: cols[3] || "pendiente",
        fecha_inicio: cols[4] || null,
        fecha_fin: cols[5] || null,
        color: cols[6] || "#0F6E56",
        orden: tareas.length + importados,
      })
      importados++
    }
    setImportando(false)
    e.target.value = ""
    loadTareas(proyectoSeleccionado.id)
    alert(`${importados} tareas importadas`)
  }

  // Filtros y ordenamiento
  const tareasFiltradas = tareas
    .filter(t => {
      if (filtroUsuario && t.responsable_id !== filtroUsuario && t.responsable_nombre !== filtroUsuario) return false
      if (filtroEstado && t.estado !== filtroEstado) return false
      return true
    })
    .sort((a, b) => {
      if (!ordenFecha) return 0
      const fa = a.fecha_fin || a.fecha_inicio || ""
      const fb = b.fecha_fin || b.fecha_inicio || ""
      if (!fa && !fb) return 0
      if (!fa) return 1
      if (!fb) return -1
      return ordenFecha === "asc" ? fa.localeCompare(fb) : fb.localeCompare(fa)
    })

  // Gantt helpers
  function getGanttRange() {
    const tareasConFecha = tareas.filter(t => t.fecha_inicio && t.fecha_fin)
    if (tareasConFecha.length === 0) return { inicio: new Date(), dias: 30 }
    const fechas = tareasConFecha.flatMap(t => [new Date(t.fecha_inicio), new Date(t.fecha_fin)])
    const min = new Date(Math.min(...fechas.map(f => f.getTime())))
    const max = new Date(Math.max(...fechas.map(f => f.getTime())))
    min.setDate(min.getDate() - 2)
    max.setDate(max.getDate() + 2)
    const dias = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24))
    return { inicio: min, dias: Math.max(dias, 14) }
  }

  function getBarStyle(tarea: any, inicio: Date, totalDias: number) {
    if (!tarea.fecha_inicio || !tarea.fecha_fin) return null
    const fi = new Date(tarea.fecha_inicio)
    const ff = new Date(tarea.fecha_fin)
    const startPct = ((fi.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) / totalDias * 100
    const widthPct = ((ff.getTime() - fi.getTime()) / (1000 * 60 * 60 * 24) + 1) / totalDias * 100
    return { left: Math.max(0, startPct) + "%", width: Math.max(1, widthPct) + "%" }
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }

  const { inicio: ganttInicio, dias: ganttDias } = getGanttRange()
  const ganttDiasArr = Array.from({ length: ganttDias }, (_, i) => { const d = new Date(ganttInicio); d.setDate(d.getDate() + i); return d })

  // Usuarios unicos en tareas del proyecto
  const usuariosEnTareas = Array.from(new Map(tareas.filter(t => t.responsable_id).map(t => [t.responsable_id, { id: t.responsable_id, nombre: t.responsable_nombre }])).values())

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Gestor de proyectos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Tareas, responsables y seguimiento</p>
        </div>
        {proyectoSeleccionado && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Exportar */}
            <button onClick={() => exportarExcel(tareas, proyectoSeleccionado.nombre)}
              style={{ fontSize: 12, padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#374151", cursor: "pointer" }}>
              Exportar CSV
            </button>
            {/* Importar */}
            <label style={{ fontSize: 12, padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#374151", cursor: "pointer" }}>
              {importando ? "Importando..." : "Importar CSV"}
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={importarCSV} />
            </label>
            <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              {(["kanban", "lista", "gantt"] as const).map(v => (
                <button key={v} onClick={() => setVista(v)}
                  style={{ padding: "7px 14px", border: "none", background: vista === v ? "#0F6E56" : "#fff", color: vista === v ? "#fff" : "#374151", cursor: "pointer", fontSize: 12, fontWeight: vista === v ? 700 : 400, fontFamily: "inherit" }}>
                  {v === "kanban" ? "Kanban" : v === "lista" ? "Lista" : "Gantt"}
                </button>
              ))}
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva tarea</button>
          </div>
        )}
      </div>

      {/* Modal tarea */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{editandoTarea ? "Editar tarea" : "Nueva tarea"}</h2>
              <button onClick={() => { setShowForm(false); setEditandoTarea(null) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div><label style={lbl}>Titulo *</label><input style={inp} value={form.titulo} placeholder="Titulo de la tarea" onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
              <div><label style={lbl}>Descripcion</label><textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Responsable</label>
                  <select style={inp} value={form.responsable_id} onChange={e => setForm({ ...form, responsable_id: e.target.value })}>
                    <option value="">Sin responsable</option>
                    {perfiles.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Estado</label>
                  <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {Object.entries(ESTADO_TAREA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Fecha inicio</label><input type="date" style={inp} value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div><label style={lbl}>Fecha fin</label><input type="date" style={inp} value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
              </div>
              <div>
                <label style={lbl}>Color</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLORES.map(c => (
                    <div key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid #111" : "2px solid transparent", boxSizing: "border-box" }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); setEditandoTarea(null) }} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarTarea} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editandoTarea ? "Actualizar" : "Crear tarea"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
        {/* Lista proyectos */}
        <div className="card" style={{ padding: 0, overflow: "hidden", alignSelf: "start" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 600, color: "#374151" }}>Proyectos</div>
          {proyectos.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>No hay proyectos activos</div>
          ) : proyectos.map((p, idx) => (
            <div key={p.id} onClick={() => seleccionarProyecto(p)}
              style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: proyectoSeleccionado?.id === p.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F6E56" }}>{p.codigo}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 2 }}>{p.nombre}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.cliente?.razon_social}</div>
            </div>
          ))}
        </div>

        {/* Vista principal */}
        {!proyectoSeleccionado ? (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div style={{ textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Selecciona un proyecto</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>para ver y gestionar sus tareas</div>
            </div>
          </div>
        ) : (
          <div>
            {/* Filtros */}
            {errorGestor && (
              <div style={{ padding: 12, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 12, marginBottom: 12 }}>
                {errorGestor}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{proyectoSeleccionado.codigo} — {proyectoSeleccionado.nombre}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{tareasFiltradas.length}/{tareas.length} tareas</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {usuariosEnTareas.length > 0 && (
                  <select style={{ padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff" }}
                    value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}>
                    <option value="">Todos los usuarios</option>
                    {usuariosEnTareas.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                )}
                <select style={{ padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff" }}
                  value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {Object.entries(ESTADO_TAREA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select style={{ padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff" }}
                  value={ordenFecha} onChange={e => setOrdenFecha(e.target.value as any)}>
                  <option value="">Sin ordenar</option>
                  <option value="asc">Fecha: mas proxima primero</option>
                  <option value="desc">Fecha: mas lejana primero</option>
                </select>
                {(filtroUsuario || filtroEstado || ordenFecha) && (
                  <button onClick={() => { setFiltroUsuario(""); setFiltroEstado(""); setOrdenFecha("") }}
                    style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Vista Kanban */}
            {vista === "kanban" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {Object.entries(ESTADO_TAREA).map(([estado, info]) => {
                  const tareasEstado = tareasFiltradas.filter(t => t.estado === estado)
                  return (
                    <div key={estado}>
                      <div style={{ padding: "8px 12px", borderRadius: "8px 8px 0 0", background: info.bg, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</span>
                        <span style={{ fontSize: 11, color: info.color, marginLeft: 6, opacity: 0.7 }}>({tareasEstado.length})</span>
                      </div>
                      <div style={{ background: "#f9fafb", borderRadius: "0 0 8px 8px", minHeight: 120, padding: 8, display: "grid", gap: 8 }}>
                        {tareasEstado.map(t => (
                          <div key={t.id} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderLeft: "3px solid " + (t.color || "#0F6E56") }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{t.titulo}</div>
                            <BadgeOrigenCotizacion tarea={t} />
                            {t.descripcion && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{t.descripcion}</div>}
                            {t.responsable_nombre && <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>👤 {t.responsable_nombre}</div>}
                            {t.fecha_fin && (
                              <div style={{ fontSize: 11, color: new Date(t.fecha_fin) < new Date() && t.estado !== "completada" ? "#dc2626" : "#9ca3af" }}>
                                📅 {t.fecha_fin}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                              {!esTareaHistorica(t) && Object.entries(ESTADO_TAREA).filter(([k]) => k !== estado).map(([k, v]) => (
                                <button key={k} onClick={() => cambiarEstadoTarea(t.id, k)}
                                  style={{ fontSize: 10, padding: "2px 6px", border: "1px solid " + v.color, borderRadius: 4, background: v.bg, color: v.color, cursor: "pointer", fontFamily: "inherit" }}>
                                  {v.label}
                                </button>
                              ))}
                              {!esTareaHistorica(t) && <button onClick={() => abrirEditar(t)} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", color: "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>Editar</button>}
                              {!esTareaHistorica(t) && <button onClick={() => eliminarTarea(t.id)} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid #fee2e2", borderRadius: 4, background: "#fff", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>x</button>}
                            </div>
                          </div>
                        ))}
                        {tareasEstado.length === 0 && (
                          <div style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", padding: "16px 0" }}>Sin tareas</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Vista Lista */}
            {vista === "lista" && (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TAREA</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RESPONSABLE</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHA FIN</th>
                      <th style={{ padding: "10px 16px", width: 120 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tareasFiltradas.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}>No hay tareas</td></tr>
                    ) : tareasFiltradas.map((t, idx) => {
                      const ec = ESTADO_TAREA[t.estado] || { bg: "#f3f4f6", color: "#6b7280", label: t.estado }
                      const vencida = t.fecha_fin && new Date(t.fecha_fin) < new Date() && t.estado !== "completada"
                      return (
                        <tr key={t.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 4, height: 32, borderRadius: 2, background: t.color || "#0F6E56", flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.titulo}</div>
                                <BadgeOrigenCotizacion tarea={t} />
                                {t.descripcion && <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.descripcion}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{t.responsable_nombre || "—"}</td>
                          <td style={{ padding: "12px" }}>
                            {/* Selector de estado inline */}
                            {esTareaHistorica(t) ? (
                              <span style={{ padding: "3px 8px", border: "1px solid " + ec.color, borderRadius: 6, fontSize: 11, fontWeight: 600, background: ec.bg, color: ec.color }}>
                                {ec.label}
                              </span>
                            ) : (
                              <select
                                value={t.estado}
                                onChange={e => cambiarEstadoTarea(t.id, e.target.value)}
                                style={{ padding: "3px 8px", border: "1px solid " + ec.color, borderRadius: 6, fontSize: 11, fontWeight: 600, background: ec.bg, color: ec.color, cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
                                {Object.entries(ESTADO_TAREA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            )}
                          </td>
                          <td style={{ padding: "12px", fontSize: 12, color: vencida ? "#dc2626" : "#6b7280", fontWeight: vencida ? 600 : 400 }}>
                            {t.fecha_fin ? (vencida ? "⚠ " : "") + t.fecha_fin : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {!esTareaHistorica(t) && <button onClick={() => abrirEditar(t)} className="btn-secondary" style={{ fontSize: 11 }}>Editar</button>}
                              {!esTareaHistorica(t) && <button onClick={() => eliminarTarea(t.id)} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 5, background: "#fff", color: "#dc2626", cursor: "pointer" }}>x</button>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Vista Gantt */}
            {vista === "gantt" && (
              tareas.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                  <div style={{ fontSize: 14 }}>No hay tareas con fechas definidas</div>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: "auto" }}>
                  <div style={{ minWidth: 800 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", borderBottom: "2px solid #e5e7eb" }}>
                      <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f9fafb", borderRight: "1px solid #e5e7eb" }}>TAREA</div>
                      <div style={{ display: "flex", background: "#f9fafb" }}>
                        {ganttDiasArr.map((d, i) => {
                          const esHoy = d.toDateString() === new Date().toDateString()
                          const esSabDom = d.getDay() === 0 || d.getDay() === 6
                          return (
                            <div key={i} style={{ flex: "0 0 " + (100/ganttDias) + "%", padding: "4px 0", textAlign: "center", fontSize: 9, color: esHoy ? "#0F6E56" : "#9ca3af", fontWeight: esHoy ? 800 : 400, background: esSabDom ? "#f3f4f6" : "transparent", borderRight: "1px solid #f3f4f6" }}>
                              {d.getDate()}/{d.getMonth()+1}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {tareasFiltradas.map((t, idx) => {
                      const barStyle = getBarStyle(t, ganttInicio, ganttDias)
                      const ec = ESTADO_TAREA[t.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                      return (
                        <div key={t.id} style={{ display: "grid", gridTemplateColumns: "220px 1fr", borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <div style={{ padding: "8px 16px", borderRight: "1px solid #e5e7eb" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{t.titulo}</div>
                            {t.responsable_nombre && <div style={{ fontSize: 10, color: "#6b7280" }}>👤 {t.responsable_nombre}</div>}
                            <span style={{ background: ec.bg, color: ec.color, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600 }}>{ec.label}</span>
                          </div>
                          <div style={{ position: "relative", height: 40 }}>
                            {ganttDiasArr.map((d, i) => {
                              const esHoy = d.toDateString() === new Date().toDateString()
                              const esSabDom = d.getDay() === 0 || d.getDay() === 6
                              return <div key={i} style={{ position: "absolute", left: (i/ganttDias*100) + "%", width: (1/ganttDias*100) + "%", height: "100%", background: esHoy ? "rgba(15,110,86,0.08)" : esSabDom ? "rgba(0,0,0,0.02)" : "transparent", borderRight: "1px solid #f9fafb" }} />
                            })}
                            {barStyle && (
                              <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: barStyle.left, width: barStyle.width, height: 20, background: t.color || "#0F6E56", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6, overflow: "hidden" }}>
                                <span style={{ fontSize: 10, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{t.titulo}</span>
                              </div>
                            )}
                            {!barStyle && (
                              <div style={{ display: "flex", alignItems: "center", height: "100%", paddingLeft: 8 }}>
                                <span style={{ fontSize: 11, color: "#d1d5db" }}>Sin fechas</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}





