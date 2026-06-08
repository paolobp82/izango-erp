import { NextRequest, NextResponse } from "next/server"
import { requireAdminProfile, getErrorMessage } from "@/lib/auth-server"
import { getEmailConfigStatus, sanitizeRecipients, sendEmailBatch } from "@/lib/email"
import { escapeHtml as h } from "@/lib/html"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminProfile()
    if (auth.error) return auth.error

    const { email } = await request.json() as { email?: string }
    const recipients = sanitizeRecipients([email || auth.user.email || ""])
    if (recipients.length === 0) {
      return NextResponse.json({ error: "Email de destino invalido" }, { status: 400 })
    }

    const config = getEmailConfigStatus()
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">
      <h1 style="font-size:20px;color:#1D2040">Prueba de correo Izango ERP</h1>
      <p>Este correo confirma que Resend esta respondiendo desde el ERP.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:16px 0">
        <p><strong>Solicitado por:</strong> ${h(`${auth.profile.nombre || ""} ${auth.profile.apellido || ""}`.trim() || auth.user.email)}</p>
        <p><strong>Remitente configurado:</strong> ${h(config.fromEmail)}</p>
        <p><strong>Fecha:</strong> ${h(new Date().toISOString())}</p>
      </div>
      <p style="color:#6b7280;font-size:12px">No se expone la API key en esta prueba.</p>
    </div>`

    const result = await sendEmailBatch({
      to: recipients,
      subject: "Prueba de correo - Izango ERP",
      html,
      context: "admin:test-email",
    })

    return NextResponse.json({
      ok: result.sent > 0,
      enviados: result.sent,
      fallidos: result.failed,
      total: result.total,
      errores: result.failures,
      config: {
        hasResendApiKey: config.hasResendApiKey,
        fromEmail: config.fromEmail,
        usesDefaultFrom: config.usesDefaultFrom,
      },
    })
  } catch (error: unknown) {
    console.error("Error en email de prueba admin:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
