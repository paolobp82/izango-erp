import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedProfile, getErrorMessage } from "@/lib/auth-server"
import { escapeAttribute, escapeHtml as h } from "@/lib/html"
import { sanitizeRecipients, sendEmailBatch } from "@/lib/email"

const APP_URL = "https://izango-erp.vercel.app"

type AlertData = Record<string, unknown>
type AlertTemplate = { subject: string | ((data: AlertData) => string); html: (data: AlertData) => string }

function money(value: unknown) {
  return Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
}

function projectLink(id: unknown) {
  return `${APP_URL}/proyectos/${encodeURIComponent(String(id || ""))}`
}

function label(value: unknown, fallback = "") {
  const text = String(value || "").trim()
  return text || fallback
}

function subjectWithContext(title: string, data: AlertData, contextKeys: string[]) {
  const context = contextKeys.map((key) => label(data[key])).find(Boolean)
  return context ? `${title} [${context}] - Izango ERP` : `${title} - Izango ERP`
}

function card(title: string, body: string, color = "#03E373") {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <div style="background:${color};padding:16px 24px;border-radius:8px 8px 0 0">
      <h1 style="color:#1D2040;margin:0;font-size:20px">${h(title)}</h1>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">${body}</div>
    <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center">Izango 360 ERP - notificacion automatica</p>
  </div>`
}

const templates: Record<string, AlertTemplate> = {
  proyecto_creado: {
    subject: (d) => subjectWithContext("Nuevo proyecto creado", d, ["codigo", "nombre"]),
    html: (d) => card("Nuevo proyecto creado", `
      <p style="color:#374151;font-size:14px">Se ha creado un nuevo proyecto en Izango ERP:</p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
        <p><strong>Proyecto:</strong> ${h(d.nombre)}</p>
        <p><strong>Codigo:</strong> ${h(d.codigo)}</p>
        <p><strong>Cliente:</strong> ${h(d.cliente)}</p>
        <p><strong>Creado por:</strong> ${h(d.creado_por)}</p>
      </div>
      <a href="${escapeAttribute(projectLink(d.proyecto_id))}" style="background:#03E373;color:#1D2040;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver proyecto</a>
    `),
  },
  rq_pendiente: {
    subject: (d) => subjectWithContext("RQ pendiente de aprobacion", { ...d, codigo_rq: d.codigo_rq || d.numero_rq }, ["codigo_rq", "proyecto"]),
    html: (d) => card("RQ pendiente de aprobacion", `
      <p style="color:#374151;font-size:14px">Hay un requerimiento de pago pendiente de aprobacion:</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p><strong>RQ:</strong> ${h(d.codigo_rq || d.numero_rq)}</p>
        <p><strong>Proyecto:</strong> ${h(d.proyecto)}</p>
        <p><strong>Proveedor:</strong> ${h(d.proveedor)}</p>
        <p><strong>Monto:</strong> S/ ${h(money(d.monto))}</p>
      </div>
      <a href="${APP_URL}/rq" style="background:#f59e0b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Revisar RQ</a>
    `, "#f59e0b"),
  },
  proyecto_facturacion: {
    subject: (d) => subjectWithContext("Proyecto listo para facturar", d, ["codigo", "nombre"]),
    html: (d) => card("Proyecto listo para facturar", `
      <p style="color:#374151;font-size:14px">Un proyecto ha pasado a estado de facturacion:</p>
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:16px 0">
        <p><strong>Proyecto:</strong> ${h(d.nombre)}</p>
        <p><strong>Codigo:</strong> ${h(d.codigo)}</p>
        <p><strong>Cliente:</strong> ${h(d.cliente)}</p>
      </div>
      <a href="${APP_URL}/facturacion" style="background:#8b5cf6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ir a Facturacion</a>
    `, "#8b5cf6"),
  },
  proyecto_liquidado: {
    subject: (d) => subjectWithContext("Proyecto liquidado", d, ["codigo", "nombre"]),
    html: (d) => card("Proyecto liquidado", `
      <p style="color:#374151;font-size:14px">Un proyecto ha sido liquidado exitosamente:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <p><strong>Proyecto:</strong> ${h(d.nombre)}</p>
        <p><strong>Codigo:</strong> ${h(d.codigo)}</p>
        <p><strong>Margen real:</strong> ${h(d.margen)}%</p>
      </div>
      <a href="${APP_URL}/liquidaciones" style="background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver Liquidaciones</a>
    `, "#059669"),
  },
  cotizacion_aprobada: {
    subject: (d) => {
      const codigo = label(d.codigo || d.nombre)
      const version = label(d.version)
      const context = [codigo, version ? `V${version}` : ""].filter(Boolean).join(" ")
      return context ? `Cotizacion aprobada por cliente [${context}] - Izango ERP` : "Cotizacion aprobada por cliente - Izango ERP"
    },
    html: (d) => card("Cotizacion aprobada", `
      <p style="color:#374151;font-size:14px">Una cotizacion ha sido aprobada por el cliente:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <p><strong>Proyecto:</strong> ${h(d.nombre)}</p>
        <p><strong>Version:</strong> V${h(d.version)}</p>
        <p><strong>Total cliente:</strong> S/ ${h(money(d.total))}</p>
      </div>
      <a href="${escapeAttribute(projectLink(d.proyecto_id))}" style="background:#03E373;color:#1D2040;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver proyecto</a>
    `),
  },
  audiovisual_requerimiento_creado: {
    subject: (d) => subjectWithContext("Nuevo requerimiento audiovisual", d, ["codigo", "proyecto"]),
    html: (d) => card("Nuevo requerimiento audiovisual", `
      <p style="color:#374151;font-size:14px">Produccion ha solicitado un nuevo trabajo al area audiovisual:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
        <p><strong>Proyecto:</strong> ${h(d.proyecto)}</p>
        <p><strong>Productor:</strong> ${h(d.productor)}</p>
        <p><strong>Prioridad:</strong> ${h(d.prioridad)}</p>
        <p><strong>Entrega solicitada:</strong> ${h(d.fecha_entrega_solicitada)}</p>
        <p><strong>Piezas:</strong> ${h(d.piezas)}</p>
      </div>
      <a href="${APP_URL}/audiovisual/requerimientos" style="background:#1D2040;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Ver requerimientos</a>
    `, "#1D2040"),
  },
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedProfile()
    if (auth.error) return auth.error

    const { tipo, destinatarios, datos } = await request.json() as { tipo?: string; destinatarios?: string[]; datos?: AlertData }
    const template = tipo ? templates[tipo] : null
    if (!template) return NextResponse.json({ error: "Tipo de alerta no reconocido" }, { status: 400 })

    const safeRecipients = sanitizeRecipients(destinatarios || [])
    if (safeRecipients.length === 0) {
      return NextResponse.json({ error: "No hay destinatarios validos" }, { status: 400 })
    }

    const safeData = datos || {}
    const subject = typeof template.subject === "function" ? template.subject(safeData) : template.subject
    const html = template.html(safeData)
    const result = await sendEmailBatch({
      to: safeRecipients,
      subject,
      html,
      context: `alertas:${tipo}`,
    })

    return NextResponse.json({
      enviados: result.sent,
      fallidos: result.failed,
      total: result.total,
      errores: result.failures,
      entregas: result.deliveries,
    })
  } catch (error: unknown) {
    console.error("Error enviando alertas:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
