import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const accion = searchParams.get("accion")

    if (!token || !["aprobar","rechazar"].includes(accion || "")) {
      return new NextResponse("<h2>Enlace inválido</h2>", { headers: { "Content-Type": "text/html" } })
    }

    const supabase = createClient()
    const { data: solicitud } = await supabase.from("solicitudes_cancelacion_rq")
      .select("*").eq("token", token).single()

    if (!solicitud) return new NextResponse("<h2>Solicitud no encontrada</h2>", { headers: { "Content-Type": "text/html" } })
    if (solicitud.estado !== "pendiente") {
      return new NextResponse(`<h2>Esta solicitud ya fue ${solicitud.estado === "aprobada" ? "aprobada" : "rechazada"}.</h2>`, { headers: { "Content-Type": "text/html" } })
    }

    const { data: proyecto } = await supabase.from("proyectos")
      .select("codigo, nombre, estado").eq("id", solicitud.proyecto_id).single()

    if (accion === "aprobar") {
      await supabase.from("requerimientos_pago")
        .update({ estado: "rechazado", motivo_rechazo: "Cancelado por regreso de estado del proyecto" })
        .eq("proyecto_id", solicitud.proyecto_id)
        .in("estado", ["pendiente_aprobacion","aprobado_produccion"])

      await supabase.from("proyectos").update({ estado: solicitud.estado_nuevo }).eq("id", solicitud.proyecto_id)
      await supabase.from("solicitudes_cancelacion_rq").update({ estado: "aprobada", resuelto_at: new Date().toISOString() }).eq("id", solicitud.id)

      const { data: rqsCancelados } = await supabase.from("requerimientos_pago")
        .select("numero_rq, descripcion, monto_solicitado, proveedor_nombre")
        .eq("proyecto_id", solicitud.proyecto_id)
        .eq("motivo_rechazo", "Cancelado por regreso de estado del proyecto")

      const listaRQs = (rqsCancelados || []).map(r =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${r.numero_rq}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${r.descripcion||"—"}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${r.proveedor_nombre||"—"}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:700">S/ ${Number(r.monto_solicitado).toLocaleString("es-PE",{minimumFractionDigits:2})}</td></tr>`
      ).join("")

      const totalMonto = (rqsCancelados||[]).reduce((s,r) => s+(r.monto_solicitado||0),0)
      const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})

      const htmlEmail = `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px">
          <div style="background:#1D2040;padding:20px 28px;border-radius:10px 10px 0 0">
            <h1 style="color:#03E373;margin:0;font-size:18px">Registro de Cancelación de RQs</h1>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
              <p style="margin:0;font-size:14px;color:#15803d;font-weight:600">✓ Cancelación aprobada y ejecutada</p>
            </div>
            <p style="color:#374151;font-size:14px"><strong>Fecha:</strong> ${fecha}</p>
            <p style="color:#374151;font-size:14px"><strong>Proyecto:</strong> ${proyecto?.codigo} — ${proyecto?.nombre}</p>
            <p style="color:#374151;font-size:14px"><strong>Estado regresado a:</strong> ${solicitud.estado_nuevo}</p>
            <p style="color:#374151;font-size:14px;font-weight:700">RQs cancelados:</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0">
              <thead><tr style="background:#1D2040">
                <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">N° RQ</th>
                <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Descripción</th>
                <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">Proveedor</th>
                <th style="padding:8px 12px;text-align:right;color:#03E373;font-size:12px">Monto</th>
              </tr></thead>
              <tbody>${listaRQs}</tbody>
              <tfoot><tr style="background:#f9fafb">
                <td colspan="3" style="padding:10px 12px;font-weight:700;font-size:13px">TOTAL CANCELADO</td>
                <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:15px;color:#dc2626">S/ ${totalMonto.toLocaleString("es-PE",{minimumFractionDigits:2})}</td>
              </tr></tfoot>
            </table>
            <p style="color:#6b7280;font-size:12px;margin-top:16px">Este documento es el registro oficial de la cancelación. Guárdelo para sus archivos.</p>
          </div>
          <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px">Izango 360 ERP — registro automático</p>
        </div>
      `

      await Promise.allSettled(["administracion@izango.com.pe","jsosa@izango.com.pe","pbastianelli@izango.com.pe"].map(email =>
        resend.emails.send({
          from: "Izango ERP <noreply@izango.com.pe>",
          to: email,
          subject: `Registro: ${(rqsCancelados||[]).length} RQ(s) cancelados — ${proyecto?.codigo}`,
          html: htmlEmail,
        })
      ))

      return new NextResponse(`
        <html><body style="font-family:Arial;max-width:600px;margin:60px auto;text-align:center">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:40px">
            <div style="font-size:48px;margin-bottom:16px">✓</div>
            <h2 style="color:#15803d">Cancelación aprobada</h2>
            <p style="color:#374151">Los RQs han sido cancelados y el proyecto regresó a <strong>${solicitud.estado_nuevo}</strong>.</p>
            <p style="color:#6b7280;font-size:13px">Se envió el registro por correo a todos los involucrados.</p>
            <a href="https://izango-erp.vercel.app/proyectos/${solicitud.proyecto_id}" style="background:#0F6E56;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px">Ver proyecto</a>
          </div>
        </body></html>
      `, { headers: { "Content-Type": "text/html" } })

    } else {
      await supabase.from("solicitudes_cancelacion_rq").update({ estado: "rechazada", resuelto_at: new Date().toISOString() }).eq("id", solicitud.id)

      return new NextResponse(`
        <html><body style="font-family:Arial;max-width:600px;margin:60px auto;text-align:center">
          <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:12px;padding:40px">
            <div style="font-size:48px;margin-bottom:16px">✕</div>
            <h2 style="color:#991b1b">Cancelación rechazada</h2>
            <p style="color:#374151">Los RQs se mantienen activos. El proyecto no cambiará de estado.</p>
            <a href="https://izango-erp.vercel.app/proyectos/${solicitud.proyecto_id}" style="background:#1D2040;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px">Ver proyecto</a>
          </div>
        </body></html>
      `, { headers: { "Content-Type": "text/html" } })
    }
  } catch (error: any) {
    console.error("Error:", error)
    return new NextResponse("<h2>Error procesando la solicitud</h2>", { headers: { "Content-Type": "text/html" } })
  }
}