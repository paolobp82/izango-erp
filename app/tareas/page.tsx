"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import { registrarAccion } from "@/lib/trazabilidad"
import { useRouter } from "next/navigation"

import { rowBelongsToDeletedProject } from "@/lib/projects"
import { ArrowUpDown, CalendarDays, Check, ClipboardCheck, Eye, Grid2X2, MoreVertical, Play, Plus, User, Users } from "lucide-react"

const ESTADOS: Record<string, any> = {
  pendiente:    { label: "Pendiente",    bg: "#fef9c3", color: "#92400e" },
  en_progreso:  { label: "En progreso",  bg: "#dbeafe", color: "#1e40af" },
  en_revision:  { label: "En revisión",  bg: "#f5f3ff", color: "#6d28d9" },
  completada:   { label: "Completada",   bg: "#dcfce7", color: "#15803d" },
  cancelada:    { label: "Cancelada",    bg: "#fee2e2", color: "#991b1b" },
}

const PRIORIDADES: Record<string, any> = {
  baja:    { label: "Baja",    bg: "#f3f4f6", color: "#6b7280" },
  media:   { label: "Media",   bg: "#fef9c3", color: "#92400e" },
  alta:    { label: "Alta",    bg: "#fed7aa", color: "#9a3412" },
  urgente: { label: "Urgente", bg: "#fee2e2", color: "#991b1b" },
}

const FRECUENCIAS: Record<string, string> = {
  no_repite: "No se repite",
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual",
  anual: "Anual",
  laborables: "Días laborables",
  personalizado_dias: "Personalizado: días",
  personalizado_semanas: "Personalizado: semanas",
  personalizado_meses: "Personalizado: meses",
}

const formVacio = {
  titulo: "", descripcion: "", estado: "pendiente", prioridad: "media",
  proyecto_id: "", cliente_id: "", asignado_a: "", fecha_limite: "", hora_inicio: "", hora_fin: "",
  participante_ids: [] as string[],
  frecuencia: "no_repite", recurrencia_intervalo: 1, recurrencia_fecha_fin: "", recurrencia_max_repeticiones: "",
  link_inicial: "", notificar_participantes: true, mostrar_participantes_mi_trabajo: true, permitir_comentarios: true, recibir_correos_automaticos: true,
}

