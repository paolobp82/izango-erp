import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trabajadorId = searchParams.get("trabajador_id")
  if (!trabajadorId) return NextResponse.json({ error: "trabajador_id requerido" }, { status: 400 })

  try {
    const supabase = createClient()

    const [
      { data: trabajador },
      { data: contratos },
      { data: vacaciones },
      { data: horas },
      { data: permisos },
      { data: faltas },
    ] = await Promise.all([
      supabase.from("rrhh_trabajadores").select("*").eq("id", trabajadorId).single(),
      supabase.from("rrhh_contratos").select("*").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false }),
      supabase.from("rrhh_vacaciones").select("*").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }),
      supabase.from("rrhh_horas_extras").select("*").eq("trabajador_id", trabajadorId).order("fecha", { ascending: false }),
      supabase.from("rrhh_permisos").select("*").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }),
      supabase.from("rrhh_faltas_medicas").select("*").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false }),
    ])

    if (!trabajador) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 })

    const totalDiasVacaciones = (vacaciones || []).reduce((s: number, v: any) => s + (v.dias || 0), 0)
    const totalHoras = (horas || []).reduce((s: number, h: any) => s + (h.horas || 0), 0)
    const totalMontoHoras = (horas || []).reduce((s: number, h: any) => s + (h.monto_calculado || 0), 0)
    const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })
    const fecha = new Date().toLocaleDateString("es-PE")

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ficha Trabajador - ${trabajador.nombre} ${trabajador.apellido}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1D9E75; }
  .logo-area h1 { font-size: 20px; font-weight: 800; color: #04342C; }
  .logo-area p { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .fecha { font-size: 11px; color: #6b7280; text-align: right; }
  .nombre-trabajador { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; }
  .cargo-area { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 700; color: #0F6E56; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 8px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; margin-bottom: 8px; }
  .field-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 600; }
  .field-value { font-size: 12px; color: #111827; font-weight: 500; margin-top: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
  thead tr { background: #f0fdf4; }
  th { text-align: left; padding: 6px 8px; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-yellow { background: #fef9c3; color: #92400e; }
  .summary-box { display: flex; gap: 16px; margin-top: 8px; }
  .summary-item { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 16px; flex: 1; }
  .summary-item .val { font-size: 18px; font-weight: 800; color: #0F6E56; }
  .summary-item .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <h1>Izango 360 SAC</h1>
      <p>Ficha completa del trabajador</p>
    </div>
    <div class="fecha">Generado: ${fecha}</div>
  </div>

  <div class="nombre-trabajador">${trabajador.nombre} ${trabajador.apellido}</div>
  <div class="cargo-area">${trabajador.cargo || "—"} · ${trabajador.area || "—"} · ${trabajador.tipo || "—"}</div>

  <!-- Resumen -->
  <div class="summary-box" style="margin-bottom: 20px;">
    <div class="summary-item">
      <div class="val">${totalDiasVacaciones}</div>
      <div class="lbl">Dias de vacaciones</div>
    </div>
    <div class="summary-item">
      <div class="val">${totalHoras}h</div>
      <div class="lbl">Horas extras</div>
    </div>
    <div class="summary-item">
      <div class="val">${(permisos || []).length}</div>
      <div class="lbl">Permisos</div>
    </div>
    <div class="summary-item">
      <div class="val">${(faltas || []).length}</div>
      <div class="lbl">Faltas medicas</div>
    </div>
  </div>

  <!-- Datos personales -->
  <div class="section">
    <div class="section-title">Datos personales</div>
    <div class="grid-3">
      <div><div class="field-label">DNI</div><div class="field-value">${trabajador.dni || "—"}</div></div>
      <div><div class="field-label">Email</div><div class="field-value">${trabajador.email || "—"}</div></div>
      <div><div class="field-label">Telefono</div><div class="field-value">${trabajador.telefono || "—"}</div></div>
    </div>
    <div class="grid-2">
      <div><div class="field-label">Direccion</div><div class="field-value">${trabajador.direccion || "—"}</div></div>
      <div><div class="field-label">Fecha ingreso</div><div class="field-value">${trabajador.fecha_ingreso || "—"}</div></div>
    </div>
    ${trabajador.contacto_emergencia_nombre ? `
    <div class="grid-3">
      <div><div class="field-label">Contacto emergencia</div><div class="field-value">${trabajador.contacto_emergencia_nombre}</div></div>
      <div><div class="field-label">Telefono emergencia</div><div class="field-value">${trabajador.contacto_emergencia_telefono || "—"}</div></div>
      <div><div class="field-label">Relacion</div><div class="field-value">${trabajador.contacto_emergencia_relacion || "—"}</div></div>
    </div>` : ""}
  </div>

  <!-- Datos laborales -->
  <div class="section">
    <div class="section-title">Datos laborales</div>
    <div class="grid-3">
      <div><div class="field-label">Modalidad</div><div class="field-value">${trabajador.modalidad_contrato || "—"}</div></div>
      <div><div class="field-label">Sistema pension</div><div class="field-value">${trabajador.sistema_pension || "—"}</div></div>
      <div><div class="field-label">Sueldo base</div><div class="field-value">${fmt(trabajador.sueldo_base)}</div></div>
    </div>
    ${trabajador.banco ? `<div class="grid-3">
      <div><div class="field-label">Banco</div><div class="field-value">${trabajador.banco}</div></div>
      <div><div class="field-label">N cuenta</div><div class="field-value">${trabajador.numero_cuenta || "—"}</div></div>
      <div><div class="field-label">CCI</div><div class="field-value">${trabajador.cci || "—"}</div></div>
    </div>` : ""}
  </div>

  <!-- Vacaciones -->
  <div class="section">
    <div class="section-title">Vacaciones — Total: ${totalDiasVacaciones} dias</div>
    ${(vacaciones || []).length === 0 ? "<p style='color:#9ca3af;font-size:11px'>Sin registros</p>" : `
    <table>
      <thead><tr><th>Inicio</th><th>Fin</th><th>Dias</th><th>Motivo</th><th>Estado</th></tr></thead>
      <tbody>
        ${(vacaciones || []).map((v: any) => `
        <tr>
          <td>${v.fecha_inicio || "—"}</td>
          <td>${v.fecha_fin || "—"}</td>
          <td>${v.dias || 0}</td>
          <td>${v.motivo || "—"}</td>
          <td><span class="badge ${v.estado === "aprobado" ? "badge-green" : "badge-yellow"}">${v.estado || "pendiente"}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>`}
  </div>

  <!-- Horas extras -->
  <div class="section">
    <div class="section-title">Horas extras — Total: ${totalHoras}h / ${fmt(totalMontoHoras)}</div>
    ${(horas || []).length === 0 ? "<p style='color:#9ca3af;font-size:11px'>Sin registros</p>" : `
    <table>
      <thead><tr><th>Fecha</th><th>Horas</th><th>Monto</th><th>Motivo</th><th>Estado</th></tr></thead>
      <tbody>
        ${(horas || []).map((h: any) => `
        <tr>
          <td>${h.fecha || "—"}</td>
          <td>${h.horas || 0}h</td>
          <td>${fmt(h.monto_calculado)}</td>
          <td>${h.motivo || "—"}</td>
          <td><span class="badge ${h.aprobado ? "badge-green" : "badge-yellow"}">${h.aprobado ? "aprobado" : "pendiente"}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>`}
  </div>

  <!-- Permisos -->
  <div class="section">
    <div class="section-title">Permisos — Total: ${(permisos || []).length}</div>
    ${(permisos || []).length === 0 ? "<p style='color:#9ca3af;font-size:11px'>Sin registros</p>" : `
    <table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Estado</th></tr></thead>
      <tbody>
        ${(permisos || []).map((p: any) => `
        <tr>
          <td>${p.fecha_inicio || p.fecha || "—"}</td>
          <td>${p.tipo_permiso || p.tipo || "—"}</td>
          <td>${p.motivo || "—"}</td>
          <td><span class="badge ${p.estado === "aprobado" ? "badge-green" : "badge-yellow"}">${p.estado || "pendiente"}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>`}
  </div>

  <!-- Faltas medicas -->
  <div class="section">
    <div class="section-title">Faltas medicas — Total: ${(faltas || []).length}</div>
    ${(faltas || []).length === 0 ? "<p style='color:#9ca3af;font-size:11px'>Sin registros</p>" : `
    <table>
      <thead><tr><th>Inicio</th><th>Fin</th><th>Diagnostico</th><th>Estado</th></tr></thead>
      <tbody>
        ${(faltas || []).map((f: any) => `
        <tr>
          <td>${f.fecha_inicio || "—"}</td>
          <td>${f.fecha_fin || "—"}</td>
          <td>${f.diagnostico || f.motivo || "—"}</td>
          <td><span class="badge ${f.estado === "aprobado" ? "badge-green" : "badge-yellow"}">${f.estado || "pendiente"}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>`}
  </div>

  <!-- Contratos -->
  ${(contratos || []).length > 0 ? `
  <div class="section">
    <div class="section-title">Contratos</div>
    <table>
      <thead><tr><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Notas</th></tr></thead>
      <tbody>
        ${(contratos || []).map((c: any) => `
        <tr>
          <td>${c.tipo_contrato || "—"}</td>
          <td>${c.fecha_inicio || "—"}</td>
          <td>${c.fecha_fin || "Indefinido"}</td>
          <td>${c.notas || "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="footer">Izango 360 SAC — Reporte generado el ${fecha} — Uso interno confidencial</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="ficha-${trabajador.apellido}-${trabajador.nombre}.html"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
