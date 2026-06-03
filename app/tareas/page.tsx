"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"

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

const formVacio = {
  titulo: "", descripcion: "", estado: "pendiente", prioridad: "media",
  proyecto_id: "", cliente_id: "", asignado_a: "", fecha_limite: "",
}

export default function TareasPage() {
  const supabase = createClient()
  const [tareas, setTareas] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingCom, setSavingCom] = useState(false)
  const [form, setForm] = useState({ ...formVacio })
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroAsignado, setFiltroAsignado] = useState("todos")

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data: t } = await supabase
      .from("tareas")
      .select("*, proyecto:proyectos(nombre, codigo), cliente:clientes(razon_social), asignado:perfiles!asignado_a(nombre, apellido), creador:perfiles!creado_por(nombre, apellido)")
      .order("created_at", { ascending: false })
    setTareas(t || [])
    const { data: pr } = await supabase.from("proyectos").select("id, nombre, codigo").order("nombre")
    setProyectos(pr || [])
    const { data: cl } = await supabase.from("clientes").select("id, razon_social").order("razon_social")
    setClientes(cl || [])
    const { data: us } = await supabase.from("perfiles").select("id, nombre, apellido, perfil").order("nombre")
    setUsuarios(us || [])
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
    if (filtroAsignado === "creadas" && t.creado_por !== perfil?.id) return false
    return true
  })

  const contadores = {
    pendiente: tareas.filter(t => t.estado === "pendiente").length,
    en_progreso: tareas.filter(t => t.estado === "en_progreso").length,
    completada: tareas.filter(t => t.estado === "completada").length,
  }

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  const hoy = new Date().toISOString().split("T")[0]
  const estaVencida = (t: any) => t.fecha_limite && t.fecha_limite < hoy && t.estado !== "completada" && t.estado !== "cancelada"

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 80px)" }}>

      {/* ── PANEL IZQUIERDO ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Tareas</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{tareas.length} tareas en total</p>
          </div>
          <button onClick={abrirNueva} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva tarea</button>
        </div>

        {/* Contadores */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Pendientes", value: contadores.pendiente, ...ESTADOS.pendiente },
            { label: "En progreso", value: contadores.en_progreso, ...ESTADOS.en_progreso },
            { label: "Completadas", value: contadores.completada, ...ESTADOS.completada },
          ].map(c => (
            <div key={c.label} className="card" style={{ background: c.bg, border: "none", padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: "uppercase" }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroAsignado} onChange={e => setFiltroAsignado(e.target.value)}>
            <option value="todos">Todas las tareas</option>
            <option value="mias">Asignadas a mí</option>
            <option value="creadas">Creadas por mí</option>
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
                {tareasFiltradas.map((t, idx) => {
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
            const es = ESTADOS[t.estado] || ESTADOS.pendiente
            const pr = PRIORIDADES[t.prioridad] || PRIORIDADES.media
            const vencida = estaVencida(t)
            const activa = selected?.id === t.id
            return (
              <div key={t.id} onClick={() => abrirDetalle(t)}
                style={{ background: activa ? "#f0fdf4" : "#fff", border: activa ? "1.5px solid #1D9E75" : "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{t.titulo}</span>
                      {vencida && <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>VENCIDA</span>}
                    </div>
                    {t.descripcion && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, lineHeight: 1.4 }}>{t.descripcion.slice(0, 100)}{t.descripcion.length > 100 ? "..." : ""}</div>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ background: es.bg, color: es.color, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{es.label}</span>
                      <span style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{pr.label}</span>
                      {t.proyecto && <span style={{ fontSize: 11, color: "#6b7280" }}>📁 {t.proyecto.codigo}</span>}
                      {t.cliente && <span style={{ fontSize: 11, color: "#6b7280" }}>🏢 {t.cliente.razon_social}</span>}
                      {t.fecha_limite && <span style={{ fontSize: 11, color: vencida ? "#991b1b" : "#6b7280" }}>📅 {t.fecha_limite}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {t.asignado && (
                      <div style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                        👤 {t.asignado.nombre} {t.asignado.apellido}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={e => { e.stopPropagation(); abrirEditar(t) }}
                        className="btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }}>Editar</button>
                      <button onClick={e => { e.stopPropagation(); eliminar(t.id) }}
                        style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── PANEL DERECHO (detalle) ── */}
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