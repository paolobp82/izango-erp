import { Resend } from "resend"

const DEFAULT_FROM = "Izango SIG <noreply@izango.com.pe>"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function getFromEmail() {
  return process.env.FROM_EMAIL || DEFAULT_FROM
}

export function getEmailConfigStatus() {
  const from = getFromEmail()
  return {
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    fromEmail: from,
    usesDefaultFrom: !process.env.FROM_EMAIL,
  }
}

export function sanitizeRecipients(recipients: string[], limit = 25) {
  return recipients.filter((email) => EMAIL_RE.test(email)).slice(0, limit)
}

export function getEmailErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Error enviando correo")
  }
  return "Error enviando correo"
}

export async function sendEmailBatch({
  to,
  subject,
  html,
  context,
}: {
  to: string[]
  subject: string
  html: string
  context: string
}) {
  const status = getEmailConfigStatus()
  if (!status.hasResendApiKey) {
    console.error(`[email:${context}] RESEND_API_KEY no configurado`)
    throw new Error("RESEND_API_KEY no configurado")
  }

  const recipients = sanitizeRecipients(to)
  if (recipients.length === 0) {
    console.warn(`[email:${context}] No hay destinatarios validos`)
    return {
      sent: 0,
      failed: 0,
      total: 0,
      failures: [] as Array<{ email: string; error: string }>,
      deliveries: [] as Array<{ email: string; from: string; subject: string; messageId: string | null; status: string; error?: string }>,
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = status.fromEmail
  const results = await Promise.allSettled(
    recipients.map((email) =>
      resend.emails.send({
        from,
        to: email,
        subject,
        html,
      })
    )
  )

  const deliveries = results.map((result, index) => {
    const email = recipients[index]
    if (result.status === "rejected") {
      return { email, from, subject, messageId: null, status: "rejected", error: getEmailErrorMessage(result.reason) }
    }

    const value = result.value as { data?: { id?: string | null } | null; error?: unknown }
    if (value.error) {
      return { email, from, subject, messageId: null, status: "error", error: getEmailErrorMessage(value.error) }
    }

    return { email, from, subject, messageId: value.data?.id || null, status: value.data?.id ? "accepted" : "unknown" }
  })

  const failures = deliveries
    .filter((delivery) => delivery.status === "rejected" || delivery.status === "error")
    .map((delivery) => ({
      email: delivery.email,
      error: delivery.error || "Error enviando correo",
    }))

  if (failures.length > 0) {
    console.error(`[email:${context}] Fallaron ${failures.length}/${recipients.length} envios`, failures)
  } else {
    console.info(
      `[email:${context}] Enviados ${recipients.length}/${recipients.length} desde ${from}`,
      deliveries.map((delivery) => ({
        email: delivery.email,
        messageId: delivery.messageId,
        status: delivery.status,
      }))
    )
  }

  return {
    sent: deliveries.filter((delivery) => delivery.status === "accepted").length,
    failed: failures.length,
    total: recipients.length,
    failures,
    deliveries,
  }
}
