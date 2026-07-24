"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { estadoOrigenCotizacionItem, esItemHistoricoCotizacion } from "@/lib/cotizaciones"
import { cargarItemsAprobadosAlGestor } from "@/lib/gestor"
import { V2ListPageTemplate } from "@/components/v2/templates"
import { V2Button, V2PageHeader, V2SectionCard, V2Select } from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

const ESTADO_TAREA: Record<string, any> = {
  pendiente:   { bg: "#f3f4f6", color: "#6b7280",  label: "Pendiente" },
  en_progreso: { bg: "#dbeafe", color: "#1e40af",  label: "En progreso" },
  completada:  { bg: "#dcfce7", color: "#15803d",  label: "Completada" },
  bloqueada:   { bg: "#fee2e2", color: "#991b1b",  label: "Bloqueada" },
}

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
  const [errorGestor, setErrorGestor] = useState("")
  const [form, setForm] = useState({ titulo: "", descripcion: "", responsable_id: "", responsable_nombre: "", estado: "pendiente", fecha_inicio: "", fecha_fin: "", color: "#0F6E56" })

  async function load() {
    const { data: provs, error } = await supabase.from("proyectos").select("*, cliente:clientes(razon_social)").is("deleted_at", null).order("created_at", { ascending: false })
    if (error) setErrorGestor(error.message)
    setProyectos((provs || []).filter((p: any) => ESTADOS_GESTOR_PROYECTO.includes(p.estado) && p.cotizacion_aprobada_id))
    const { data: perfs } = await supabase.from("perfiles").select("id, nombre, apellido, perfil").order("nombre")
    setPerfiles(perfs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

  const tareasFiltradas = tareas.filter(t => {
    if (filtroUsuario && t.responsable_id !== filtroUsuario && t.responsable_nombre !== filtroUsuario) return false
    if (filtroEstado && t.estado !== filtroEstado) return false
    return true
  }).sort((a,b) => {
    if (!ordenFecha) return 0
    if (!a.fecha_fin) return 1
    if (!b.fecha_fin) return -1
    return ordenFecha === "asc"
      ? new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime()
      : new Date(b.fecha_fin).getTime() - new Date(a.fecha_fin).getTime()
  })

  const fechasValidas = tareas.flatMap(t => [t.fecha_inicio, t.fecha_fin].filter(Boolean)).map(f => new Date(f).getTime())
  const minFecha = fechasValidas.length ? Math.min(...fechasValidas) : new Date().getTime()
  const maxFecha = fechasValidas.length ? Math.max(...fechasValidas) : new Date().getTime() + 14 * 86400000
  const ganttInicio = new Date(minFecha)
  const ganttFin = new Date(maxFecha + 86400000 * 3)
  const ganttDias = Math.max(7, Math.ceil((ganttFin.getTime() - ganttInicio.getTime()) / 86400000))
  const ganttDiasArr = Array.from({ length: ganttDias }, (_, i) => {
    const d = new Date(ganttInicio)
    d.setDate(d.getDate() + i)
    return d
  })

  function getBarStyle(t: any, inicio: Date, totalDias: number) {
    if (!t.fecha_inicio && !t.fecha_fin) return null
    const fi = t.fecha_inicio ? new Date(t.fecha_inicio) : new Date(t.fecha_fin)
    const ff = t.fecha_fin ? new Date(t.fecha_fin) : fi
    const diffInicio = Math.max(0, (fi.getTime() - inicio.getTime()) / 86400000)
    const duracion = Math.max(1, Math.ceil((ff.getTime() - fi.getTime()) / 86400000) + 1)
    const leftPct = (diffInicio / totalDias) * 100
    const widthPct = Math.min(100 - leftPct, (duracion / totalDias) * 100)
    return { left: `${leftPct}%`, width: `${widthPct}%` }
  }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando gestor operacional...
      </div>
    )
  }

  return (
    <V2ListPageTemplate
      header={
        <V2PageHeader
          eyebrow="Operaciones"
          title="Gestor Operativo de Proyectos"
          subtitle="Tablero de control operacional por proyecto (Kanban, Lista, Gantt)"
          actions={
            proyectoSeleccionado ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <V2Button variant="primary" onClick={() => { setEditandoTarea(null); setForm({ titulo: "", descripcion: "", responsable_id: "", responsable_nombre: "", estado: "pendiente", fecha_inicio: "", fecha_fin: "", color: "#0F6E56" }); setShowForm(true) }}>
                  + Nueva tarea
                </V2Button>
                <V2Button variant="secondary" onClick={() => exportarExcel(tareas, proyectoSeleccionado.nombre)}>
                  Exportar CSV
                </V2Button>
              </div>
            ) : undefined
          }
        />
      }
      toolbar={
        <V2FilterBar
          searchValue=""
          onSearchChange={() => {}}
          activeFiltersCount={(filtroUsuario ? 1 : 0) + (filtroEstado ? 1 : 0)}
          hideDrawerButton
          onToggleDrawer={() => {}}
          quickFilters={
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 260 }}>
                <V2Select
                  compact
                  value={proyectoSeleccionado?.id || ""}
                  onChange={(e) => {
                    const p = proyectos.find((x) => x.id === e.target.value)
                    if (p) seleccionarProyecto(p)
                  }}
                  options={[
                    { label: "-- Seleccionar proyecto --", value: "" },
                    ...proyectos.map((p) => ({ label: `${p.codigo} — ${p.nombre}`, value: p.id })),
                  ]}
                />
              </div>
              {proyectoSeleccionado && (
                <div style={{ display: "flex", gap: 4, background: "var(--v2-surface-subtle)", padding: 3, borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-border)" }}>
                  {(["kanban", "lista", "gantt"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVista(v)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "var(--v2-radius-sm)",
                        border: "none",
                        background: vista === v ? "var(--v2-surface)" : "transparent",
                        color: vista === v ? "var(--v2-text)" : "var(--v2-muted)",
                        fontWeight: vista === v ? 700 : 500,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        />
      }
      table={
        <div style={{ display: "grid", gap: 16 }}>
          {errorGestor && (
            <div style={{ padding: 12, borderRadius: "var(--v2-radius)", background: "var(--v2-danger-subtle, #fee2e2)", color: "var(--v2-danger, #991b1b)", fontSize: 13, fontWeight: 600 }}>
              {errorGestor}
            </div>
          )}

          {!proyectoSeleccionado ? (
            <V2SectionCard title="Seleccionar Proyecto">
              <div style={{ padding: 48, textAlign: "center", color: "var(--v2-muted)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--v2-text)", marginBottom: 6 }}>Selecciona un proyecto</div>
                <div style={{ fontSize: 13, color: "var(--v2-muted)" }}>Elige un proyecto activo para ver y gestionar sus tareas operativas</div>
              </div>
            </V2SectionCard>
          ) : (
            <div>
              {/* Kanban */}
              {vista === "kanban" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                  {Object.entries(ESTADO_TAREA).map(([estKey, estVal]: any) => {
                    const ts = tareasFiltradas.filter((t) => t.estado === estKey)
                    return (
                      <div key={estKey} style={{ background: "var(--v2-surface-subtle)", borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-border)", padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: estVal.color }}>{estVal.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--v2-muted)", background: "var(--v2-surface)", padding: "2px 8px", borderRadius: 99, border: "1px solid var(--v2-border)" }}>{ts.length}</span>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {ts.map((t) => (
                            <div
                              key={t.id}
                              style={{
                                background: "var(--v2-surface)",
                                border: "1px solid var(--v2-border)",
                                borderLeft: `4px solid ${t.color || "var(--v2-brand)"}`,
                                borderRadius: "var(--v2-radius-sm)",
                                padding: 10,
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)", marginBottom: 4 }}>{t.titulo}</div>
                              {t.descripcion && <div style={{ fontSize: 11.5, color: "var(--v2-muted)", marginBottom: 6 }}>{t.descripcion}</div>}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--v2-muted)" }}>
                                <span>{t.responsable_nombre || "Sin asignación"}</span>
                                {t.fecha_fin && <span>{t.fecha_fin}</span>}
                              </div>
                              <BadgeOrigenCotizacion tarea={t} />
                              {!esTareaHistorica(t) && (
                                <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                                  <V2Button variant="ghost" size="compact" onClick={() => abrirEditar(t)}>Editar</V2Button>
                                  <V2Button variant="ghost" size="compact" onClick={() => eliminarTarea(t.id)}>Eliminar</V2Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Lista */}
              {vista === "lista" && (
                <V2SectionCard title="Lista de Tareas Operativas">
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--v2-border)", background: "var(--v2-surface-subtle)" }}>
                          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>TAREA</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>RESPONSABLE</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>ESTADO</th>
                          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>FECHA FIN</th>
                          <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)" }}>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tareasFiltradas.map((t) => (
                          <tr key={t.id} style={{ borderBottom: "1px solid var(--v2-border)" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--v2-text)" }}>{t.titulo}</td>
                            <td style={{ padding: "10px 12px", color: "var(--v2-muted)" }}>{t.responsable_nombre || "—"}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, background: ESTADO_TAREA[t.estado]?.bg || "var(--v2-surface-subtle)", color: ESTADO_TAREA[t.estado]?.color || "var(--v2-muted)", padding: "2px 8px", borderRadius: 99 }}>
                                {ESTADO_TAREA[t.estado]?.label || t.estado}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--v2-muted)" }}>{t.fecha_fin || "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              {!esTareaHistorica(t) && (
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                  <V2Button variant="ghost" size="compact" onClick={() => abrirEditar(t)}>Editar</V2Button>
                                  <V2Button variant="ghost" size="compact" onClick={() => eliminarTarea(t.id)}>Eliminar</V2Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </V2SectionCard>
              )}

              {/* Gantt */}
              {vista === "gantt" && (
                <V2SectionCard title="Cronograma Gantt">
                  <div style={{ minWidth: 700, overflowX: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", borderBottom: "2px solid var(--v2-border)", fontWeight: 700, fontSize: 11, color: "var(--v2-muted)", padding: "8px 0" }}>
                      <div>TAREA</div>
                      <div style={{ display: "flex" }}>
                        {ganttDiasArr.map((d, i) => (
                          <div key={i} style={{ flex: `0 0 ${100/ganttDias}%`, textAlign: "center", fontSize: 9 }}>
                            {d.getDate()}/{d.getMonth()+1}
                          </div>
                        ))}
                      </div>
                    </div>
                    {tareasFiltradas.map((t) => {
                      const barStyle = getBarStyle(t, ganttInicio, ganttDias)
                      return (
                        <div key={t.id} style={{ display: "grid", gridTemplateColumns: "220px 1fr", borderBottom: "1px solid var(--v2-border)", padding: "8px 0", alignItems: "center" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--v2-text)" }}>{t.titulo}</div>
                          <div style={{ position: "relative", height: 24 }}>
                            {barStyle && (
                              <div style={{ position: "absolute", left: barStyle.left, width: barStyle.width, height: 20, background: t.color || "var(--v2-brand)", borderRadius: 4, color: "#fff", fontSize: 10, paddingLeft: 6, display: "flex", alignItems: "center" }}>
                                {t.titulo}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </V2SectionCard>
              )}
            </div>
          )}
        </div>
      }
    />
  )
}
