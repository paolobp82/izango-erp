import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const proyectoId = searchParams.get("proyecto_id")

  if (!proyectoId) {
    return NextResponse.json({ error: "proyecto_id requerido" }, { status: 400 })
  }

  try {
    const supabase = createClient()

    const [
      { data: proyecto },
      { data: cotizaciones },
      { data: rqs },
      { data: liquidacion },
      { data: facturas },
    ] = await Promise.all([
      supabase.from("proyectos").select("*, cliente:clientes(razon_social, ruc, direccion, nombre_contacto, email_contacto), productor:perfiles!productor_id(nombre, apellido)").eq("id", proyectoId).single(),
      supabase.from("cotizaciones").select("*, cotizacion_items(*)").eq("proyecto_id", proyectoId).order("version"),
      supabase.from("requerimientos_pago").select("*").eq("proyecto_id", proyectoId).order("created_at"),
      supabase.from("liquidaciones").select("*, liquidacion_items(*)").eq("proyecto_id", proyectoId).single(),
      supabase.from("facturas").select("*").eq("proyecto_id", proyectoId),
    ])

    const cotAprobada = cotizaciones?.find((c: any) => c.estado === "aprobada_cliente") || cotizaciones?.[cotizaciones.length - 1]
    const items = cotAprobada?.cotizacion_items || []
    const liqItems = liquidacion?.liquidacion_items || []

    const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const fmtPct = (n: number) => Number(n || 0).toFixed(1) + "%"

    const totalRQs = (rqs || []).reduce((s: number, r: any) => s + (r.monto_solicitado || 0), 0)
    const totalFacturado = (facturas || []).reduce((s: number, f: any) => s + ((f.subtotal || 0) + (f.igv || 0)), 0)

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1D2040; background: #fff; }
    .header { background: #03E373; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
    .header-left h1 { font-size: 22px; font-weight: 800; color: #1D2040; }
    .header-left p { font-size: 12px; color: #1D2040; opacity: 0.7; margin-top: 4px; }
    .header-right { text-align: right; }
    .header-right .codigo { font-size: 18px; font-weight: 800; color: #1D2040; }
    .header-right .fecha { font-size: 11px; color: #1D2040; opacity: 0.7; }
    .body { padding: 24px 32px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #0F6E56; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #03E373; padding-bottom: 6px; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .info-box { background: #f8fafc; border-radius: 8px; padding: 12px 16px; }
    .info-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
    .info-value { font-size: 13px; font-weight: 600; color: #1D2040; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #1D2040; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-yellow { background: #fef9c3; color: #92400e; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f3f4f6; color: #6b7280; }
    .total-box { background: #1D2040; color: #fff; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .total-label { font-size: 12px; font-weight: 600; }
    .total-value { font-size: 20px; font-weight: 800; color: #03E373; }
    .desvio-pos { color: #15803d; font-weight: 700; }
    .desvio-neg { color: #dc2626; font-weight: 700; }
    .footer { background: #f8fafc; border-top: 2px solid #03E373; padding: 12px 32px; display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
    .footer-text { font-size: 10px; color: #94a3b8; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .kpi-box { background: #f8fafc; border-radius: 8px; padding: 12px; border-left: 3px solid #03E373; }
    .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
    .kpi-value { font-size: 16px; font-weight: 800; color: #1D2040; }
  </style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>REPORTE DE PROYECTO</h1>
    <p>Izango 360 S.A.C. · RUC 20600487583</p>
    <p>Generado: ${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</p>
  </div>
  <div class="header-right">
    <div class="codigo">${proyecto?.codigo || "—"}</div>
    <div class="fecha">${proyecto?.nombre || ""}</div>
  </div>
</div>

<div class="body">

  <!-- Info proyecto -->
  <div class="section">
    <div class="section-title">Información del proyecto</div>
    <div class="grid-2">
      <div class="info-box">
        <div class="info-label">Cliente</div>
        <div class="info-value">${proyecto?.cliente?.razon_social || "—"}</div>
        ${proyecto?.cliente?.ruc ? `<div style="font-size:11px;color:#64748b">RUC: ${proyecto.cliente.ruc}</div>` : ""}
        ${proyecto?.cliente?.nombre_contacto ? `<div style="font-size:11px;color:#64748b">Contacto: ${proyecto.cliente.nombre_contacto}</div>` : ""}
      </div>
      <div class="info-box">
        <div class="info-label">Productor</div>
        <div class="info-value">${proyecto?.productor ? proyecto.productor.nombre + " " + proyecto.productor.apellido : "—"}</div>
        <div style="margin-top:8px">
          <div class="info-label">Estado</div>
          <span class="badge badge-${proyecto?.estado === "en_curso" ? "green" : proyecto?.estado === "facturado" ? "blue" : "gray"}">${proyecto?.estado || "—"}</span>
        </div>
      </div>
    </div>
    <div class="grid-3" style="margin-top:12px">
      <div class="info-box">
        <div class="info-label">Fecha ejecución</div>
        <div class="info-value">${proyecto?.fecha_inicio || "—"}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Fecha fin estimada</div>
        <div class="info-value">${proyecto?.fecha_fin_estimada || "—"}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Presupuesto referencial</div>
        <div class="info-value">${proyecto?.presupuesto_referencial ? fmt(proyecto.presupuesto_referencial) : "—"}</div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="section">
    <div class="section-title">Resumen financiero</div>
    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Total cotizado</div>
        <div class="kpi-value">${fmt(cotAprobada?.total_cliente || 0)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Costo total RQs</div>
        <div class="kpi-value">${fmt(totalRQs)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Margen real</div>
        <div class="kpi-value">${fmtPct(liquidacion?.margen_real_pct || 0)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Total facturado</div>
        <div class="kpi-value">${fmt(totalFacturado)}</div>
      </div>
    </div>
  </div>

  <!-- Cotización aprobada -->
  ${cotAprobada ? `
  <div class="section">
    <div class="section-title">Cotización aprobada — V${cotAprobada.version}</div>
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Descripción</th>
          <th style="text-align:right">Costo</th>
          <th style="text-align:center">Margen</th>
          <th style="text-align:right">Precio cliente</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.descripcion || "—"}</td>
          <td style="text-align:right">${fmt(item.costo_total || 0)}</td>
          <td style="text-align:center">${fmtPct(item.margen_pct || 0)}</td>
          <td style="text-align:right;font-weight:700">${fmt(item.precio_cliente || 0)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="total-box">
      <span class="total-label">TOTAL CLIENTE (inc. IGV)</span>
      <span class="total-value">${fmt(cotAprobada.total_cliente || 0)}</span>
    </div>
  </div>` : ""}

  <!-- RQs -->
  ${rqs && rqs.length > 0 ? `
  <div class="section">
    <div class="section-title">Requerimientos de pago (${rqs.length})</div>
    <table>
      <thead>
        <tr>
          <th>N° RQ</th>
          <th>Descripción</th>
          <th>Proveedor</th>
          <th style="text-align:right">Monto</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${(rqs as any[]).map((rq: any) => `
        <tr>
          <td style="font-family:monospace">${rq.numero_rq || "—"}</td>
          <td>${rq.descripcion || "—"}</td>
          <td>${rq.proveedor_nombre || "—"}</td>
          <td style="text-align:right;font-weight:700">${fmt(rq.monto_solicitado || 0)}</td>
          <td><span class="badge badge-${rq.estado === "pagado" ? "green" : rq.estado === "aprobado" ? "blue" : "yellow"}">${rq.estado}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div style="text-align:right;margin-top:8px;font-size:12px;font-weight:700;color:#1D2040">
      Total RQs: ${fmt(totalRQs)}
    </div>
  </div>` : ""}

  <!-- Liquidación -->
  ${liquidacion ? `
  <div class="section">
    <div class="section-title">Liquidación ${liquidacion.cerrada ? "✓ Cerrada" : "Abierta"}</div>
    <div class="grid-3" style="margin-bottom:12px">
      ${[
        { label: "Costo presupuestado", value: fmt(liquidacion.costo_presupuestado || 0) },
        { label: "Costo real", value: fmt(liquidacion.costo_real || 0) },
        { label: "Desvío costo", value: fmt(liquidacion.desvio_costo || 0), cls: (liquidacion.desvio_costo || 0) > 0 ? "desvio-neg" : "desvio-pos" },
        { label: "Margen presupuestado", value: fmtPct(liquidacion.margen_presupuestado_pct || 0) },
        { label: "Margen real", value: fmtPct(liquidacion.margen_real_pct || 0) },
        { label: "Desvío margen", value: fmtPct(liquidacion.desvio_margen_pp || 0), cls: (liquidacion.desvio_margen_pp || 0) >= 0 ? "desvio-pos" : "desvio-neg" },
      ].map(t => `<div class="info-box"><div class="info-label">${t.label}</div><div class="info-value ${t.cls || ""}">${t.value}</div></div>`).join("")}
    </div>
    ${liqItems.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Ítem</th>
          <th style="text-align:right">Presupuestado</th>
          <th style="text-align:right">Real</th>
          <th style="text-align:right">Desvío</th>
          <th style="text-align:right">Desvío %</th>
        </tr>
      </thead>
      <tbody>
        ${(liqItems as any[]).map((item: any) => `
        <tr>
          <td>${item.descripcion || "—"}</td>
          <td style="text-align:right">${fmt(item.costo_presupuestado || 0)}</td>
          <td style="text-align:right">${fmt(item.costo_real || 0)}</td>
          <td style="text-align:right" class="${(item.desvio || 0) > 0 ? "desvio-neg" : "desvio-pos"}">${fmt(item.desvio || 0)}</td>
          <td style="text-align:right" class="${(item.desvio_pct || 0) > 0 ? "desvio-neg" : "desvio-pos"}">${fmtPct(item.desvio_pct || 0)}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
  </div>` : ""}

  <!-- Facturas -->
  ${facturas && facturas.length > 0 ? `
  <div class="section">
    <div class="section-title">Facturación</div>
    <table>
      <thead>
        <tr>
          <th>N° Factura</th>
          <th style="text-align:right">Subtotal</th>
          <th style="text-align:right">IGV</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">A cobrar</th>
          <th>Estado</th>
          <th>Emisión</th>
        </tr>
      </thead>
      <tbody>
        ${(facturas as any[]).map((f: any) => `
        <tr>
          <td style="font-weight:700">${f.numero_factura}</td>
          <td style="text-align:right">${fmt(f.subtotal || 0)}</td>
          <td style="text-align:right">${fmt(f.igv || 0)}</td>
          <td style="text-align:right;font-weight:700">${fmt((f.subtotal || 0) + (f.igv || 0))}</td>
          <td style="text-align:right;font-weight:700;color:#0F6E56">${fmt(f.monto_final_abonado || 0)}</td>
          <td><span class="badge badge-${f.estado === "cobrada" ? "green" : f.estado === "emitida" ? "blue" : "gray"}">${f.estado}</span></td>
          <td>${f.fecha_emision || "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div style="text-align:right;margin-top:8px;font-size:12px;font-weight:700;color:#0F6E56">
      Total facturado: ${fmt(totalFacturado)}
    </div>
  </div>` : ""}

</div>

<div class="footer">
  <span class="footer-text">Izango 360 S.A.C. · RUC 20600487583 · jsosa@izango.com.pe · 987 627 997</span>
  <span class="footer-text">${proyecto?.codigo} — Reporte generado el ${new Date().toLocaleDateString("es-PE")}</span>
</div>

</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}