import { readFileSync } from "node:fs"

const files = {
  html: readFileSync("lib/html.ts", "utf8"),
  project: readFileSync("app/api/reporte-pdf/route.ts", "utf8"),
  worker: readFileSync("app/api/reporte-trabajador/route.ts", "utf8"),
  alertas: readFileSync("app/api/alertas/route.ts", "utf8"),
  cancelar: readFileSync("app/api/cancelar-rqs/route.ts", "utf8"),
  resolver: readFileSync("app/api/cancelar-rqs/resolver/route.ts", "utf8"),
  alertasReporte: readFileSync("app/api/alertas/reporte-pdf/route.ts", "utf8"),
}

const checks = []
function check(id, condition, detail) {
  checks.push({ id, result: condition ? "PASS" : "FAIL", detail })
}

check("XSS-01", files.html.includes("escapeHtml") && files.html.includes("&lt;") && files.html.includes("&quot;"), "Existe helper de escape HTML")
check("XSS-02", files.project.includes("getAuthenticatedProfile()") && files.project.includes("canAccessProjectReport"), "Reporte proyecto valida sesion y permiso")
check("XSS-03", files.project.includes("escapeHtml as h") && files.project.includes("h(proyecto"), "Reporte proyecto escapa datos dinamicos")
check("XSS-04", files.worker.includes("getAuthenticatedProfile()") && files.worker.includes("canAccessWorkerReport"), "Reporte trabajador valida sesion y permiso")
check("XSS-05", files.worker.includes("escapeHtml as h") && files.worker.includes("Content-Disposition"), "Reporte trabajador escapa HTML y filename")
check("XSS-06", files.alertas.includes("getAuthenticatedProfile()") && files.alertas.includes("EMAIL_RE"), "Correos genericos requieren sesion y validan destinatarios")
check("XSS-07", files.alertas.includes("h(d.") && files.alertas.includes("escapeAttribute(projectLink"), "Templates de correo escapan datos y URLs")
check("XSS-08", files.cancelar.includes("solicitado_por: auth.user.id") && !files.cancelar.includes("solicitado_por_id"), "Cancelacion RQ deriva solicitante desde sesion")
check("XSS-09", files.cancelar.includes("canRequestRqCancellation") && files.cancelar.includes("escapeAttribute(urlAprobar)"), "Cancelacion RQ valida permiso y escapa enlaces")
check("XSS-10", files.resolver.includes("TOKEN_RE") && files.resolver.indexOf("TOKEN_RE.test") < files.resolver.indexOf("createAdminClient()"), "Resolver valida token antes de service role")
check("XSS-11", files.resolver.includes("escapeHtml as h") && files.resolver.includes("resultPage"), "Resolver escapa respuestas HTML")
check("XSS-12", files.alertasReporte.includes('export { GET } from "../../reporte-pdf/route"'), "Reporte duplicado reutiliza handler seguro")

for (const item of checks) {
  console.log(`${item.result} ${item.id} ${item.detail}`)
}

if (checks.some((item) => item.result === "FAIL")) {
  process.exit(1)
}
