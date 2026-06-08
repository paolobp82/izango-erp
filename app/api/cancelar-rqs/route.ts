import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedProfile, getErrorMessage } from "@/lib/auth-server"
import { canRequestRqCancellation } from "@/lib/report-auth"
import { escapeAttribute, escapeHtml as h } from "@/lib/html"
import { sendEmailBatch } from "@/lib/email"

const BASE_URL = "https://izango-erp.vercel.app"
const APPROVERS = ["administracion@izango.com.pe", "jsosa@izango.com.pe", "pbastianelli@izango.com.pe"]

type Project = { id: string; codigo?: string | null; nombre?: string | null; estado?: string | null; productor_id?: string | null; comercial_id?: string | null }
type Rq = { numero_rq?: string | null; descripcion?: string | null; monto_solicitado?: number | null; proveedor_nombre?: string | null }

function money(value: unknown) {
  return Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedProfile()
    if (auth.error) return auth.error

    const { proyecto_id, estado_nuevo } = await request.json() as { proyecto_id?: string; estado_nuevo?: string }
    if (!proyecto_id || !estado_nuevo) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }

    const supabase = auth.supabase
    const { data: proyecto } = await supabase
      .from("proyectos")
      .select("id,codigo,nombre,estado,productor_id,comercial_id")
      .eq("id", proyecto_id)
      .single<Project>()

    if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
    if (!canRequestRqCancellation(auth.profile, proyecto)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }

    const { data: rqsPendientes } = await supabase
      .from("requerimientos_pago")
      .select("numero_rq, descripcion, monto_solicitado, proveedor_nombre")
      .eq("proyecto_id", proyecto_id)
      .in("estado", ["pendiente_aprobacion", "aprobado_produccion"])
      .returns<Rq[]>()

    if (!rqsPendientes || rqsPendientes.length === 0) {
      return NextResponse.json({ message: "No hay RQs pendientes" })
    }

    const { data: solicitud } = await supabase
      .from("solicitudes_cancelacion_rq")
      .insert({
        proyecto_id,
        estado_anterior: proyecto.estado,
        estado_nuevo,
        solicitado_por: auth.user.id,
        estado: "pendiente",
      })
      .select("id, token")
      .single<{ id: string; token?: string | null }>()

    if (!solicitud?.token) return NextResponse.json({ error: "Error creando solicitud" }, { status: 500 })

    const urlAprobar = `${BASE_URL}/api/cancelar-rqs/resolver?token=${encodeURIComponent(solicitud.token)}&accion=aprobar`
    const urlRechazar = `${BASE_URL}/api/cancelar-rqs/resolver?token=${encodeURIComponent(solicitud.token)}&accion=rechazar`
    const totalMonto = rqsPendientes.reduce((sum, rq) => sum + Number(rq.monto_solicitado || 0), 0)
    const listaRQs = rqsPendientes.map((rq) => `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${h(rq.numero_rq || "—")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${h(rq.descripcion || "—")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${h(rq.proveedor_nombre || "—")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:700;color:#dc2626">S/ ${h(money(rq.monto_solicitado))}</td>
    </tr>`).join("")

    const solicitante = `${auth.profile.nombre || ""} ${auth.profile.apellido || ""}`.trim()
    const html = `<div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px">
      <div style="background:#1D2040;padding:20px 28px;border-radius:10px 10px 0 0"><h1 style="color:#03E373;margin:0;font-size:20px">Solicitud de Cancelacion de RQs</h1></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px">
        <p style="color:#374151;font-size:14px"><strong>${h(solicitante || "Usuario autenticado")}</strong> solicita regresar el proyecto <strong>${h(proyecto.codigo || "—")} - ${h(proyecto.nombre || "—")}</strong> al estado <strong>${h(estado_nuevo)}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0"><thead><tr style="background:#1D2040"><th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">N RQ</th><th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Descripcion</th><th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Proveedor</th><th style="padding:8px 12px;text-align:right;color:#03E373;font-size:12px">Monto</th></tr></thead><tbody>${listaRQs}</tbody><tfoot><tr style="background:#f9fafb"><td colspan="3" style="padding:10px 12px;font-weight:700;font-size:13px">TOTAL</td><td style="padding:10px 12px;text-align:right;font-weight:800;font-size:15px;color:#dc2626">S/ ${h(money(totalMonto))}</td></tr></tfoot></table>
        <div style="display:flex;gap:16px;margin-top:24px"><a href="${escapeAttribute(urlAprobar)}" style="background:#0F6E56;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">Aprobar cancelacion</a><a href="${escapeAttribute(urlRechazar)}" style="background:#fff;color:#dc2626;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;border:2px solid #dc2626">Rechazar</a></div>
      </div>
    </div>`

    const emailResult = await sendEmailBatch({
      to: APPROVERS,
      subject: `[ACCION REQUERIDA] Cancelacion de ${rqsPendientes.length} RQ(s) - ${proyecto.codigo || "Proyecto"}`,
      html,
      context: "cancelar-rqs:solicitud",
    })

    return NextResponse.json({ ok: true, solicitud_id: solicitud.id, rqs_afectados: rqsPendientes.length, email: emailResult })
  } catch (error: unknown) {
    console.error("Error solicitando cancelacion de RQs:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
