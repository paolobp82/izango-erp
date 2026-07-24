import { registrarAccion } from "@/lib/trazabilidad"

export type FormTarea = {
  titulo: string
  descripcion: string
  estado: string
  prioridad: string
  proyecto_id: string
  cliente_id: string
  asignado_a: string
  fecha_limite: string
  hora_inicio: string
  hora_fin: string
  participante_ids: string[]
  frecuencia: string
  recurrencia_intervalo: number
  recurrencia_fecha_fin: string
  recurrencia_max_repeticiones: string
  link_inicial: string
  notificar_participantes: boolean
  mostrar_participantes_mi_trabajo: boolean
  permitir_comentarios: boolean
  recibir_correos_automaticos: boolean
}

// Extraidas de app/tareas/page.tsx (guardarParticipantes/agregarEventoFeed/notificarTarea).
// Se exportan aqui (no se duplican) porque tanto guardarTareaService (creacion/edicion
// manual) como generarSiguienteOcurrencia (recurrencia, sigue viviendo en la pagina) las
// necesitan — un unico punto de implementacion para ambos consumidores.
export async function guardarParticipantesTarea(supabase: any, tareaId: string, ids: string[]) {
  await supabase.from("tarea_participantes").delete().eq("tarea_id", tareaId)
  const rows = Array.from(new Set(ids.filter(Boolean))).map((usuario_id) => ({ tarea_id: tareaId, usuario_id }))
  if (rows.length > 0) await supabase.from("tarea_participantes").insert(rows)
}

export async function agregarEventoFeedTarea(
  supabase: any,
  usuarioId: string | null | undefined,
  tareaId: string,
  tipo: string,
  comentario: string,
  linkUrl = ""
) {
  await supabase.from("tarea_comentarios").insert({
    tarea_id: tareaId,
    usuario_id: usuarioId,
    comentario,
    tipo,
    link_url: linkUrl || null,
  })
}

export async function notificarTarea(tareaId: string, evento: string, extra: any = {}) {
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

export type GuardarTareaParams = {
  supabase: any
  form: FormTarea
  /** Fila completa de la tarea en edicion, o null/undefined para creacion. */
  editando?: any | null
  perfil: any
}

export type GuardarTareaResult =
  | { ok: true; tareaId: string }
  | { ok: false; error: string }

// Extraido de guardar() en app/tareas/page.tsx: mismo orden de validaciones, mismo
// payload, mismo insert/update, misma sincronizacion de participantes, mismo feed y
// misma notificacion. app/tareas/page.tsx sigue siendo dueño de la UI/estado (form,
// editando, saving) y de cuando refrescar (load()) — esta funcion solo persiste.
export async function guardarTareaService({ supabase, form, editando, perfil }: GuardarTareaParams): Promise<GuardarTareaResult> {
  if (!form.titulo) {
    return { ok: false, error: "El título es obligatorio" }
  }
  if (!editando && !form.asignado_a) {
    return { ok: false, error: "Selecciona un responsable para delegar el trabajo." }
  }

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
    await guardarParticipantesTarea(supabase, editando.id, form.participante_ids)
    await registrarAccion({ accion: "editar", modulo: "tareas", entidad_tipo: "tarea", descripcion: "Tarea editada: " + form.titulo })
    return { ok: true, tareaId: editando.id }
  }

  payload.creado_por = perfil?.id || null
  payload.recurrencia_grupo_id = undefined
  const { data: nueva } = await supabase.from("tareas").insert(payload).select("id").single()
  await registrarAccion({ accion: "crear", modulo: "tareas", entidad_tipo: "tarea", descripcion: "Tarea creada: " + form.titulo })

  if (nueva?.id) {
    await supabase.from("tareas").update({ recurrencia_grupo_id: nueva.id }).eq("id", nueva.id)
    await guardarParticipantesTarea(supabase, nueva.id, form.participante_ids)
    await agregarEventoFeedTarea(supabase, perfil?.id, nueva.id, "cambio_estado", "Tarea creada y delegada.")
    if (form.link_inicial?.trim()) {
      await agregarEventoFeedTarea(supabase, perfil?.id, nueva.id, "adjunto", "Referencia inicial adjunta.", form.link_inicial.trim())
    }
    if (form.recibir_correos_automaticos) await notificarTarea(nueva.id, "creada")
  }

  return { ok: true, tareaId: nueva?.id || "" }
}
