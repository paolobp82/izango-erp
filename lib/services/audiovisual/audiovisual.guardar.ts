import { registrarAccion } from "@/lib/trazabilidad"

const PRIORIDADES: Record<string, any> = {
  alta: { label: "Alta" },
  media: { label: "Media" },
  baja: { label: "Baja" },
}

const ESTADOS_FINALIZADOS = ["completado", "cancelado"]

const AUDIOVISUAL_EMAILS = [
  "pbastianelli@izango.com.pe",
  "pcampos@izango.com.pe",
  "aestupinan@izango.com.pe",
  "gveliz@izango.com.pe",
]

function uuidOrNull(value: unknown) {
  if (!value || value === "__OTRO__") return null
  return String(value)
}

function esOtroProyecto(value: unknown) {
  return value === "__OTRO__"
}

function estadoTareaDesdeAudiovisual(estado: string) {
  if (estado === "completado") return "completada"
  if (estado === "cancelado") return "cancelada"
  if (estado === "en_revision") return "en_revision"
  if (estado === "en_progreso") return "en_progreso"
  return "pendiente"
}

export type FormAudiovisual = {
  proyecto_id: string
  cotizacion_id: string
  detalle_otro_proyecto: string
  ubicacion: string
  productor_id: string
  responsable_audiovisual_id: string
  fecha_entrega_solicitada: string
  fecha_devolucion_audiovisual: string
  piezas: string[]
  pieza_otros_descripcion: string
  brief: string
  prioridad: string
  avance: string
  referencia_url: string
  documento_url: string
  artes_url: string
  estado: string
}

// Extraida de loadCotizaciones() en app/audiovisual/requerimientos/page.tsx — misma
// query exacta, reutilizable por cualquier consumidor (el modulo original sigue
// envolviendola en su propio estado `cotizaciones`/`setCotizaciones`).
export async function cargarCotizacionesDelProyecto(supabase: any, proyectoId: string) {
  if (!proyectoId || esOtroProyecto(proyectoId)) return []
  const { data } = await supabase
    .from("cotizaciones")
    .select("id,version,estado,total_cliente")
    .eq("proyecto_id", proyectoId)
    .is("deleted_at", null)
    .order("version")
  return data || []
}

// Extraida de uploadDocumento() en app/audiovisual/requerimientos/page.tsx — mismo path,
// mismo bucket, mismo upsert. Cada consumidor conserva su propio estado de UI
// (uploading/setForm); esta funcion solo hace la mutacion de Storage.
export async function subirDocumentoAudiovisual(supabase: any, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const path = `audiovisual/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-")}`
  const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
  if (error) return { ok: false, error: "Error subiendo archivo: " + error.message }
  const { data } = supabase.storage.from("assets").getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}

// Extraida de sincronizarTareaAudiovisual() en app/audiovisual/requerimientos/page.tsx.
// Unico punto de implementacion: actualiza la tarea ya vinculada (por origen/origen_id),
// nunca crea una nueva — eso solo ocurre en la rama de creacion de guardarRequerimientoAudiovisualService.
export async function sincronizarTareaAudiovisual(supabase: any, proyectos: any[], perfil: any, reqId: string, datos: any) {
  const proyectoIdLimpio = uuidOrNull(datos.proyecto_id)
  const proyectoTarea = proyectoIdLimpio ? proyectos.find((p: any) => p.id === proyectoIdLimpio) : null
  const tituloTarea = `Req. audiovisual - ${proyectoTarea?.codigo || datos.detalle_otro_proyecto || "Sin proyecto"}`

  await supabase
    .from("tareas")
    .update({
      titulo: tituloTarea,
      descripcion: datos.brief || "Requerimiento audiovisual generado desde el modulo audiovisual.",
      estado: estadoTareaDesdeAudiovisual(datos.estado || "pendiente"),
      prioridad: datos.prioridad || "media",
      proyecto_id: proyectoIdLimpio,
      asignado_a: datos.responsable_audiovisual_id || datos.productor_id || perfil?.id || null,
      fecha_limite: datos.fecha_entrega_solicitada || null,
      origen_url: `/audiovisual/requerimientos?requerimiento_id=${reqId}`,
      origen_label: "Req. Audiovisual",
    })
    .eq("origen", "audiovisual")
    .eq("origen_id", reqId)
}

