import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient, getErrorMessage } from "@/lib/auth-server"
import { escapeAttribute, escapeHtml as h, htmlPage } from "@/lib/html"

const resend = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = "https://izango-erp.vercel.app"
const APPROVERS = ["administracion@izango.com.pe", "jsosa@izango.com.pe", "pbastianelli@izango.com.pe"]
const TOKEN_RE = /^[A-Za-z0-9_-]{16,}$/

type Solicitud = { id: string; token: string; proyecto_id: string; estado: string; estado_nuevo?: string | null }
type Project = { codigo?: string | null; nombre?: string | null }
type Rq = { numero_rq?: string | null; descripcion?: string | null; monto_solicitado?: number | null; proveedor_nombre?: string | null }

const htmlHeaders = { "Content-Type": "text/html; charset=utf-8" }

function resultPage(title: string, message: string, proyectoId?: string) {
  const link = proyectoId ? `<a href="${escapeAttribute(`${BASE_URL}/proyectos/${encodeURIComponent(proyectoId)}`)}" style="background:#0F6E56;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px">Ver proyecto</a>` : ""
  return htmlPage(title, `<body style="font-family:Arial;max-width:600px;margin:60px auto;text-align:center"><div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:40px"><h2>${h(title)}</h2><p>${h(message)}</p>${link}</div></body>`)
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token") || ""
    const accion = searchParams.get("accion") || ""
    if (!TOKEN_RE.test(token) || !["aprobar", "rechazar"].includes(accion)) {
      return new NextResponse(resultPage("Enlace invalido", "El enlace no es valido o ha expirado."), { headers: htmlHeaders, status: 400 })
    }

    const supabase = createAdminClient()
    const { data: solicitud } = await supabase
      .from("solicitudes_cancelacion_rq")
      .select("id,token,proyecto_id,estado,estado_nuevo")
      .eq("token", token)
      .single<Solicitud>()

    if (!solicitud) {
      return new NextResponse(resultPage("Solicitud no encontrada", "No encontramos una solicitud pendiente para este enlace."), { headers: htmlHeaders, status: 404 })
    }
    if (solicitud.estado !== "pendiente") {
      return new NextResponse(resultPage("Solicitud ya resuelta", `Esta solicitud ya fue ${solicitud.estado}.`, solicitud.proyecto_id), { headers: htmlHeaders })
    }

    const { data: proyecto } = await supabase.from("proyectos").select("codigo,nombre").eq("id", solicitud.proyecto_id).single<Project>()

    if (accion === "rechazar") {
      await supabase.from("solicitudes_cancelacion_rq").update({ estado: "rechazada", resuelto_at: new Date().toISOString() }).eq("id", solicitud.id)
      return new NextResponse(resultPage("Cancelacion rechazada", "Los RQs se mantienen activos.", solicitud.proyecto_id), { headers: htmlHeaders })
    }

    await supabase
      .from("requerimientos_pago")
      .update({ estado: "rechazado", motivo_rechazo: "Cancelado por regreso de estado del proyecto" })
      .eq("proyecto_id", solicitud.proyecto_id)
      .in("estado", ["pendiente_aprobacion", "aprobado_produccion"])

    await supabase.from("proyectos").update({ estado: solicitud.estado_nuevo }).eq("id", solicitud.proyecto_id)
    await supabase.from("solicitudes_cancelacion_rq").update({ estado: "aprobada", resuelto_at: new Date().toISOString() }).eq("id", solicitud.id)

    const { data: rqsCancelados } = await supabase
      .from("requerimientos_pago")
      .select("numero_rq,descripcion,monto_solicitado,proveedor_nombre")
      .eq("proyecto_id", solicitud.proyecto_id)
      .eq("motivo_rechazo", "Cancelado por regreso de estado del proyecto")
      .returns<Rq[]>()

    const totalMonto = (rqsCancelados || []).reduce((sum, rq) => sum + Number(rq.monto_solicitado || 0), 0)
    const rows = (rqsCancelados || []).map((rq) => `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${h(rq.numero_rq || "—")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${h(rq.descripcion || "—")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${h(rq.proveedor_nombre || "—")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:700">S/ ${h(money(rq.monto_solicitado))}</td>
    </tr>`).join("")

    const fecha = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
    const htmlEmail = `<div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px">
      <div style="background:#1D2040;padding:20px 28px;border-radius:10px 10px 0 0"><h1 style="color:#03E373;margin:0;font-size:18px">Registro de Cancelacion de RQs</h1></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px">
        <p><strong>Fecha:</strong> ${h(fecha)}</p>
        <p><strong>Proyecto:</strong> ${h(proyecto?.codigo || "—")} - ${h(proyecto?.nombre || "—")}</p>
        <p><strong>Estado regresado a:</strong> ${h(solicitud.estado_nuevo || "—")}</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr style="background:#1D2040"><th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">N RQ</th><th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Descripcion</th><th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Proveedor</th><th style="padding:8px 12px;text-align:right;color:#03E373;font-size:12px">Monto</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="background:#f9fafb"><td colspan="3" style="padding:10px 12px;font-weight:700;font-size:13px">TOTAL CANCELADO</td><td style="padding:10px 12px;text-align:right;font-weight:800;font-size:15px;color:#dc2626">S/ ${h(money(totalMonto))}</td></tr></tfoot></table>
      </div>
    </div>`

    await Promise.allSettled(
      APPROVERS.map((email) =>
        resend.emails.send({
          from: "Izango ERP <noreply@izango.com.pe>",
          to: email,
          subject: `Registro: RQs cancelados - ${proyecto?.codigo || "Proyecto"}`,
          html: htmlEmail,
        })
      )
    )

    return new NextResponse(resultPage("Cancelacion aprobada", "Los RQs han sido cancelados.", solicitud.proyecto_id), { headers: htmlHeaders })
  } catch (error: unknown) {
    console.error("Error resolviendo cancelacion de RQs:", error)
    return new NextResponse(resultPage("Error procesando la solicitud", getErrorMessage(error)), { headers: htmlHeaders, status: 500 })
  }
}
