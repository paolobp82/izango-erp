import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, getAuthenticatedProfile, getErrorMessage } from "@/lib/auth-server"
import { sendEmailBatch } from "@/lib/email"
import { escapeAttribute, escapeHtml as h } from "@/lib/html"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://izango-erp.vercel.app")

type EventoTarea = "creada" | "comentario" | "estado" | "devuelta" | "completada"
type ParticipanteTarea = {
  usuario_id?: string | null
  usuario?: {
    nombre?: string | null
    apellido?: string | null
  } | null
}

function nombrePerfil(perfil: any) {
  return [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ") || "Usuario"
}

function tareaUrl(id: string) {
  return `${APP_URL}/tareas?tarea_id=${encodeURIComponent(id)}`
}

function prefKey(evento: EventoTarea) {
  if (evento === "creada") return "tarea_nueva_email"
  if (evento === "comentario") return "tarea_comentario_email"
  return "tarea_estado_email"
}

function subject(evento: EventoTarea, tarea: any) {
  if (evento === "creada") return `[Nueva tarea] ${tarea.titulo}`
  if (evento === "comentario") return `[Comentario] ${tarea.titulo}`
  if (evento === "devuelta") return `[Tarea devuelta] ${tarea.titulo}`
  if (evento === "completada") return `[Tarea completada] ${tarea.titulo}`
  return `[Cambio de estado] ${tarea.titulo}`
}

function card(title: string, body: string, tareaId: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px">
    <div style="background:#1D2040;padding:16px 24px;border-radius:8px 8px 0 0">
      <h1 style="color:#fff;margin:0;font-size:20px">${h(title)}</h1>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      ${body}
      <div style="margin-top:20px">
        <a href="${escapeAttribute(tareaUrl(tareaId))}" style="background:#03E373;color:#1D2040;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver tarea</a>
      </div>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">Izango 360 ERP - notificacion automatica</p>
  </div>`
}

async function emailForProfile(admin: ReturnType<typeof createAdminClient>, supabase: any, perfilId: string, pref: string) {
  const { data: cfg } = await supabase
    .from("alertas_config")
    .select(`email, ${pref}`)
    .eq("usuario_id", perfilId)
    .maybeSingle()

  if (cfg && cfg[pref] === false) return null
  if (cfg?.email) return cfg.email

  const { data } = await admin.auth.admin.getUserById(perfilId)
  return data.user?.email || null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedProfile()
    if (auth.error) return auth.error

    const body = await request.json() as {
      tarea_id?: string
      evento?: EventoTarea
      comentario?: string
      estado_anterior?: string
      estado_nuevo?: string
    }
    if (!body.tarea_id || !body.evento) {
      return NextResponse.json({ error: "tarea_id y evento son obligatorios" }, { status: 400 })
    }

    const { data: tarea, error: tareaError } = await auth.supabase
      .from("tareas")
codex/project-soft-delete-cascade
      .select("*, proyecto:proyectos(nombre,codigo,deleted_at), cliente:clientes(razon_social), asignado:perfiles!asignado_a(id,nombre,apellido), creador:perfiles!creado_por(id,nombre,apellido)")
      .select("*, proyecto:proyectos(nombre,codigo), cliente:clientes(razon_social), asignado:perfiles!asignado_a(id,nombre,apellido), creador:perfiles!creado_por(id,nombre,apellido), participantes:tarea_participantes(usuario_id, usuario:perfiles!usuario_id(id,nombre,apellido))")main
      .eq("id", body.tarea_id)
      .single()

    if (tareaError || !tarea) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }
codex/project-soft-delete-cascade
    if (tarea.proyecto?.deleted_at) {
      return NextResponse.json({ error: "Proyecto eliminado" }, { status: 410 })
    if (tarea.recibir_correos_automaticos === false) {
      return NextResponse.json({ enviados: 0, total: 0, motivo: "Correos automaticos desactivados para esta tarea" })
main
    }

    const admin = createAdminClient()
    const pref = prefKey(body.evento)
    const actorId = auth.profile.id
    const destinatarios = new Set<string>()

    const asignadoId = tarea.asignado_a as string | null
    const creadorId = tarea.creado_por as string | null
    const participantes = (tarea.participantes || []) as ParticipanteTarea[]
    const participanteIds = participantes.map(p => p.usuario_id).filter(Boolean) as string[]

    if (body.evento === "creada" && asignadoId && asignadoId !== actorId) destinatarios.add(asignadoId)
    if (body.evento === "comentario") {
      if (asignadoId && asignadoId !== actorId) destinatarios.add(asignadoId)
      if (creadorId && creadorId !== actorId) destinatarios.add(creadorId)
    }
    if (body.evento === "estado" && creadorId && creadorId !== actorId) destinatarios.add(creadorId)
    if (body.evento === "devuelta" && asignadoId && asignadoId !== actorId) destinatarios.add(asignadoId)
    if (body.evento === "completada") {
      if (creadorId && creadorId !== actorId) destinatarios.add(creadorId)
      if (asignadoId && asignadoId !== actorId) destinatarios.add(asignadoId)
    }
    if (tarea.notificar_participantes !== false) {
      participanteIds.forEach(id => {
        if (id !== actorId) destinatarios.add(id)
      })
    }

    const emails = (await Promise.all(Array.from(destinatarios).map(id => emailForProfile(admin, auth.supabase, id, pref)))).filter(Boolean) as string[]
    if (emails.length === 0) return NextResponse.json({ enviados: 0, total: 0, motivo: "Sin destinatarios con correo activo" })

    const actor = nombrePerfil(auth.profile)
    const title = subject(body.evento, tarea)
    const comentario = body.comentario ? `<p style="white-space:pre-wrap;color:#374151">${h(body.comentario)}</p>` : ""
    const resumen = `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:14px 0">
      <p><strong>Proyecto:</strong> ${h(tarea.proyecto ? `${tarea.proyecto.codigo} - ${tarea.proyecto.nombre}` : "Sin proyecto")}</p>
      <p><strong>Cliente:</strong> ${h(tarea.cliente?.razon_social || "Sin cliente")}</p>
      <p><strong>Prioridad:</strong> ${h(tarea.prioridad || "media")}</p>
      <p><strong>Fecha limite:</strong> ${h(tarea.fecha_limite || "Sin fecha")}</p>
      <p><strong>Solicitado por:</strong> ${h(nombrePerfil(tarea.creador))}</p>
      <p><strong>Responsable:</strong> ${h(nombrePerfil(tarea.asignado))}</p>
      <p><strong>Participantes:</strong> ${h(participantes.map(p => nombrePerfil(p.usuario)).join(", ") || "Sin participantes")}</p>
    </div>`

    const bodyHtml =
      body.evento === "comentario"
        ? `<p><strong>${h(actor)}</strong> comentó:</p>${comentario}`
        : body.evento === "devuelta"
          ? `<p>La tarea fue devuelta con observaciones.</p><p><strong>Observacion:</strong></p>${comentario}`
          : body.evento === "estado"
            ? `<p><strong>${h(actor)}</strong> cambió el estado de la tarea.</p><p>${h(body.estado_anterior || "")} → <strong>${h(body.estado_nuevo || tarea.estado)}</strong></p>`
            : body.evento === "completada"
              ? `<p>La tarea fue completada por <strong>${h(actor)}</strong>.</p>`
              : `<p>Se te asignó una nueva tarea.</p><p style="white-space:pre-wrap;color:#374151">${h(tarea.descripcion || "")}</p>`

    const result = await sendEmailBatch({
      to: emails,
      subject: title,
      html: card(title, `${bodyHtml}${resumen}`, tarea.id),
      context: `tareas:${body.evento}`,
    })

    return NextResponse.json({
      enviados: result.sent,
      fallidos: result.failed,
      total: result.total,
      entregas: result.deliveries,
      errores: result.failures,
    })
  } catch (error: unknown) {
    console.error("Error enviando notificacion de tarea:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