// Extraida de enviarCorreo() en app/audiovisual/requerimientos/page.tsx — solo se llama
// en creacion (ver guardarRequerimientoAudiovisualService), nunca en edicion, igual que antes.
export async function enviarCorreoRequerimientoAudiovisual(proyectos: any[], productores: any[], req: any) {
  const proyecto = proyectos.find((p: any) => p.id === req.proyecto_id)
  const productor = productores.find((p: any) => p.id === req.productor_id)
  await fetch("/api/alertas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: "audiovisual_requerimiento_creado",
      destinatarios: AUDIOVISUAL_EMAILS,
      datos: {
        proyecto: proyecto ? `${proyecto.codigo} - ${proyecto.nombre}` : (req.detalle_otro_proyecto || "OTRO / SIN PROYECTO"),
        productor: productor ? `${productor.nombre} ${productor.apellido}` : "Sin productor",
        prioridad: PRIORIDADES[req.prioridad]?.label || req.prioridad,
        fecha_entrega_solicitada: req.fecha_entrega_solicitada || "-",
        piezas: (req.piezas || []).join(", ") || "-",
      },
    }),
  })
}

export type GuardarAudiovisualParams = {
  supabase: any
  form: FormAudiovisual
  /** Fila completa en edicion, o null/undefined para creacion. */
  editando?: any | null
  perfil: any
  proyectos: any[]
  productores: any[]
  /** Resultado de puedeAbrirEdicion(editando) en el caller; solo se evalua si editando existe. */
  puedeAbrirEdicionActual?: boolean
  /** Resultado de puedeEditarTodo(editando) en el caller; solo se evalua si editando existe. */
  puedeEditarTodoActual?: boolean
  /** = !esEdicion || puedeEditarPedido(editando) en el caller. */
  puedeEditarPedidoFormulario: boolean
  /** = esEdicion && puedeEditarAvance(editando) en el caller. */
  puedeEditarAvanceFormulario: boolean
}

export type GuardarAudiovisualResult =
  | { ok: true; reqId: string; warning?: string }
  | { ok: false; error: string }

