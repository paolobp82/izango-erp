import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedProfile, getErrorMessage } from "@/lib/auth-server"
import { canAccessWorkerReport } from "@/lib/report-auth"
import { escapeAttribute, escapeHtml as h } from "@/lib/html"

type Worker = {
  id: string
  user_id?: string | null
  nombre?: string | null
  apellido?: string | null
  cargo?: string | null
  area?: string | null
  tipo?: string | null
  dni?: string | null
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  fecha_ingreso?: string | null
  sueldo_base?: number | null
}

type SimpleRow = Record<string, string | number | boolean | null>

const htmlHeaders = { "Content-Type": "text/html; charset=utf-8" }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trabajadorId = searchParams.get("trabajador_id")
  if (!trabajadorId) return NextResponse.json({ error: "trabajador_id requerido" }, { status: 400 })

  try {
    const auth = await getAuthenticatedProfile()
    if (auth.error) return auth.error

    const supabase = auth.supabase
    const { data: trabajador } = await supabase.from("rrhh_trabajadores").select("*").eq("id", trabajadorId).single<Worker>()
    if (!trabajador) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 })
    if (!canAccessWorkerReport(auth.profile, trabajador)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }

    const [{ data: contratos }, { data: vacaciones }, { data: horas }, { data: permisos }, { data: faltas }] = await Promise.all([
      supabase.from("rrhh_contratos").select("tipo_contrato,fecha_inicio,fecha_fin,notas").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false }).returns<SimpleRow[]>(),
      supabase.from("rrhh_vacaciones").select("fecha_inicio,fecha_fin,dias,motivo,estado").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }).returns<SimpleRow[]>(),
      supabase.from("rrhh_horas_extras").select("fecha,horas,monto_calculado,motivo,aprobado").eq("trabajador_id", trabajadorId).order("fecha", { ascending: false }).returns<SimpleRow[]>(),
      supabase.from("rrhh_permisos").select("fecha_inicio,fecha,tipo_permiso,tipo,motivo,estado").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }).returns<SimpleRow[]>(),
      supabase.from("rrhh_faltas_medicas").select("fecha_inicio,fecha_fin,diagnostico,motivo,estado").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false }).returns<SimpleRow[]>(),
    ])

    const fmt = (n: unknown) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
    const fecha = new Date().toLocaleDateString("es-PE")
    const totalDiasVacaciones = (vacaciones || []).reduce((sum, row) => sum + Number(row.dias || 0), 0)
    const totalHoras = (horas || []).reduce((sum, row) => sum + Number(row.horas || 0), 0)
    const totalMontoHoras = (horas || []).reduce((sum, row) => sum + Number(row.monto_calculado || 0), 0)

    const rows = (items: SimpleRow[], cells: Array<(row: SimpleRow) => unknown>) =>
      items.map((item) => `<tr>${cells.map((cell) => `<td>${h(cell(item) || "—")}</td>`).join("")}</tr>`).join("")

    const vacacionesRows = rows(vacaciones || [], [
      (v) => v.fecha_inicio,
      (v) => v.fecha_fin,
      (v) => v.dias,
      (v) => v.motivo,
      (v) => v.estado || "pendiente",
    ])
    const horasRows = rows(horas || [], [
      (row) => row.fecha,
      (row) => `${row.horas || 0}h`,
      (row) => fmt(row.monto_calculado),
      (row) => row.motivo,
      (row) => row.aprobado ? "aprobado" : "pendiente",
    ])
    const permisosRows = rows(permisos || [], [
      (row) => row.fecha_inicio || row.fecha,
      (row) => row.tipo_permiso || row.tipo,
      (row) => row.motivo,
      (row) => row.estado || "pendiente",
    ])
    const faltasRows = rows(faltas || [], [
      (row) => row.fecha_inicio,
      (row) => row.fecha_fin,
      (row) => row.diagnostico || row.motivo,
      (row) => row.estado || "pendiente",
    ])
    const contratosRows = rows(contratos || [], [
      (row) => row.tipo_contrato,
      (row) => row.fecha_inicio,
      (row) => row.fecha_fin || "Indefinido",
      (row) => row.notas,
    ])

    const fullName = `${trabajador.nombre || ""} ${trabajador.apellido || ""}`.trim()
    const filename = `ficha-${escapeAttribute(trabajador.apellido || "trabajador")}-${escapeAttribute(trabajador.nombre || "")}.html`
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ficha trabajador</title><style>
      body{font-family:Arial,sans-serif;font-size:12px;color:#111827;padding:32px}.header{display:flex;justify-content:space-between;border-bottom:2px solid #1D9E75;padding-bottom:16px;margin-bottom:24px}
      h1{font-size:20px;color:#04342C}.name{font-size:18px;font-weight:700}.muted{color:#6b7280}.section{margin-top:20px}.section-title{font-size:13px;font-weight:700;color:#0F6E56;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 18px;margin-top:10px}.label{font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700}.value{font-weight:600}
      .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px}.val{font-size:18px;font-weight:800;color:#0F6E56}
      table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#f0fdf4;text-align:left;padding:7px;color:#6b7280;font-size:10px;text-transform:uppercase}td{padding:7px;border-bottom:1px solid #f3f4f6}
    </style></head><body>
      <div class="header"><div><h1>Izango 360 SAC</h1><p class="muted">Ficha completa del trabajador</p></div><div class="muted">Generado: ${h(fecha)}</div></div>
      <div class="name">${h(fullName || "—")}</div><div class="muted">${h(trabajador.cargo || "—")} · ${h(trabajador.area || "—")} · ${h(trabajador.tipo || "—")}</div>
      <div class="summary">
        <div class="box"><div class="val">${h(totalDiasVacaciones)}</div><div>Vacaciones</div></div>
        <div class="box"><div class="val">${h(totalHoras)}h</div><div>Horas extras</div></div>
        <div class="box"><div class="val">${h((permisos || []).length)}</div><div>Permisos</div></div>
        <div class="box"><div class="val">${h((faltas || []).length)}</div><div>Faltas medicas</div></div>
      </div>
      <div class="section"><div class="section-title">Datos personales</div><div class="grid">
        <div><div class="label">DNI</div><div class="value">${h(trabajador.dni || "—")}</div></div>
        <div><div class="label">Email</div><div class="value">${h(trabajador.email || "—")}</div></div>
        <div><div class="label">Telefono</div><div class="value">${h(trabajador.telefono || "—")}</div></div>
        <div><div class="label">Direccion</div><div class="value">${h(trabajador.direccion || "—")}</div></div>
        <div><div class="label">Ingreso</div><div class="value">${h(trabajador.fecha_ingreso || "—")}</div></div>
        <div><div class="label">Sueldo base</div><div class="value">${h(fmt(trabajador.sueldo_base))}</div></div>
      </div></div>
      <div class="section"><div class="section-title">Vacaciones · ${h(totalDiasVacaciones)} dias</div>${vacacionesRows ? `<table><thead><tr><th>Inicio</th><th>Fin</th><th>Dias</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>${vacacionesRows}</tbody></table>` : "<p class=\"muted\">Sin registros</p>"}</div>
      <div class="section"><div class="section-title">Horas extras · ${h(totalHoras)}h / ${h(fmt(totalMontoHoras))}</div>${horasRows ? `<table><thead><tr><th>Fecha</th><th>Horas</th><th>Monto</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>${horasRows}</tbody></table>` : "<p class=\"muted\">Sin registros</p>"}</div>
      <div class="section"><div class="section-title">Permisos</div>${permisosRows ? `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>${permisosRows}</tbody></table>` : "<p class=\"muted\">Sin registros</p>"}</div>
      <div class="section"><div class="section-title">Faltas medicas</div>${faltasRows ? `<table><thead><tr><th>Inicio</th><th>Fin</th><th>Diagnostico</th><th>Estado</th></tr></thead><tbody>${faltasRows}</tbody></table>` : "<p class=\"muted\">Sin registros</p>"}</div>
      ${contratosRows ? `<div class="section"><div class="section-title">Contratos</div><table><thead><tr><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Notas</th></tr></thead><tbody>${contratosRows}</tbody></table></div>` : ""}
      <p class="muted" style="text-align:center;margin-top:32px">Uso interno confidencial · ${h(fecha)}</p>
    </body></html>`

    return new NextResponse(html, {
      headers: {
        ...htmlHeaders,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