export default function TareasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tareas, setTareas] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoComentario, setNuevoComentario] = useState("")
  const [nuevoLink, setNuevoLink] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingCom, setSavingCom] = useState(false)
  const [form, setForm] = useState({ ...formVacio })
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroAsignado, setFiltroAsignado] = useState("mias")
  const [filtroProyecto, setFiltroProyecto] = useState("")
  const [filtroPrioridad, setFiltroPrioridad] = useState("todos")
  const [filtroFecha, setFiltroFecha] = useState("")
  const [responsableId, setResponsableId] = useState("")
  const [ordenCampo, setOrdenCampo] = useState("fecha_limite")
  const [ordenDir, setOrdenDir] = useState("asc")
  const [participanteSearch, setParticipanteSearch] = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    const params = new URLSearchParams(window.location.search)
    const proyectoIdParam = params.get("proyecto_id") || ""
    const tareaIdParam = params.get("tarea_id") || ""
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

      .select("*, proyecto:proyectos(nombre, codigo, deleted_at), cliente:clientes(razon_social), asignado:perfiles!asignado_a(nombre, apellido), creador:perfiles!creado_por(nombre, apellido)")
      .select("*, proyecto:proyectos(nombre, codigo), cliente:clientes(razon_social), asignado:perfiles!asignado_a(nombre, apellido), creador:perfiles!creado_por(nombre, apellido), participantes:tarea_participantes(usuario_id, usuario:perfiles!usuario_id(id,nombre,apellido))")

      .order("created_at", { ascending: false })
    const tareasActivas = (t || []).filter((item: any) => !rowBelongsToDeletedProject(item))
    setTareas(tareasActivas)
    if (tareaIdParam) {
      const tareaDirecta = tareasActivas.find((item: any) => item.id === tareaIdParam)
      if (tareaDirecta) {
        setSelected(tareaDirecta)
        await loadComentarios(tareaDirecta.id)
      }
    }

    const { data: pr } = await supabase.from("proyectos").select("id, nombre, codigo").is("deleted_at", null).order("nombre")
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
      participante_ids: (t.participantes || []).map((p: any) => p.usuario_id).filter(Boolean),
      fecha_limite: t.fecha_limite || "",
      hora_inicio: t.hora_inicio || "",
      hora_fin: t.hora_fin || "",
      frecuencia: t.frecuencia || "no_repite",
      recurrencia_intervalo: t.recurrencia_intervalo || 1,
      recurrencia_fecha_fin: t.recurrencia_fecha_fin || "",
      recurrencia_max_repeticiones: t.recurrencia_max_repeticiones ? String(t.recurrencia_max_repeticiones) : "",
      link_inicial: "",
      notificar_participantes: t.notificar_participantes ?? true,
      mostrar_participantes_mi_trabajo: t.mostrar_participantes_mi_trabajo ?? true,
      permitir_comentarios: t.permitir_comentarios ?? true,
      recibir_correos_automaticos: t.recibir_correos_automaticos ?? true,
    })
    setShowForm(true)
  }

  async function abrirDetalle(t: any) {
    setSelected(t)
    await loadComentarios(t.id)
  }

  async function notificarTarea(tareaId: string, evento: string, extra: any = {}) {
    try {
      const res = await fetch("/api/tareas/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarea_id: tareaId, evento, ...extra }),
      })
      if (!res.ok) console.warn("No se pudo enviar notificacion de tarea", await res.text())
    } catch (error) {
      console.warn("No se pudo enviar notificacion de tarea", error)
    }
  }

  function esGerencia() {
    return rolesGerenciales.includes(perfil?.perfil)
  }

  function esResponsable(t: any) {
    return Boolean(perfil?.id && t?.asignado_a === perfil.id)
  }

  function esCreador(t: any) {
    return Boolean(perfil?.id && t?.creado_por === perfil.id)
  }

  function puedeMoverEstado(t: any, estadoNuevo: string) {
    if (!t || !perfil?.id) return false
    if (esGerencia()) return true
    if (esResponsable(t)) {
      if (t.estado === "pendiente" && estadoNuevo === "en_progreso") return true
      if (t.estado === "en_progreso" && estadoNuevo === "en_revision") return true
    }
    if (esCreador(t)) {
      if (t.estado === "en_revision" && estadoNuevo === "completada") return true
      if (t.estado === "en_revision" && estadoNuevo === "en_progreso") return true
    }
    return false
  }

  function participantesIds(t: any) {
    return (t?.participantes || []).map((p: any) => p.usuario_id).filter(Boolean)
  }

  function esParticipante(t: any) {
    return Boolean(perfil?.id && t?.mostrar_participantes_mi_trabajo !== false && participantesIds(t).includes(perfil.id))
  }

  function esTareaRelacionada(t: any) {
    return Boolean(esResponsable(t) || (perfil?.id && t?.creado_por === perfil.id) || esParticipante(t))
  }

  function participantesNombres(t: any) {
    return (t?.participantes || [])
      .map((p: any) => p.usuario ? nombreUsuario(p.usuario) : "")
      .filter(Boolean)
      .join(", ")
  }

  function rolUsuarioEnTarea(t: any) {
    if (esResponsable(t)) return "Responsable"
    if (perfil?.id && t?.creado_por === perfil.id && t?.asignado_a !== perfil.id) return "Solicitante"
    if (esParticipante(t)) return "Participante"
    return puedeVerEquipo ? "Equipo" : ""
  }

  function addMonthsSafe(date: Date, months: number) {
    const d = new Date(date)
    const day = d.getDate()
    d.setMonth(d.getMonth() + months, 1)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, lastDay))
    return d
  }

  function formatDate(date: Date) {
    return date.toISOString().split("T")[0]
  }

  function siguienteFecha(t: any) {
    if (!t?.fecha_limite || !t.frecuencia || t.frecuencia === "no_repite") return ""
    const intervalo = Math.max(Number(t.recurrencia_intervalo || 1), 1)
    const base = new Date(`${t.fecha_limite}T12:00:00`)
    let next = new Date(base)
    if (t.frecuencia === "diario") next.setDate(base.getDate() + 1)
    if (t.frecuencia === "semanal") next.setDate(base.getDate() + 7)
    if (t.frecuencia === "mensual") next = addMonthsSafe(base, 1)
    if (t.frecuencia === "anual") next.setFullYear(base.getFullYear() + 1)
    if (t.frecuencia === "laborables") {
      next.setDate(base.getDate() + 1)
      while ([0, 6].includes(next.getDay())) next.setDate(next.getDate() + 1)
    }
    if (t.frecuencia === "personalizado_dias") next.setDate(base.getDate() + intervalo)
    if (t.frecuencia === "personalizado_semanas") next.setDate(base.getDate() + intervalo * 7)
    if (t.frecuencia === "personalizado_meses") next = addMonthsSafe(base, intervalo)
    const nextText = formatDate(next)
    if (t.recurrencia_fecha_fin && nextText > t.recurrencia_fecha_fin) return ""
    if (t.recurrencia_max_repeticiones && Number(t.recurrencia_secuencia || 1) >= Number(t.recurrencia_max_repeticiones)) return ""
    return nextText
  }

  async function guardarParticipantes(tareaId: string, ids: string[]) {
    await supabase.from("tarea_participantes").delete().eq("tarea_id", tareaId)
    const rows = Array.from(new Set(ids.filter(Boolean))).map(usuario_id => ({ tarea_id: tareaId, usuario_id }))
    if (rows.length > 0) await supabase.from("tarea_participantes").insert(rows)
  }

  async function generarSiguienteOcurrencia(t: any) {
    const fecha = siguienteFecha(t)
    if (!fecha) return null
    const payload = {
      titulo: t.titulo,
      descripcion: t.descripcion || null,
      estado: "pendiente",
      prioridad: t.prioridad || "media",
      proyecto_id: t.proyecto_id || null,
      cliente_id: t.cliente_id || null,
      asignado_a: t.asignado_a || null,
      fecha_limite: fecha,
      creado_por: t.creado_por || perfil?.id || null,
      frecuencia: t.frecuencia,
      recurrencia_intervalo: t.recurrencia_intervalo || 1,
      recurrencia_fecha_fin: t.recurrencia_fecha_fin || null,
      recurrencia_max_repeticiones: t.recurrencia_max_repeticiones || null,
      recurrencia_grupo_id: t.recurrencia_grupo_id || t.id,
      recurrencia_tarea_anterior_id: t.id,
      recurrencia_secuencia: Number(t.recurrencia_secuencia || 1) + 1,
      notificar_participantes: t.notificar_participantes ?? true,
      mostrar_participantes_mi_trabajo: t.mostrar_participantes_mi_trabajo ?? true,
      permitir_comentarios: t.permitir_comentarios ?? true,
      recibir_correos_automaticos: t.recibir_correos_automaticos ?? true,
    }
    const { data: nueva } = await supabase.from("tareas").insert(payload).select("id").single()
    if (nueva?.id) {
      await guardarParticipantes(nueva.id, participantesIds(t))
      await agregarEventoFeed(nueva.id, "cambio_estado", `Ocurrencia generada desde la tarea anterior con fecha límite ${t.fecha_limite || "sin fecha"}.`)
      if (payload.recibir_correos_automaticos) await notificarTarea(nueva.id, "creada")
    }
    return nueva?.id || null
  }

  async function agregarEventoFeed(tareaId: string, tipo: string, comentario: string, linkUrl = "") {
    await supabase.from("tarea_comentarios").insert({
      tarea_id: tareaId,
      usuario_id: perfil?.id,
      comentario,
      tipo,
      link_url: linkUrl || null,
    })
  }

  async function guardar() {
    if (!form.titulo) { alert("El título es obligatorio"); return }
    if (!editando && !form.asignado_a) { alert("Selecciona un responsable para delegar el trabajo."); return }
    setSaving(true)
    const payload: any = {
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      estado: form.estado,
      prioridad: form.prioridad,
      proyecto_id: form.proyecto_id || null,
      cliente_id: form.cliente_id || null,
      asignado_a: form.asignado_a || null,
      fecha_limite: form.fecha_limite || null,
      hora_inicio: form.hora_inicio || null,
      hora_fin: form.hora_fin || null,
      fecha_completada: form.estado === "completada" ? new Date().toISOString() : null,
      frecuencia: form.frecuencia,
      recurrencia_intervalo: Number(form.recurrencia_intervalo || 1),
      recurrencia_fecha_fin: form.recurrencia_fecha_fin || null,
      recurrencia_max_repeticiones: form.recurrencia_max_repeticiones ? Number(form.recurrencia_max_repeticiones) : null,
      notificar_participantes: form.notificar_participantes,
      mostrar_participantes_mi_trabajo: form.mostrar_participantes_mi_trabajo,
      permitir_comentarios: form.permitir_comentarios,
      recibir_correos_automaticos: form.recibir_correos_automaticos,
    }
    if (editando) {
      await supabase.from("tareas").update(payload).eq("id", editando.id)
      await guardarParticipantes(editando.id, form.participante_ids)
      await registrarAccion({ accion: "editar", modulo: "tareas", entidad_tipo: "tarea", descripcion: "Tarea editada: " + form.titulo })
    } else {
      payload.creado_por = perfil?.id || null
      payload.recurrencia_grupo_id = undefined
      const { data: nueva } = await supabase.from("tareas").insert(payload).select("id").single()
      await registrarAccion({ accion: "crear", modulo: "tareas", entidad_tipo: "tarea", descripcion: "Tarea creada: " + form.titulo })
      if (nueva?.id) {
        await supabase.from("tareas").update({ recurrencia_grupo_id: nueva.id }).eq("id", nueva.id)
        await guardarParticipantes(nueva.id, form.participante_ids)
        await agregarEventoFeed(nueva.id, "cambio_estado", "Tarea creada y delegada.")
        if (form.link_inicial?.trim()) {
          await agregarEventoFeed(nueva.id, "adjunto", "Referencia inicial adjunta.", form.link_inicial.trim())
        }
        if (form.recibir_correos_automaticos) await notificarTarea(nueva.id, "creada")
      }
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function cambiarEstado(id: string, estado: string, comentario = "") {
    const tareaActual = tareas.find(t => t.id === id) || selected
    if (!puedeMoverEstado(tareaActual, estado)) {
      alert("No tienes permiso para mover esta tarea a ese estado.")
      return
    }
    const payload: any = { estado }
    if (estado === "completada") payload.fecha_completada = new Date().toISOString()
    await supabase.from("tareas").update(payload).eq("id", id)
    const estadoAnterior = tareaActual?.estado || ""
    const textoFeed = comentario || `Estado cambiado: ${ESTADOS[estadoAnterior]?.label || estadoAnterior} → ${ESTADOS[estado]?.label || estado}`
    await agregarEventoFeed(id, estado === "en_progreso" && estadoAnterior === "en_revision" ? "devolucion" : "cambio_estado", textoFeed)
    await notificarTarea(id, estado === "completada" ? "completada" : estado === "en_progreso" && estadoAnterior === "en_revision" ? "devuelta" : "estado", {
      comentario: textoFeed,
      estado_anterior: ESTADOS[estadoAnterior]?.label || estadoAnterior,
      estado_nuevo: ESTADOS[estado]?.label || estado,
    })
    let generoSiguiente = false
    if (estado === "completada" && tareaActual?.frecuencia && tareaActual.frecuencia !== "no_repite") {
      const siguienteId = await generarSiguienteOcurrencia(tareaActual)
      if (siguienteId) {
        generoSiguiente = true
        await agregarEventoFeed(id, "cambio_estado", "Se generó automáticamente la siguiente ocurrencia recurrente.")
      }
    }
    setTareas(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t))
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, ...payload }))
    await loadComentarios(id)
    if (generoSiguiente) await load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return
    await supabase.from("tareas").delete().eq("id", id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function agregarComentario() {
    if (!nuevoComentario.trim() || !selected) return
    if (selected.permitir_comentarios === false) return
    setSavingCom(true)
    await supabase.from("tarea_comentarios").insert({
      tarea_id: selected.id,
      usuario_id: perfil?.id,
      comentario: nuevoComentario.trim(),
      tipo: nuevoLink.trim() ? "adjunto" : "comentario",
      link_url: nuevoLink.trim() || null,
    })
    await notificarTarea(selected.id, "comentario", { comentario: nuevoComentario.trim() })
    setNuevoComentario("")
    setNuevoLink("")
    await loadComentarios(selected.id)
    setSavingCom(false)
  }

  async function eliminarComentario(id: string) {
    await supabase.from("tarea_comentarios").delete().eq("id", id)
    await loadComentarios(selected.id)
  }

  const rolesGerenciales = ["superadmin", "gerente_general", "gerente_produccion", "gerente_operaciones", "project_manager", "controller"]
  const puedeVerEquipo = rolesGerenciales.includes(perfil?.perfil)

  const tareasFiltradas = tareas.filter(t => {
    if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false
    if (filtroProyecto && t.proyecto_id !== filtroProyecto) return false
    if (filtroPrioridad !== "todos" && t.prioridad !== filtroPrioridad) return false
    if (filtroFecha && t.fecha_limite !== filtroFecha) return false
    if (filtroAsignado === "mias" && t.asignado_a !== perfil?.id) return false
    if (filtroAsignado === "responsable" && t.asignado_a !== responsableId) return false
    if (filtroAsignado === "creadas" && (t.creado_por !== perfil?.id || t.asignado_a === perfil?.id)) return false
    if (filtroAsignado === "participo" && !esParticipante(t)) return false
    if (filtroAsignado === "todos" && !puedeVerEquipo && !esTareaRelacionada(t)) return false
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
  const estadoKeys = ["pendiente", "en_progreso", "en_revision", "completada"]

  function nombreUsuario(u: any) {
    return [u?.nombre, u?.apellido].filter(Boolean).join(" ") || "Sin nombre"
  }

  function inicialesUsuario(u: any) {
    const nombre = nombreUsuario(u)
    return nombre.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?"
  }

  function contarPorEstado(lista: any[], estado: string) {
    return lista.filter(t => t.estado === estado).length
  }

  function formatFecha(fecha?: string) {
    if (!fecha) return "—"
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
  }

  function textoVencimiento(t: any) {
    if (!t.fecha_limite) return "Sin fecha"
    if (["completada", "cancelada"].includes(t.estado)) return ESTADOS[t.estado]?.label || "Cerrada"
    const limite = new Date(`${t.fecha_limite}T12:00:00`).getTime()
    const actual = new Date(`${hoy}T12:00:00`).getTime()
    const diff = Math.round((limite - actual) / (24 * 60 * 60 * 1000))
    if (diff < 0) return `Vencida hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`
    if (diff === 0) return "Vence hoy"
    return `Vence en ${diff} día${diff !== 1 ? "s" : ""}`
  }

  function abrirGoogleCalendar(t: any) {
    if (!t?.fecha_limite) {
      alert("Esta tarea necesita fecha límite para poder agendarse.")
      return
    }

    const inicio = t.hora_inicio || "09:00"
    const fin = t.hora_fin || "10:00"
    const fecha = String(t.fecha_limite).replaceAll("-", "")

    const horaInicio = inicio.replace(":", "") + "00"
    const horaFin = fin.replace(":", "") + "00"

    const titulo = encodeURIComponent(`Tarea: ${t.titulo || "Sin título"}`)
    const descripcion = encodeURIComponent(
      [
        t.descripcion || "",
        "",
        `Proyecto: ${t.proyecto?.codigo || ""} ${t.proyecto?.nombre || ""}`.trim(),
        `Cliente: ${t.cliente?.razon_social || "—"}`,
        `Responsable: ${t.asignado ? nombreUsuario(t.asignado) : "Sin responsable"}`,
        "",
        `ERP Izango 360: ${window.location.origin}/tareas?tarea_id=${t.id}`,
      ].filter(Boolean).join("\n")
    )

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&details=${descripcion}&dates=${fecha}T${horaInicio}/${fecha}T${horaFin}`

    window.open(url, "_blank", "noopener,noreferrer")
  }
  function toggleParticipante(id: string) {
    setForm(prev => {
      const exists = prev.participante_ids.includes(id)
      return { ...prev, participante_ids: exists ? prev.participante_ids.filter(pid => pid !== id) : [...prev.participante_ids, id] }
    })
  }

  const hoy = new Date().toISOString().split("T")[0]
  const estaVencida = (t: any) => t.fecha_limite && t.fecha_limite < hoy && t.estado !== "completada" && t.estado !== "cancelada"
  const enProximaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const misTareas = perfil?.id ? tareas.filter(t => t.asignado_a === perfil.id) : tareas
  const tareasDelegadas = perfil?.id ? tareas.filter(t => t.creado_por === perfil.id && t.asignado_a !== perfil.id) : []
  const tareasParticipa = perfil?.id ? tareas.filter(esParticipante) : []
  const tareasRelacionadas = puedeVerEquipo ? tareas : tareas.filter(esTareaRelacionada)
  const participantesSeleccionados = usuarios.filter(u => form.participante_ids.includes(u.id))
  const participantesDisponibles = usuarios
    .filter(u => u.id !== form.asignado_a)
    .filter(u => {
      const q = participanteSearch.trim().toLowerCase()
      if (!q) return true
      return `${u.nombre || ""} ${u.apellido || ""} ${u.perfil || ""} ${u.email || ""}`.toLowerCase().includes(q)
    })
  const responsableSeleccionado = usuarios.find(u => u.id === responsableId)
  const nombreResponsable = responsableSeleccionado ? `${responsableSeleccionado.nombre} ${responsableSeleccionado.apellido}` : "responsable"
  const subtituloTrabajo =
    filtroAsignado === "mias"
      ? `${misTareas.length} tareas asignadas a mí`
      : filtroAsignado === "creadas"
        ? `${tareasDelegadas.length} tareas creadas por mí`
        : filtroAsignado === "participo"
          ? `${tareasParticipa.length} tareas donde participo`
      : filtroAsignado === "responsable"
        ? `${tareasFiltradas.length} tareas de ${nombreResponsable}`
        : `${tareasFiltradas.length} tareas del equipo`
  const misPendientes = misTareas.filter(t => t.estado === "pendiente").length
  const misEnProgreso = misTareas.filter(t => t.estado === "en_progreso").length
  const misRevision = misTareas.filter(t => t.estado === "en_revision").length
  const misCompletadas = misTareas.filter(t => t.estado === "completada").length
  const misVencidas = misTareas.filter(estaVencida).length
  const proximasEntregas = misTareas.filter(t =>
    t.fecha_limite &&
    t.fecha_limite >= hoy &&
    t.fecha_limite <= enProximaSemana &&
    t.estado !== "completada" &&
    t.estado !== "cancelada"
  ).length
  const pendientesRespuesta = tareasDelegadas.filter(t => t.estado === "pendiente").length
  const delegadasEnEjecucion = tareasDelegadas.filter(t => t.estado === "en_progreso").length
  const delegadasRevision = tareasDelegadas.filter(t => t.estado === "en_revision").length
  const delegadasCompletadas = tareasDelegadas.filter(t => t.estado === "completada").length
  const avancePorEstado: Record<string, number> = { pendiente: 0, en_progreso: 40, en_revision: 80, completada: 100, cancelada: 0 }
  const avanceDelegadas = tareasDelegadas.length
    ? Math.round(tareasDelegadas.reduce((acc, t) => acc + (avancePorEstado[t.estado] ?? 0), 0) / tareasDelegadas.length)
    : 0
  const tareasResumenActual =
    filtroAsignado === "mias"
      ? misTareas
      : filtroAsignado === "creadas"
        ? tareasDelegadas
        : filtroAsignado === "participo"
          ? tareasParticipa
          : filtroAsignado === "responsable"
            ? tareas.filter(t => t.asignado_a === responsableId)
            : tareasRelacionadas
  const tarjetasResumenActual = estadoKeys.map(estado => ({
    estado,
    label: ESTADOS[estado].label,
    value: contarPorEstado(tareasResumenActual, estado),
    ...ESTADOS[estado],
  }))
  const tituloResumenActual =
    filtroAsignado === "mias"
      ? "Tareas asignadas a mí"
      : filtroAsignado === "creadas"
        ? "Tareas delegadas por mí"
        : filtroAsignado === "participo"
          ? "Tareas en las que participo"
          : filtroAsignado === "responsable"
            ? `Tareas de ${nombreResponsable}`
            : puedeVerEquipo ? "Todas las tareas" : "Todas mis tareas relacionadas"
  const subtituloResumenActual =
    filtroAsignado === "mias"
      ? "Tareas que debo ejecutar personalmente"
      : filtroAsignado === "creadas"
        ? "Tareas creadas por mí y asignadas a otra persona"
        : filtroAsignado === "participo"
          ? "Tareas donde estoy como participante o seguidor"
          : filtroAsignado === "responsable"
            ? "Seguimiento por responsable"
            : puedeVerEquipo ? "Vista completa del sistema según permisos" : "Asignadas, delegadas o participadas por mí"
  const tabsTrabajo = [
    { key: "mias", label: "Asignadas a mí", count: misTareas.length, icon: User },
    { key: "creadas", label: "Delegadas por mí", count: tareasDelegadas.length, icon: Users },
    { key: "participo", label: "En las que participo", count: tareasParticipa.length, icon: Eye },
    { key: "todos", label: "Todas", count: tareasRelacionadas.length, icon: Grid2X2 },
  ]
  const tareasPagina = tareasFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina)
  const totalPaginas = Math.max(1, Math.ceil(tareasFiltradas.length / porPagina))

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 80px)" }}>

      {/* ── PANEL IZQUIERDO ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111827" }}>Mi trabajo</h1>
            <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>Resumen de mis tareas y seguimiento</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/audiovisual/requerimientos")} className="btn-secondary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><ClipboardCheck size={16} />Req. audiovisual</button>
            <button onClick={abrirNueva} className="btn-primary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} />Nueva tarea</button>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          {[
            { title: tituloResumenActual, subtitle: subtituloResumenActual, cards: tarjetasResumenActual },
          ].map(section => (
            <div key={section.title} className="card" style={{ padding: 20, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#111827", textTransform: "uppercase" }}>{section.title}</h2>
                <p style={{ fontSize: 12, color: "#475569", margin: "10px 0 0" }}>{section.subtitle}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
                {section.cards.map((c, idx) => {
                  const Icon = c.estado === "pendiente" ? ClipboardCheck : c.estado === "en_progreso" ? Play : c.estado === "en_revision" ? Eye : Check
                  const tint = c.estado === "pendiente" ? "#fef3c7" : c.estado === "en_progreso" ? "#dbeafe" : c.estado === "en_revision" ? "#ede9fe" : "#dcfce7"
                  return (
                  <div key={c.estado} style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 20px", borderLeft: idx === 0 ? "none" : "1px solid #e5e7eb" }}>
                    <span style={{ width: 52, height: 52, borderRadius: 16, background: tint, color: c.color, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.55)" }}>
                      <Icon size={24} />
                    </span>
                    <div>
                      <div style={{ fontSize: 24, lineHeight: 1.1, color: "#0f172a", fontWeight: 900 }}>{c.value}</div>
                      <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>{c.label}</div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 22, padding: 20, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#111827", textTransform: "uppercase" }}>Avance general de tareas delegadas</h2>
          <p style={{ fontSize: 12, color: "#475569", margin: "10px 0 14px" }}>Porcentaje de avance promedio de las tareas que he delegado</p>
          <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 260px", gap: 24, alignItems: "center" }}>
            <div style={{ width: 108, height: 108, borderRadius: "50%", background: `conic-gradient(#16a34a ${avanceDelegadas * 3.6}deg, #e5e7eb 0deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 84, height: 84, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#334155" }}>{avanceDelegadas}%</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 12 }}>{delegadasCompletadas} de {tareasDelegadas.length} tareas completadas</div>
              <div style={{ height: 7, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${avanceDelegadas}%`, height: "100%", background: "#16a34a" }} />
              </div>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {[
                { estado: "completada", label: "Completadas", color: "#16a34a" },
                { estado: "en_progreso", label: "En progreso", color: "#3b82f6" },
                { estado: "en_revision", label: "En revisión", color: "#8b5cf6" },
                { estado: "pendiente", label: "Pendientes", color: "#f59e0b" },
              ].map(item => (
                <div key={item.estado} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#334155" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 99, background: item.color }} />
                  {contarPorEstado(tareasDelegadas, item.estado)} {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#fff", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
          {[
            { key: "mias", label: "Asignadas a mí", value: misTareas.length },
            { key: "creadas", label: "Delegadas por mí", value: tareasDelegadas.length },
            { key: "participo", label: "Participo", value: tareasParticipa.length },
            { key: "todos", label: "Todas relacionadas", value: tareasRelacionadas.length },
          ].map((item, idx) => (
            <button
              key={item.key}
              onClick={() => { setFiltroAsignado(item.key); setResponsableId(""); setPagina(1) }}
              style={{ padding: "10px 14px", border: "none", borderLeft: idx === 0 ? "none" : "1px solid #e5e7eb", background: filtroAsignado === item.key ? "#F0FDF4" : "#FFFFFF", color: filtroAsignado === item.key ? "#0F6E56" : "#475569", cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{item.value}</div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 24, padding: "0 16px", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
          {tabsTrabajo.map(tab => {
            const active = filtroAsignado === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => { setFiltroAsignado(tab.key); setResponsableId("") }}
                style={{ padding: "16px 0", border: "none", borderBottom: `2px solid ${active ? "#0F6E56" : "transparent"}`, background: "transparent", color: active ? "#0F6E56" : "#1f2937", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Icon size={16} /> {tab.label} <span style={{ opacity: 0.6 }}>({tab.count})</span>
              </button>
            )
          })}
        </div>

        {/* Filtros */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 220px 220px 210px 1fr auto auto", gap: 12, padding: 16, borderBottom: "1px solid #e5e7eb", alignItems: "center" }}>
          <select style={inp} value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={inp} value={filtroProyecto} onChange={e => { setFiltroProyecto(e.target.value); setPagina(1) }}>
            <option value="">Todos los proyectos</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
          </select>
          <select style={inp} value={filtroPrioridad} onChange={e => { setFiltroPrioridad(e.target.value); setPagina(1) }}>
            <option value="todos">Todas las prioridades</option>
            {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ position: "relative" }}>
            <input style={{ ...inp, paddingRight: 34 }} type="date" value={filtroFecha} onChange={e => { setFiltroFecha(e.target.value); setPagina(1) }} />
            <CalendarDays size={16} style={{ position: "absolute", right: 10, top: 9, color: "#64748b", pointerEvents: "none" }} />
          </div>
          {puedeVerEquipo && (
            <select style={inp} value={responsableId} onChange={e => { setResponsableId(e.target.value); if (e.target.value) setFiltroAsignado("responsable"); setPagina(1) }}>
              <option value="">Seleccionar responsable</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          )}
          {!puedeVerEquipo && <div />}
          <div style={{ justifySelf: "end", fontSize: 12, color: "#334155" }}>Ordenar por</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select style={{ ...inp, minWidth: 150 }} value={ordenCampo} onChange={e => setOrdenCampo(e.target.value)}>
            <option value="fecha_limite">Ordenar: Fecha límite</option>
            <option value="titulo">Ordenar: Título</option>
            <option value="proyecto">Ordenar: Proyecto</option>
            <option value="cliente">Ordenar: Cliente</option>
            <option value="prioridad">Ordenar: Prioridad</option>
            <option value="asignado">Ordenar: Asignado a</option>
            <option value="estado">Ordenar: Estado</option>
          </select>
          <button onClick={() => setOrdenDir(ordenDir === "asc" ? "desc" : "asc")} title="Cambiar orden" style={{ width: 36, height: 36, border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", cursor: "pointer", color: "#334155" }}><ArrowUpDown size={15} /></button>
          </div>
        </div>
        {/* Lista de tareas */}
        <div style={{ padding: 0, overflow: "hidden" }}>
          {tareasFiltradas.length === 0 ? (
            <div style={{ padding: "38px 20px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
              <div style={{ fontWeight: 800, color: "#334155", marginBottom: 8 }}>No hay tareas en esta vista</div>
              <div style={{ marginBottom: 16 }}>
                {filtroAsignado === "mias" && tareasDelegadas.length > 0
                  ? `No tienes tareas asignadas como responsable, pero sí tienes ${tareasDelegadas.length} tarea${tareasDelegadas.length !== 1 ? "s" : ""} delegada${tareasDelegadas.length !== 1 ? "s" : ""} para seguimiento.`
                  : "Prueba otra vista o ajusta los filtros para revisar tareas relacionadas."}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {tareasDelegadas.length > 0 && (
                  <button onClick={() => { setFiltroAsignado("creadas"); setPagina(1) }} className="btn-primary" style={{ fontSize: 12 }}>
                    Ver delegadas por mí ({tareasDelegadas.length})
                  </button>
                )}
                {tareasParticipa.length > 0 && (
                  <button onClick={() => { setFiltroAsignado("participo"); setPagina(1) }} className="btn-secondary" style={{ fontSize: 12 }}>
                    Ver en las que participo ({tareasParticipa.length})
                  </button>
                )}
                {tareasRelacionadas.length > 0 && (
                  <button onClick={() => { setFiltroAsignado("todos"); setPagina(1) }} className="btn-secondary" style={{ fontSize: 12 }}>
                    Ver todas ({tareasRelacionadas.length})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ width: 42, padding: "10px 16px" }}><input type="checkbox" disabled /></th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 800, color: "#6b7280" }}>TAREA</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: "#6b7280", width: 150 }}>PROYECTO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: "#6b7280", width: 170 }}>RESPONSABLE</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: "#6b7280", width: 110 }}>ESTADO</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: "#6b7280", width: 90 }}>PRIORIDAD</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: "#6b7280", width: 130 }}>FECHA LÍMITE</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {tareasPagina.map((t, idx) => {
                  const es = ESTADOS[t.estado] || ESTADOS.pendiente
                  const pr = PRIORIDADES[t.prioridad] || PRIORIDADES.media
                  const vencida = estaVencida(t)
                  const rolUsuario = rolUsuarioEnTarea(t)
                  const participantes = participantesNombres(t)
                  return (
                    <tr
                      key={t.id}
                      onClick={() => {
                        if (t.origen === "audiovisual" && t.origen_id) {
                          router.push(`/audiovisual/requerimientos?requerimiento_id=${t.origen_id}`)
                          return
                        }
                        abrirDetalle(t)
                      }}
                      style={{ borderTop: "1px solid #F1F5F9", background: selected?.id === t.id ? "#F0FDF4" : "#FFFFFF", cursor: "pointer" }}>
                      <td style={{ padding: "10px 16px" }}><input type="checkbox" onClick={e => e.stopPropagation()} /></td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{t.titulo}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t.proyecto?.codigo || "Sin proyecto"}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Solicitante: {t.creador ? nombreUsuario(t.creador) : "—"}</div>
                        {participantes && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Participantes: {participantes}</div>}
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                          {t.origen_label && (
                            <span style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: 99,
                              textTransform: "uppercase"
                            }}>
                              {t.origen_label}
                            </span>
                          )}
                          {rolUsuario && <span style={{ fontSize: 10, background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: 99, fontWeight: 800 }}>Mi rol: {rolUsuario}</span>}
                          {vencida && <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>VENCIDA</span>}
                          {t.frecuencia && t.frecuencia !== "no_repite" && <span style={{ fontSize: 10, background: "#ecfeff", color: "#155e75", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>{FRECUENCIAS[t.frecuencia] || "Recurrente"}</span>}
                          {(t.participantes || []).length > 0 && <span style={{ fontSize: 10, background: "#f3f4f6", color: "#4b5563", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>{(t.participantes || []).length} participante{(t.participantes || []).length !== 1 ? "s" : ""}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>
                        <div style={{ fontWeight: 700, color: "#374151" }}>{t.proyecto?.codigo || "—"}</div>
                        <div>{t.proyecto?.nombre || t.cliente?.razon_social || "Sin proyecto"}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#374151", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 28, height: 28, borderRadius: 99, background: "#eef2ff", color: "#3730a3", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{inicialesUsuario(t.asignado)}</span>
                          <span>{t.asignado ? nombreUsuario(t.asignado) : "Sin responsable"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ background: es.bg, color: es.color, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{es.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{pr.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: vencida ? "#991b1b" : "#6b7280", fontWeight: vencida ? 700 : 400, whiteSpace: "nowrap" }}>
                        <div>{formatFecha(t.fecha_limite)}</div>
                        <div style={{ fontSize: 10, color: vencida ? "#991b1b" : "#9ca3af", fontWeight: 600 }}>{textoVencimiento(t)}</div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={e => { e.stopPropagation(); abrirEditar(t) }}
                            style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#334155" }}><MoreVertical size={16} /></button>
                          <button onClick={e => { e.stopPropagation(); eliminar(t.id) }}
                            style={{ width: 30, height: 30, border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>×</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#334155" }}>Mostrando {tareasFiltradas.length === 0 ? 0 : (pagina - 1) * porPagina + 1} de {tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? "s" : ""}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#334155" }}>Filas por página:</span>
            <select
              style={{ ...inp, width: 84 }}
              value={porPagina}
              onChange={(e) => {
                setPorPagina(Number(e.target.value))
                setPagina(1)
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button disabled={pagina <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))} style={{ width: 34, height: 34, border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", cursor: pagina <= 1 ? "not-allowed" : "pointer", color: "#334155" }}>‹</button>
            <div style={{ minWidth: 34, height: 34, border: "1px solid #2563eb", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", fontWeight: 800, fontSize: 13 }}>{pagina}</div>
            <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} style={{ width: 34, height: 34, border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", cursor: pagina >= totalPaginas ? "not-allowed" : "pointer", color: "#334155" }}>›</button>
          </div>
        </div>
        </div>
        <div className="card" style={{ marginTop: 14, padding: 14, background: "#fff", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", marginBottom: 10, textTransform: "uppercase" }}>Leyenda de estados</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { estado: "pendiente", texto: "Tareas asignadas pero aún no iniciadas." },
              { estado: "en_progreso", texto: "Tareas que están siendo trabajadas actualmente." },
              { estado: "en_revision", texto: "Tareas completadas por el responsable y pendientes de validación." },
              { estado: "completada", texto: "Tareas finalizadas y aprobadas." },
            ].map(item => (
              <div key={item.estado} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: ESTADOS[item.estado].color, marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>{ESTADOS[item.estado].label}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>{item.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected && (
        <div style={{ width: 380, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827", flex: 1, paddingRight: 8 }}>{selected.titulo}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>×</button>
          </div>

          {/* Estado y acciones */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>ESTADO Y ACCIONES</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 99, background: ESTADOS[selected.estado]?.bg || "#f3f4f6", color: ESTADOS[selected.estado]?.color || "#6b7280", fontWeight: 700 }}>
                {ESTADOS[selected.estado]?.label || selected.estado}
              </span>
              {puedeMoverEstado(selected, "en_progreso") && selected.estado === "pendiente" && (
                <button onClick={() => cambiarEstado(selected.id, "en_progreso")} className="btn-secondary" style={{ fontSize: 12 }}>Iniciar</button>
              )}
              {puedeMoverEstado(selected, "en_revision") && selected.estado === "en_progreso" && (
                <button onClick={() => cambiarEstado(selected.id, "en_revision")} className="btn-primary" style={{ fontSize: 12 }}>Enviar a revisión</button>
              )}
              {puedeMoverEstado(selected, "completada") && selected.estado === "en_revision" && (
                <button onClick={() => cambiarEstado(selected.id, "completada")} className="btn-primary" style={{ fontSize: 12 }}>Aprobar / cerrar tarea</button>
              )}
              {puedeMoverEstado(selected, "en_progreso") && selected.estado === "en_revision" && (
                <button onClick={() => {
                  const obs = prompt("Observación para devolver la tarea:")
                  if (obs?.trim()) cambiarEstado(selected.id, "en_progreso", obs.trim())
                }} className="btn-secondary" style={{ fontSize: 12 }}>Devolver con observación</button>
              )}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => abrirGoogleCalendar(selected)}
              className="btn-secondary"
              style={{ width: "100%", fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <CalendarDays size={16} />
              Agendar en Google Calendar
            </button>
          </div>


          {/* Info */}
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Prioridad", value: PRIORIDADES[selected.prioridad]?.label || "—" },
              { label: "Responsable", value: selected.asignado ? selected.asignado.nombre + " " + selected.asignado.apellido : "—" },
              { label: "Solicitante", value: selected.creador ? selected.creador.nombre + " " + selected.creador.apellido : "—" },
              { label: "Participantes", value: participantesNombres(selected) || "—" },
              { label: "Mi rol", value: rolUsuarioEnTarea(selected) || "—" },
              { label: "Frecuencia", value: FRECUENCIAS[selected.frecuencia] || "No se repite" },
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
                <div key={c.id} style={{ background: c.tipo === "devolucion" ? "#fef2f2" : c.tipo === "cambio_estado" ? "#f0fdf4" : "#f9fafb", borderRadius: 8, padding: "8px 10px", border: c.tipo === "devolucion" ? "1px solid #fecaca" : c.tipo === "cambio_estado" ? "1px solid #bbf7d0" : "1px solid transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>
                      {c.usuario?.nombre} {c.usuario?.apellido}
                      {c.tipo && c.tipo !== "comentario" && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: c.tipo === "devolucion" ? "#991b1b" : "#0F6E56", fontWeight: 800, textTransform: "uppercase" }}>{c.tipo === "cambio_estado" ? "estado" : c.tipo}</span>
                      )}
                    </span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(c.created_at).toLocaleDateString("es-PE")}</span>
                      {c.usuario_id === perfil?.id && (
                        <button onClick={() => eliminarComentario(c.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 12 }}>×</button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.comentario}</div>
                  {c.link_url && (
                    <a href={c.link_url} target="_blank" style={{ fontSize: 11, color: "#1e40af", display: "inline-block", marginTop: 5 }}>Abrir link / adjunto</a>
                  )}
                </div>
              ))}
            </div>
            {selected.permitir_comentarios === false ? (
              <div style={{ padding: 10, background: "#f9fafb", borderRadius: 8, color: "#6b7280", fontSize: 12 }}>
                Los comentarios están desactivados para esta tarea.
              </div>
            ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <textarea
                style={{ ...inp, minHeight: 68, resize: "vertical" }}
                placeholder="Escribe un comentario o actualización..."
                value={nuevoComentario}
                onChange={e => setNuevoComentario(e.target.value)}
              />
              <input
                style={inp}
                placeholder="Link de Drive o referencia (opcional)"
                value={nuevoLink}
                onChange={e => setNuevoLink(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={agregarComentario} disabled={savingCom || !nuevoComentario.trim()}
                  style={{ padding: "7px 14px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {savingCom ? "..." : "Comentar"}
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL FORM ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{editando ? "Editar seguimiento" : "Delegar trabajo"}</h2>
                {!editando && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    Solicitante: {[perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ") || "Usuario actual"}
                  </div>
                )}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {!editando && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                  {[
                    { label: "1. Pendiente", active: true },
                    { label: "2. En progreso", active: false },
                    { label: "3. En revisión", active: false },
                    { label: "4. Cierre", active: false },
                  ].map(paso => (
                    <div key={paso.label} style={{ padding: "8px 10px", borderRadius: 8, background: paso.active ? "#fef9c3" : "#fff", border: "1px solid " + (paso.active ? "#fde68a" : "#e5e7eb"), color: paso.active ? "#92400e" : "#6b7280", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                      {paso.label}
                    </div>
                  ))}
                </div>
              )}
              <div>
                <label style={lbl}>TÍTULO *</label>
                <input style={inp} value={form.titulo} placeholder="Título de la tarea" onChange={e => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>DESCRIPCIÓN</label>
                <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.descripcion} placeholder="Detalle de la tarea..." onChange={e => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {editando ? (
                  <div>
                    <label style={lbl}>ESTADO</label>
                    <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                      {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>ESTADO INICIAL</label>
                    <div style={{ padding: "9px 10px", border: "1px solid #fde68a", borderRadius: 7, background: "#fef9c3", color: "#92400e", fontSize: 13, fontWeight: 700 }}>
                      Pendiente
                    </div>
                  </div>
                )}
                <div>
                  <label style={lbl}>PRIORIDAD</label>
                  <select style={inp} value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                    {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>RESPONSABLE PRINCIPAL *</label>
                <select style={inp} value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value, participante_ids: form.participante_ids.filter(id => id !== e.target.value) })}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.perfil}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>PARTICIPANTES / SEGUIDORES</label>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", padding: 10 }}>
                  {participantesSeleccionados.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {participantesSeleccionados.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleParticipante(u.id)}
                          style={{ border: "1px solid #dbeafe", background: "#eff6ff", color: "#1e40af", borderRadius: 99, padding: "4px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          {nombreUsuario(u)} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    style={{ ...inp, border: "1px solid #f3f4f6", marginBottom: 8 }}
                    value={participanteSearch}
                    placeholder="Buscar usuarios para agregar..."
                    onChange={e => setParticipanteSearch(e.target.value)}
                  />
                  <div style={{ maxHeight: 170, overflowY: "auto", display: "grid", gap: 4 }}>
                    {participantesDisponibles.length === 0 ? (
                      <div style={{ padding: 10, color: "#9ca3af", fontSize: 12 }}>No hay usuarios con esa búsqueda</div>
                    ) : participantesDisponibles.map(u => {
                      const checked = form.participante_ids.includes(u.id)
                      return (
                        <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, background: checked ? "#f0fdf4" : "#fff", border: `1px solid ${checked ? "#bbf7d0" : "#f3f4f6"}`, cursor: "pointer" }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleParticipante(u.id)} />
                          <span style={{ width: 26, height: 26, borderRadius: 99, background: "#eef2ff", color: "#3730a3", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{inicialesUsuario(u)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#374151" }}>{nombreUsuario(u)} <span style={{ fontWeight: 600, color: "#9ca3af" }}>— {u.perfil || "Sin rol"}</span></span>
                            {u.email && <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>{u.email}</span>}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>HORA INICIO</label>
                  <input type="time" style={inp} value={form.hora_inicio || ""} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>HORA FIN</label>
                  <input type="time" style={inp} value={form.hora_fin || ""} onChange={e => setForm({ ...form, hora_fin: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FRECUENCIA</label>
                  <select style={inp} value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })}>
                    {Object.entries(FRECUENCIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {form.frecuencia.startsWith("personalizado") && (
                  <div>
                    <label style={lbl}>CADA</label>
                    <input type="number" min={1} style={inp} value={form.recurrencia_intervalo} onChange={e => setForm({ ...form, recurrencia_intervalo: Number(e.target.value) })} />
                  </div>
                )}
              </div>
              {form.frecuencia !== "no_repite" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>FECHA FIN</label>
                    <input type="date" style={inp} value={form.recurrencia_fecha_fin} onChange={e => setForm({ ...form, recurrencia_fecha_fin: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>MÁXIMO DE REPETICIONES</label>
                    <input type="number" min={1} style={inp} value={form.recurrencia_max_repeticiones} onChange={e => setForm({ ...form, recurrencia_max_repeticiones: e.target.value })} />
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { key: "notificar_participantes" as const, label: "Notificar participantes" },
                  { key: "mostrar_participantes_mi_trabajo" as const, label: "Mostrar en Mi Trabajo" },
                  { key: "permitir_comentarios" as const, label: "Permitir comentarios" },
                  { key: "recibir_correos_automaticos" as const, label: "Correos automáticos" },
                ].map(option => (
                  <label key={option.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151", fontWeight: 600 }}>
                    <input type="checkbox" checked={form[option.key]} onChange={e => setForm({ ...form, [option.key]: e.target.checked })} />
                    {option.label}
                  </label>
                ))}
              </div>
              {!editando && (
                <>
                  <div>
                    <label style={lbl}>LINK O REFERENCIA INICIAL</label>
                    <input style={inp} value={form.link_inicial} placeholder="https://drive.google.com/..." onChange={e => setForm({ ...form, link_inicial: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : editando ? "Actualizar" : "Delegar trabajo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}