// Extraida de guardar() en app/audiovisual/requerimientos/page.tsx: mismo orden de
// validaciones, mismo payload (incluida la asimetria creacion/edicion), mismo
// insert/update, misma sincronizacion de tarea, misma alerta por correo (solo en
// creacion). app/audiovisual/requerimientos/page.tsx sigue siendo dueño de la
// UI/estado (form, editando, saving) y de los permisos (los calcula y los pasa aqui
// como booleanos ya resueltos) — esta funcion solo persiste.
export async function guardarRequerimientoAudiovisualService({
  supabase,
  form,
  editando,
  perfil,
  proyectos,
  productores,
  puedeAbrirEdicionActual = true,
  puedeEditarTodoActual = true,
  puedeEditarPedidoFormulario,
  puedeEditarAvanceFormulario,
}: GuardarAudiovisualParams): Promise<GuardarAudiovisualResult> {
  const esEdicion = Boolean(editando?.id)

  if (esEdicion && !puedeAbrirEdicionActual) {
    return { ok: false, error: "No tienes permiso para editar este requerimiento" }
  }
  if (esEdicion && ESTADOS_FINALIZADOS.includes(editando.estado) && !puedeEditarTodoActual) {
    return { ok: false, error: "Este requerimiento ya esta cerrado y solo gerencia puede modificarlo" }
  }
  if (!esEdicion || puedeEditarPedidoFormulario) {
    if (!form.proyecto_id) return { ok: false, error: "Selecciona un proyecto u OTRO / SIN PROYECTO" }
    if (form.proyecto_id === "__OTRO__" && !form.detalle_otro_proyecto.trim()) return { ok: false, error: "Escribe el detalle para OTRO / SIN PROYECTO" }
    if (!form.fecha_entrega_solicitada) return { ok: false, error: "La fecha solicitada por produccion es obligatoria" }
    if (form.piezas.length === 0) return { ok: false, error: "Selecciona al menos una pieza necesaria" }
    if (form.piezas.includes("Otros") && !form.pieza_otros_descripcion.trim()) return { ok: false, error: "Describe la pieza requerida en Otros" }
  }

  const payload: any = { updated_at: new Date().toISOString() }
  const proyectoIdLimpio = uuidOrNull(form.proyecto_id)
  const cotizacionIdLimpio = esOtroProyecto(form.proyecto_id) ? null : uuidOrNull(form.cotizacion_id)

  if (!esEdicion || puedeEditarPedidoFormulario) {
    Object.assign(payload, {
      proyecto_id: proyectoIdLimpio,
      cotizacion_id: cotizacionIdLimpio,
      detalle_otro_proyecto: esOtroProyecto(form.proyecto_id) ? form.detalle_otro_proyecto.trim() : null,
      ubicacion: form.ubicacion || null,
      productor_id: form.productor_id || null,
      fecha_entrega_solicitada: form.fecha_entrega_solicitada || null,
      piezas: form.piezas,
      pieza_otros_descripcion: form.piezas.includes("Otros") ? form.pieza_otros_descripcion.trim() : null,
      brief: form.brief || null,
      prioridad: form.prioridad,
      referencia_url: form.referencia_url || null,
      documento_url: form.documento_url || null,
    })
  }
  if (!esEdicion) {
    payload.responsable_audiovisual_id = form.responsable_audiovisual_id || null
    payload.artes_url = form.artes_url || null
    payload.creado_por = perfil?.id || null
  }
  if (esEdicion && puedeEditarAvanceFormulario) {
    payload.responsable_audiovisual_id = form.responsable_audiovisual_id || null
    payload.avance = Number(form.avance) || 10
    payload.estado = form.estado
    payload.fecha_devolucion_audiovisual = form.fecha_devolucion_audiovisual || null
    payload.artes_url = form.artes_url || null
  } else if (!esEdicion) {
    payload.avance = 10
    payload.estado = "pendiente"
  }

  if (esEdicion) {
    const { error } = await supabase.from("audiovisual_requerimientos").update(payload).eq("id", editando.id)
    if (error) return { ok: false, error: "Error: " + error.message }
    await sincronizarTareaAudiovisual(supabase, proyectos, perfil, editando.id, { ...editando, ...payload })
    await registrarAccion({ accion: "editar", modulo: "audiovisual", entidad_tipo: "requerimiento_audiovisual", entidad_id: editando.id, descripcion: "Requerimiento audiovisual editado" })
    return { ok: true, reqId: editando.id }
  }

  const { data, error } = await supabase.from("audiovisual_requerimientos").insert(payload).select().single()
  if (error) return { ok: false, error: "Error: " + error.message }

  const proyectoTareaId = uuidOrNull(payload.proyecto_id)
  const proyectoTarea = proyectoTareaId ? proyectos.find((p: any) => p.id === proyectoTareaId) : null
  const tituloTarea = `Req. audiovisual - ${proyectoTarea?.codigo || payload.detalle_otro_proyecto || "Sin proyecto"}`

  const { error: tareaError } = await supabase.from("tareas").insert({
    titulo: tituloTarea,
    descripcion: payload.brief || "Requerimiento audiovisual generado desde el modulo audiovisual.",
    estado: "pendiente",
    prioridad: payload.prioridad || "media",
    proyecto_id: proyectoTareaId,
    asignado_a: payload.responsable_audiovisual_id || payload.productor_id || perfil?.id || null,
    creado_por: perfil?.id || null,
    fecha_limite: payload.fecha_entrega_solicitada || null,
    origen: "audiovisual",
    origen_id: data.id,
    origen_url: `/audiovisual/requerimientos?requerimiento_id=${data.id}`,
    origen_label: "Req. Audiovisual",
    mostrar_participantes_mi_trabajo: true,
    permitir_comentarios: true,
    recibir_correos_automaticos: true,
  })

  // Igual que el original: si falla la creacion de la tarea vinculada, el requerimiento
  // ya fue creado y NO se revierte — se informa como advertencia, sin rollback inventado.
  const warning = tareaError ? "El requerimiento fue creado, pero no se pudo crear la tarea en Mi Trabajo: " + tareaError.message : undefined

  await registrarAccion({ accion: "crear", modulo: "audiovisual", entidad_tipo: "requerimiento_audiovisual", entidad_id: data?.id, descripcion: "Requerimiento audiovisual creado" })
  await enviarCorreoRequerimientoAudiovisual(proyectos, productores, payload)

  return { ok: true, reqId: data?.id || "", warning }
}
