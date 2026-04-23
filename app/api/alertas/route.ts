import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { tipo, destinatarios, datos } = await request.json()

    if (!destinatarios || destinatarios.length === 0) {
      return NextResponse.json({ error: "No hay destinatarios" }, { status: 400 })
    }

    const templates: Record<string, { subject: string, html: (d: any) => string }> = {
      proyecto_creado: {
        subject: "Nuevo proyecto creado — Izango ERP",
        html: (d) => `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:#03E373;padding:16px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:#1D2040;margin:0;font-size:20px">Nuevo proyecto creado</h1>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p style="color:#374151;font-size:14px">Se ha creado un nuevo proyecto en Izango ERP:</p>
              <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:4px 0;font-size:14px"><strong>Proyecto:</strong> ${d.nombre}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Código:</strong> ${d.codigo}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Cliente:</strong> ${d.cliente}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Creado por:</strong> ${d.creado_por}</p>
              </div>
              <a href="https://izango-erp.vercel.app/proyectos/${d.proyecto_id}" style="background:#03E373;color:#1D2040;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver proyecto</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">Izango 360 ERP — notificacion automatica</p>
          </div>
        `
      },
      rq_pendiente: {
        subject: "RQ pendiente de aprobacion — Izango ERP",
        html: (d) => `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:#f59e0b;padding:16px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">RQ pendiente de aprobacion</h1>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p style="color:#374151;font-size:14px">Hay un requerimiento de pago pendiente de tu aprobacion:</p>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:4px 0;font-size:14px"><strong>RQ:</strong> ${d.numero_rq}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Proyecto:</strong> ${d.proyecto}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Proveedor:</strong> ${d.proveedor}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Monto:</strong> S/ ${Number(d.monto).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
              </div>
              <a href="https://izango-erp.vercel.app/rq" style="background:#f59e0b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Revisar RQ</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">Izango 360 ERP — notificacion automatica</p>
          </div>
        `
      },
      proyecto_facturacion: {
        subject: "Proyecto listo para facturar — Izango ERP",
        html: (d) => `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:#8b5cf6;padding:16px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Proyecto listo para facturar</h1>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p style="color:#374151;font-size:14px">Un proyecto ha pasado a estado de facturacion:</p>
              <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:4px 0;font-size:14px"><strong>Proyecto:</strong> ${d.nombre}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Codigo:</strong> ${d.codigo}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Cliente:</strong> ${d.cliente}</p>
              </div>
              <a href="https://izango-erp.vercel.app/facturacion" style="background:#8b5cf6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ir a Facturacion</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">Izango 360 ERP — notificacion automatica</p>
          </div>
        `
      },
      proyecto_liquidado: {
        subject: "Proyecto liquidado — Izango ERP",
        html: (d) => `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:#059669;padding:16px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Proyecto liquidado</h1>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p style="color:#374151;font-size:14px">Un proyecto ha sido liquidado exitosamente:</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:4px 0;font-size:14px"><strong>Proyecto:</strong> ${d.nombre}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Codigo:</strong> ${d.codigo}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Margen real:</strong> ${d.margen}%</p>
              </div>
              <a href="https://izango-erp.vercel.app/liquidaciones" style="background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver Liquidaciones</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">Izango 360 ERP — notificacion automatica</p>
          </div>
        `
      },
      cotizacion_aprobada: {
        subject: "Cotizacion aprobada por cliente — Izango ERP",
        html: (d) => `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:#03E373;padding:16px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:#1D2040;margin:0;font-size:20px">Cotizacion aprobada</h1>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p style="color:#374151;font-size:14px">Una cotizacion ha sido aprobada por el cliente:</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:4px 0;font-size:14px"><strong>Proyecto:</strong> ${d.nombre}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Version:</strong> V${d.version}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Total cliente:</strong> S/ ${Number(d.total).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
              </div>
              <a href="https://izango-erp.vercel.app/proyectos/${d.proyecto_id}" style="background:#03E373;color:#1D2040;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver proyecto</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">Izango 360 ERP — notificacion automatica</p>
          </div>
        `
      },
    }

    const template = templates[tipo]
    if (!template) {
      return NextResponse.json({ error: "Tipo de alerta no reconocido: " + tipo }, { status: 400 })
    }

    const results = await Promise.allSettled(
      destinatarios.map((email: string) =>
        resend.emails.send({
          from: "Izango ERP <onboarding@resend.dev>",
          to: email,
          subject: template.subject,
          html: template.html(datos),
        })
      )
    )

    const enviados = results.filter(r => r.status === "fulfilled").length
    const fallidos = results.filter(r => r.status === "rejected").length

    return NextResponse.json({ enviados, fallidos, total: destinatarios.length })
  } catch (error: any) {
    console.error("Error enviando alertas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}