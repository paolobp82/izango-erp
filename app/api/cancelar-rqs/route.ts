import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = "https://izango-erp.vercel.app"

export async function POST(request: NextRequest) {
  try {
    const { proyecto_id, estado_nuevo, solicitado_por_id } = await request.json()
    const supabase = createClient()

    const { data: proyecto } = await supabase.from("proyectos")
      .select("codigo, nombre, estado, cliente:clientes(razon_social)")
      .eq("id", proyecto_id).single()

    const { data: solicitante } = await supabase.from("perfiles")
      .select("nombre, apellido").eq("id", solicitado_por_id).single()

    const { data: rqsPendientes } = await supabase.from("requerimientos_pago")
      .select("numero_rq, descripcion, monto_solicitado, proveedor_nombre")
      .eq("proyecto_id", proyecto_id)
      .in("estado", ["pendiente_aprobacion", "aprobado_produccion"])

    if (!rqsPendientes || rqsPendientes.length === 0) {
      return NextResponse.json({ message: "No hay RQs pendientes que cancelar" })
    }

    const { data: solicitud } = await supabase.from("solicitudes_cancelacion_rq").insert({
      proyecto_id,
      estado_anterior: proyecto?.estado,
      estado_nuevo,
      solicitado_por: solicitado_por_id,
      estado: "pendiente",
    }).select().single()

    if (!solicitud) return NextResponse.json({ error: "Error creando solicitud" }, { status: 500 })

    const token = solicitud.token
    const urlAprobar = `${BASE_URL}/api/cancelar-rqs/resolver?token=${token}&accion=aprobar`
    const urlRechazar = `${BASE_URL}/api/cancelar-rqs/resolver?token=${token}&accion=rechazar`

    const listaRQs = (rqsPendientes || []).map(r =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${r.numero_rq}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${r.descripcion || "—"}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${r.proveedor_nombre || "—"}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:700;color:#dc2626">S/ ${Number(r.monto_solicitado).toLocaleString("es-PE",{minimumFractionDigits:2})}</td></tr>`
    ).join("")

    const totalMonto = (rqsPendientes || []).reduce((s, r) => s + (r.monto_solicitado || 0), 0)

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px">
        <div style="background:#1D2040;padding:20px 28px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center">
          <h1 style="color:#03E373;margin:0;font-size:20px">Solicitud de Cancelación de RQs</h1>
          <span style="color:#9ca3af;font-size:12px">${new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"})}</span>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px">
          <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:20px">
            <p style="margin:0;font-size:14px;color:#92400e;font-weight:600">⚠️ Se requiere tu autorización para cancelar RQs</p>
          </div>
          <p style="color:#374151;font-size:14px">
            <strong>${solicitante?.nombre} ${solicitante?.apellido}</strong> ha solicitado regresar el proyecto 
            <strong>${proyecto?.codigo} — ${proyecto?.nombre}</strong> al estado 
            <strong>${estado_nuevo}</strong>, lo que implica cancelar los siguientes RQs pendientes:
          </p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#1D2040">
                <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">N° RQ</th>
                <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Descripción</th>
                <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Proveedor</th>
                <th style="padding:8px 12px;text-align:right;color:#03E373;font-size:12px">Monto</th>
              </tr>
            </thead>
            <tbody>${listaRQs}</tbody>
            <tfoot>
              <tr style="background:#f9fafb">
                <td colspan="3" style="padding:10px 12px;font-weight:700;font-size:13px">TOTAL A CANCELAR</td>
                <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:15px;color:#dc2626">S/ ${totalMonto.toLocaleString("es-PE",{minimumFractionDigits:2})}</td>
              </tr>
            </tfoot>
          </table>
          <p style="color:#6b7280;font-size:13px">Esta acción quedará registrada en el sistema. ¿Deseas autorizar la cancelación?</p>
          <div style="display:flex;gap:16px;margin-top:24px">
            <a href="${urlAprobar}" style="background:#0F6E56;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">✓ Aprobar cancelación</a>
            <a href="${urlRechazar}" style="background:#fff;color:#dc2626;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;border:2px solid #dc2626">✕ Rechazar</a>
          </div>
          <p style="color:#9ca3af;font-size:11px;margin-top:20px">Este enlace es de un solo uso y expira en 48 horas.</p>
        </div>
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px">Izango 360 ERP — notificación automática</p>
      </div>
    `

    const destinatarios = ["administracion@izango.com.pe", "jsosa@izango.com.pe", "pbastianelli@izango.com.pe"]
    await Promise.allSettled(destinatarios.map(email =>
      resend.emails.send({
        from: "Izango ERP <noreply@izango.com.pe>",
        to: email,
        subject: `[ACCIÓN REQUERIDA] Cancelación de ${rqsPendientes.length} RQ(s) — ${proyecto?.codigo}`,
        html,
      })
    ))

    return NextResponse.json({ ok: true, solicitud_id: solicitud.id, rqs_afectados: rqsPendientes.length })
  } catch (error: any) {
    console.error("Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}