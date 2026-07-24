"use client"
import { useEffect, useState, type CSSProperties } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

import { rowBelongsToDeletedProject } from "@/lib/projects"
import { ArrowDown, ArrowUp, CalendarDays, ClipboardCheck, Eye, Grid2X2, MoreVertical, Plus, Trash2, User, Users } from "lucide-react"
import { TaskForm } from "./components/TaskForm"
import { agregarEventoFeedTarea, guardarParticipantesTarea, guardarTareaService, notificarTarea } from "@/lib/services/tareas"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Badge,
  V2Button,
  V2DataTable,
  V2Drawer,
  V2EmptyState,
  V2Input,
  V2Modal,
  V2PageHeader,
  V2Pagination,
  V2SectionCard,
  V2Select,
  V2Tabs,
  type V2DataTableColumn,
} from "@/components/v2/system"
import type { V2BadgeVariant } from "@/components/v2/system/V2Badge"
import styles from "./MiTrabajoV2.module.css"

const ESTADOS: Record<string, any> = {
  pendiente:    { label: "Pendiente", variant: "warning" },
  en_progreso:  { label: "En progreso", variant: "information" },
  en_revision:  { label: "En revisión", variant: "primary" },
  completada:   { label: "Completada", variant: "success" },
  cancelada:    { label: "Cancelada", variant: "danger" },
}

const PRIORIDADES: Record<string, any> = {
  baja:    { label: "Baja", variant: "neutral" },
  media:   { label: "Media", variant: "warning" },
  alta:    { label: "Alta", variant: "error" },
  urgente: { label: "Urgente", variant: "danger" },
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

  // notificarTarea/guardarParticipantes/agregarEventoFeed se movieron a
  // lib/services/tareas/tareas.guardar.ts (importadas arriba) para que guardar() y
  // generarSiguienteOcurrencia() usen la misma implementacion, sin duplicarla.

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
      await guardarParticipantesTarea(supabase, nueva.id, participantesIds(t))
      await agregarEventoFeedTarea(supabase, perfil?.id, nueva.id, "cambio_estado", `Ocurrencia generada desde la tarea anterior con fecha límite ${t.fecha_limite || "sin fecha"}.`)
      if (payload.recibir_correos_automaticos) await notificarTarea(nueva.id, "creada")
    }
    return nueva?.id || null
  }

  async function guardar() {
    setSaving(true)
    const resultado = await guardarTareaService({ supabase, form, editando, perfil })
    if (!resultado.ok) {
      alert(resultado.error)
      setSaving(false)
      return
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
    await agregarEventoFeedTarea(supabase, perfil?.id, id, estado === "en_progreso" && estadoAnterior === "en_revision" ? "devolucion" : "cambio_estado", textoFeed)
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
        await agregarEventoFeedTarea(supabase, perfil?.id, id, "cambio_estado", "Se generó automáticamente la siguiente ocurrencia recurrente.")
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

  const rolesGerenciales = ["superadmin", "gerente_general", "gerente_produccion", "controller"]
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
  const hoy = new Date().toISOString().split("T")[0]
  const estaVencida = (t: any) => t.fecha_limite && t.fecha_limite < hoy && t.estado !== "completada" && t.estado !== "cancelada"
  const enProximaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const misTareas = perfil?.id ? tareas.filter(t => t.asignado_a === perfil.id) : tareas
  const tareasDelegadas = perfil?.id ? tareas.filter(t => t.creado_por === perfil.id && t.asignado_a !== perfil.id) : []
  const tareasParticipa = perfil?.id ? tareas.filter(esParticipante) : []
  const tareasRelacionadas = puedeVerEquipo ? tareas : tareas.filter(esTareaRelacionada)
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

  const estadoVariant = (estado: string): V2BadgeVariant =>
    (ESTADOS[estado]?.variant || "neutral") as V2BadgeVariant
  const prioridadVariant = (prioridad: string): V2BadgeVariant =>
    (PRIORIDADES[prioridad]?.variant || "neutral") as V2BadgeVariant

  const columns: V2DataTableColumn<any>[] = [
    {
      id: "seleccion",
      header: <input aria-label="Seleccionar todas las tareas" disabled type="checkbox" />,
      width: 42,
      cell: () => <input aria-label="Seleccionar tarea" onClick={(event) => event.stopPropagation()} type="checkbox" />,
    },
    {
      id: "tarea",
      header: "Tarea",
      minWidth: 260,
      cell: (t) => {
        const vencida = estaVencida(t)
        const participantes = participantesNombres(t)
        const rolUsuario = rolUsuarioEnTarea(t)
        return (
          <div className={styles.taskCell} title={t.titulo}>
            <div className={styles.taskTitle}>{t.titulo}</div>
            <div className={styles.taskMeta}>{t.proyecto?.codigo || "Sin proyecto"} · Solicitante: {t.creador ? nombreUsuario(t.creador) : "—"}</div>
            {participantes ? <div className={styles.taskMeta}>Participantes: {participantes}</div> : null}
            <div className={styles.badges}>
              {t.origen_label ? <V2Badge size="sm" variant="information">{t.origen_label}</V2Badge> : null}
              {rolUsuario ? <V2Badge size="sm" variant="primary">Mi rol: {rolUsuario}</V2Badge> : null}
              {vencida ? <V2Badge size="sm" variant="danger">Vencida</V2Badge> : null}
              {t.frecuencia && t.frecuencia !== "no_repite" ? <V2Badge size="sm" variant="information">{FRECUENCIAS[t.frecuencia] || "Recurrente"}</V2Badge> : null}
              {(t.participantes || []).length > 0 ? <V2Badge size="sm" variant="neutral">{(t.participantes || []).length} participante{(t.participantes || []).length !== 1 ? "s" : ""}</V2Badge> : null}
            </div>
          </div>
        )
      },
    },
    {
      id: "proyecto",
      header: "Proyecto",
      width: 170,
      minWidth: 150,
      cell: (t) => (
        <div className={styles.projectCell}>
          <div className={styles.taskTitle}>{t.proyecto?.codigo || "—"}</div>
          <div className={styles.projectName} title={t.proyecto?.nombre || t.cliente?.razon_social || "Sin proyecto"}>
            {t.proyecto?.nombre || t.cliente?.razon_social || "Sin proyecto"}
          </div>
        </div>
      ),
    },
    {
      id: "responsable",
      header: "Responsable",
      width: 180,
      minWidth: 160,
      cell: (t) => (
        <div className={styles.personCell}>
          <span className={styles.avatar}>{inicialesUsuario(t.asignado)}</span>
          <span className={styles.personName}>{t.asignado ? nombreUsuario(t.asignado) : "Sin responsable"}</span>
        </div>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      align: "center",
      width: 120,
      cell: (t) => <V2Badge size="sm" variant={estadoVariant(t.estado)}>{ESTADOS[t.estado]?.label || t.estado}</V2Badge>,
    },
    {
      id: "prioridad",
      header: "Prioridad",
      align: "center",
      width: 100,
      cell: (t) => <V2Badge size="sm" variant={prioridadVariant(t.prioridad)}>{PRIORIDADES[t.prioridad]?.label || t.prioridad}</V2Badge>,
    },
    {
      id: "fecha",
      header: "Fecha límite",
      align: "center",
      width: 140,
      cell: (t) => {
        const vencida = estaVencida(t)
        return (
          <div className={`${styles.dateCell} ${vencida ? styles.dateDanger : ""}`}>
            <div>{formatFecha(t.fecha_limite)}</div>
            <div className={styles.dateMeta}>{textoVencimiento(t)}</div>
          </div>
        )
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      align: "right",
      width: 110,
      cell: (t) => (
        <div className={styles.rowActions}>
          <V2Button aria-label={`Editar ${t.titulo}`} onClick={(event) => { event.stopPropagation(); abrirEditar(t) }} size="compact" variant="ghost">
            <MoreVertical size={16} />
          </V2Button>
          <V2Button aria-label={`Eliminar ${t.titulo}`} onClick={(event) => { event.stopPropagation(); eliminar(t.id) }} size="compact" variant="danger">
            <Trash2 size={14} />
          </V2Button>
        </div>
      ),
    },
  ]

  const emptyState = (
    <V2EmptyState
      compact
      description={filtroAsignado === "mias" && tareasDelegadas.length > 0
        ? `No tienes tareas asignadas como responsable, pero sí ${tareasDelegadas.length} delegada${tareasDelegadas.length !== 1 ? "s" : ""} para seguimiento.`
        : "Prueba otra vista o ajusta los filtros para revisar tareas relacionadas."}
      icon={<ClipboardCheck size={24} />}
      primaryAction={tareasDelegadas.length > 0
        ? <V2Button onClick={() => { setFiltroAsignado("creadas"); setPagina(1) }} size="compact">Ver delegadas por mí ({tareasDelegadas.length})</V2Button>
        : undefined}
      secondaryAction={tareasRelacionadas.length > 0
        ? <V2Button onClick={() => { setFiltroAsignado("todos"); setPagina(1) }} size="compact" variant="secondary">Ver todas ({tareasRelacionadas.length})</V2Button>
        : undefined}
      title="No hay tareas en esta vista"
    />
  )

  return (
    <>
      <V2ListPageTemplate
        className={styles.page}
        density="comfortable"
        header={
          <V2PageHeader
            actions={
              <div className={styles.headerActions}>
                <V2Button leadingIcon={<ClipboardCheck size={16} />} onClick={() => router.push("/audiovisual/requerimientos")} variant="secondary">
                  Req. audiovisual
                </V2Button>
                <V2Button leadingIcon={<Plus size={16} />} onClick={abrirNueva} variant="primary">
                  Nueva tarea
                </V2Button>
              </div>
            }
            eyebrow="Operaciones"
            subtitle="Resumen de mis tareas y seguimiento"
            title="Mi trabajo"
          />
        }
        state={loading ? "loading" : "ready"}
      >
        <div className={styles.overviewGrid}>
          <V2SectionCard description="Porcentaje promedio de las tareas que he delegado" title="Avance general de tareas delegadas">
            <div className={styles.progressContent}>
              <div className={styles.progressRing} style={{ "--progress": `${avanceDelegadas * 3.6}deg` } as CSSProperties}>
                <div className={styles.progressRingInner}>{avanceDelegadas}%</div>
              </div>
              <div className={styles.progressSummary}>
                <p className={styles.progressLabel}>{delegadasCompletadas} de {tareasDelegadas.length} tareas completadas</p>
                <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${avanceDelegadas}%` }} /></div>
              </div>
            </div>
          </V2SectionCard>
          <V2SectionCard description="Distribución de las tareas delegadas" title="Estado del avance">
            <div className={styles.legend}>
              {[
                { estado: "completada", label: "Completadas", dot: styles.dotSuccess },
                { estado: "en_progreso", label: "En progreso", dot: styles.dotInfo },
                { estado: "en_revision", label: "En revisión", dot: styles.dotPrimary },
                { estado: "pendiente", label: "Pendientes", dot: styles.dotWarning },
              ].map((item) => (
                <div className={styles.legendItem} key={item.estado}>
                  <span className={`${styles.legendDot} ${item.dot}`} />
                  {contarPorEstado(tareasDelegadas, item.estado)} {item.label}
                </div>
              ))}
            </div>
          </V2SectionCard>
        </div>

        <V2SectionCard description={subtituloTrabajo} title="Resumen de categorías">
          <div className={styles.summaryStrip}>
            {[
              { key: "mias", label: "Asignadas a mí", value: misTareas.length },
              { key: "creadas", label: "Delegadas por mí", value: tareasDelegadas.length },
              { key: "participo", label: "Participo", value: tareasParticipa.length },
              { key: "todos", label: "Todas relacionadas", value: tareasRelacionadas.length },
            ].map((item) => (
              <div className={`${styles.summaryItem} ${filtroAsignado === item.key ? styles.summaryItemActive : ""}`} key={item.key}>
                <span className={styles.summaryLabel}>{item.label}</span>
                <span className={styles.summaryValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </V2SectionCard>

        <V2SectionCard description={subtituloResumenActual} title={tituloResumenActual}>
          <div className={styles.tabsWrap}>
            <V2Tabs
              ariaLabel="Vistas de Mi trabajo"
              items={tabsTrabajo.map((tab) => {
                const Icon = tab.icon
                return { id: tab.key, label: `${tab.label} (${tab.count})`, icon: <Icon size={15} /> }
              })}
              onValueChange={(value) => { setFiltroAsignado(value); setResponsableId(""); setPagina(1) }}
              value={filtroAsignado}
              variant="contained"
            />
          </div>
        </V2SectionCard>

        <V2SectionCard description="Acota el listado sin alterar la vista seleccionada" title="Filtros">
          <div className={styles.filters}>
            <div className={styles.filterControl}><V2Select compact label="Estado" onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1) }} options={[{ label: "Todos los estados", value: "todos" }, ...Object.entries(ESTADOS).map(([value, item]) => ({ label: item.label, value }))]} value={filtroEstado} /></div>
            <div className={styles.filterControl}><V2Select compact label="Proyecto" onChange={(e) => { setFiltroProyecto(e.target.value); setPagina(1) }} options={[{ label: "Todos los proyectos", value: "" }, ...proyectos.map((p) => ({ label: `${p.codigo} - ${p.nombre}`, value: p.id }))]} value={filtroProyecto} /></div>
            <div className={styles.filterControl}><V2Select compact label="Prioridad" onChange={(e) => { setFiltroPrioridad(e.target.value); setPagina(1) }} options={[{ label: "Todas las prioridades", value: "todos" }, ...Object.entries(PRIORIDADES).map(([value, item]) => ({ label: item.label, value }))]} value={filtroPrioridad} /></div>
            <div className={styles.filterControl}><V2Input compact label="Fecha límite" onChange={(e) => { setFiltroFecha(e.target.value); setPagina(1) }} type="date" value={filtroFecha} /></div>
            {puedeVerEquipo ? <div className={styles.filterControl}><V2Select compact label="Responsable" onChange={(e) => { setResponsableId(e.target.value); if (e.target.value) setFiltroAsignado("responsable"); setPagina(1) }} options={[{ label: "Seleccionar responsable", value: "" }, ...usuarios.map((u) => ({ label: `${u.nombre} ${u.apellido}`, value: u.id }))]} value={responsableId} /></div> : null}
            <div className={styles.filterControl}><V2Select compact label="Ordenar por" onChange={(e) => setOrdenCampo(e.target.value)} options={[
              { label: "Fecha límite", value: "fecha_limite" }, { label: "Título", value: "titulo" }, { label: "Proyecto", value: "proyecto" },
              { label: "Cliente", value: "cliente" }, { label: "Prioridad", value: "prioridad" }, { label: "Asignado a", value: "asignado" }, { label: "Estado", value: "estado" },
            ]} value={ordenCampo} /></div>
            <div className={styles.sortControl}>
              <V2Button aria-label={ordenDir === "asc" ? "Orden ascendente; cambiar a descendente" : "Orden descendente; cambiar a ascendente"} onClick={() => setOrdenDir(ordenDir === "asc" ? "desc" : "asc")} size="compact" variant="secondary">
                {ordenDir === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
              </V2Button>
            </div>
          </div>
        </V2SectionCard>

        <V2DataTable
          columns={columns}
          density="compact"
          emptyState={emptyState}
          getRowId={(t) => t.id}
          onRowClick={(t) => {
            if (t.origen === "audiovisual" && t.origen_id) router.push(`/audiovisual/requerimientos?requerimiento_id=${t.origen_id}`)
            else abrirDetalle(t)
          }}
          rows={tareasPagina}
          selectedRowId={selected?.id}
          stickyHeader
        />

        <div className={styles.paginationBar}>
          <div className={styles.pageSize}>
            <V2Select compact label="Filas por página" onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1) }} options={[10, 25, 50, 100].map((value) => ({ label: String(value), value: String(value) }))} value={String(porPagina)} />
          </div>
          <V2Pagination onPageChange={setPagina} page={pagina} pageCount={totalPaginas} pageSize={porPagina} totalItems={tareasFiltradas.length} />
        </div>
      </V2ListPageTemplate>

      <V2Drawer
        footer={<V2Button fullWidth leadingIcon={<CalendarDays size={16} />} onClick={() => abrirGoogleCalendar(selected)} variant="secondary">Agendar en Google Calendar</V2Button>}
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        size="md"
        title={selected?.titulo || "Detalle de tarea"}
      >
        {selected ? (
          <div className={styles.drawerBody}>
            <div>
              <p className={styles.sectionLabel}>Estado y acciones</p>
              <div className={styles.drawerActions}>
                <V2Badge variant={estadoVariant(selected.estado)}>{ESTADOS[selected.estado]?.label || selected.estado}</V2Badge>
                {puedeMoverEstado(selected, "en_progreso") && selected.estado === "pendiente" ? <V2Button onClick={() => cambiarEstado(selected.id, "en_progreso")} size="compact" variant="secondary">Iniciar</V2Button> : null}
                {puedeMoverEstado(selected, "en_revision") && selected.estado === "en_progreso" ? <V2Button onClick={() => cambiarEstado(selected.id, "en_revision")} size="compact">Enviar a revisión</V2Button> : null}
                {puedeMoverEstado(selected, "completada") && selected.estado === "en_revision" ? <V2Button onClick={() => cambiarEstado(selected.id, "completada")} size="compact">Aprobar / cerrar</V2Button> : null}
                {puedeMoverEstado(selected, "en_progreso") && selected.estado === "en_revision" ? <V2Button onClick={() => { const obs = prompt("Observación para devolver la tarea:"); if (obs?.trim()) cambiarEstado(selected.id, "en_progreso", obs.trim()) }} size="compact" variant="secondary">Devolver con observación</V2Button> : null}
              </div>
            </div>
            <div className={styles.facts}>
              {[
                { label: "Prioridad", value: PRIORIDADES[selected.prioridad]?.label || "—" },
                { label: "Responsable", value: selected.asignado ? nombreUsuario(selected.asignado) : "—" },
                { label: "Solicitante", value: selected.creador ? nombreUsuario(selected.creador) : "—" },
                { label: "Participantes", value: participantesNombres(selected) || "—" },
                { label: "Mi rol", value: rolUsuarioEnTarea(selected) || "—" },
                { label: "Frecuencia", value: FRECUENCIAS[selected.frecuencia] || "No se repite" },
                { label: "Proyecto", value: selected.proyecto ? `${selected.proyecto.codigo} — ${selected.proyecto.nombre}` : "—" },
                { label: "Cliente", value: selected.cliente?.razon_social || "—" },
                { label: "Fecha límite", value: selected.fecha_limite || "—" },
                { label: "Completada", value: selected.fecha_completada ? new Date(selected.fecha_completada).toLocaleDateString("es-PE") : "—" },
              ].map((item) => <div className={styles.fact} key={item.label}><span>{item.label}</span><span className={styles.factValue}>{item.value}</span></div>)}
            </div>
            {selected.descripcion ? <div><p className={styles.sectionLabel}>Descripción</p><div className={styles.description}>{selected.descripcion}</div></div> : null}
            <div>
              <p className={styles.sectionLabel}>Comentarios ({comentarios.length})</p>
              <div className={styles.comments}>
                {comentarios.length === 0 ? <span className={styles.commentMeta}>Sin comentarios aún</span> : null}
                {comentarios.map((comment) => (
                  <div className={styles.comment} key={comment.id}>
                    <div className={styles.commentHeader}>
                      <span>{comment.usuario?.nombre} {comment.usuario?.apellido}</span>
                      <span className={styles.commentActions}>
                        <span className={styles.commentMeta}>{new Date(comment.created_at).toLocaleDateString("es-PE")}</span>
                        {comment.usuario_id === perfil?.id ? <V2Button aria-label="Eliminar comentario" onClick={() => eliminarComentario(comment.id)} size="compact" variant="ghost">×</V2Button> : null}
                      </span>
                    </div>
                    <div className={styles.commentText}>{comment.comentario}</div>
                    {comment.link_url ? <a href={comment.link_url} rel="noreferrer" target="_blank">Abrir link / adjunto</a> : null}
                  </div>
                ))}
              </div>
            </div>
            {selected.permitir_comentarios === false ? <div className={styles.commentsDisabled}>Los comentarios están desactivados para esta tarea.</div> : (
              <div className={styles.commentForm}>
                <textarea className={styles.textarea} onChange={(e) => setNuevoComentario(e.target.value)} placeholder="Escribe un comentario o actualización..." value={nuevoComentario} />
                <V2Input onChange={(e) => setNuevoLink(e.target.value)} placeholder="Link de Drive o referencia (opcional)" value={nuevoLink} />
                <V2Button disabled={!nuevoComentario.trim()} loading={savingCom} onClick={agregarComentario}>Comentar</V2Button>
              </div>
            )}
          </div>
        ) : null}
      </V2Drawer>

      <V2Modal
        description={editando ? undefined : `Solicitante: ${[perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ") || "Usuario actual"}`}
        footer={<><V2Button onClick={() => setShowForm(false)} variant="secondary">Cancelar</V2Button><V2Button loading={saving} onClick={guardar}>{editando ? "Actualizar" : "Delegar trabajo"}</V2Button></>}
        onClose={() => setShowForm(false)}
        open={showForm}
        size="lg"
        title={editando ? "Editar seguimiento" : "Delegar trabajo"}
      >
        <div className={styles.modalBody}>
          <TaskForm clientes={clientes} editando={Boolean(editando)} form={form} onChange={setForm} proyectos={proyectos} usuarios={usuarios} />
        </div>
      </V2Modal>
    </>
  )
}

