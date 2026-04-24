import { createClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const proyectoId = searchParams.get("proyecto_id")
  if (!proyectoId) return NextResponse.json({ error: "proyecto_id requerido" }, { status: 400 })
  try {
    const supabase = createClient()
    const [
      { data: proyecto },
      { data: cotizaciones },
      { data: rqs },
      { data: liquidacion },
      { data: facturas },
    ] = await Promise.all([
      supabase.from("proyectos").select("*, cliente:clientes(razon_social,ruc,nombre_contacto), productor:perfiles!productor_id(nombre,apellido)").eq("id", proyectoId).single(),
      supabase.from("cotizaciones").select("*, cotizacion_items(*)").eq("proyecto_id", proyectoId).order("version"),
      supabase.from("requerimientos_pago").select("*").eq("proyecto_id", proyectoId).order("created_at"),
      supabase.from("liquidaciones").select("*, liquidacion_items(*)").eq("proyecto_id", proyectoId).single(),
      supabase.from("facturas").select("*").eq("proyecto_id", proyectoId),
    ])
    const cotAprobada = cotizaciones?.find((c) => c.estado === "aprobada_cliente") || cotizaciones?.[cotizaciones.length-1]
    const items = cotAprobada?.cotizacion_items || []
    const liqItems = liquidacion?.liquidacion_items || []
    const fmt = (n) => "S/ " + Number(n||0).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2})
    const fmtPct = (n) => Number(n||0).toFixed(1) + "%"
    const totalRQs = (rqs||[]).reduce((s,r) => s+(r.monto_solicitado||0), 0)
    const totalFacturado = (facturas||[]).reduce((s,f) => s+((f.subtotal||0)+(f.igv||0)), 0)
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#1D2040}
    .header{background:#03E373;padding:24px 32px;display:flex;justify-content:space-between;align-items:center}
    .header h1{font-size:22px;font-weight:800;color:#1D2040}.header p{font-size:11px;color:#1D2040;opacity:.7}
    .body{padding:24px 32px}.section{margin-bottom:24px}
    .section-title{font-size:13px;font-weight:700;color:#0F6E56;text-transform:uppercase;border-bottom:2px solid #03E373;padding-bottom:6px;margin-bottom:12px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
    .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .box{background:#f8fafc;border-radius:8px;padding:12px 16px;border-left:3px solid #03E373}
    .label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px}
    .value{font-size:13px;font-weight:600;color:#1D2040}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#1D2040;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#f8fafc}
    .total{background:#1D2040;color:#fff;padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;margin-top:8px}
    .total-v{font-size:20px;font-weight:800;color:#03E373}
    .footer{background:#f8fafc;border-top:2px solid #03E373;padding:12px 32px;display:flex;justify-content:space-between;margin-top:24px}
    .footer span{font-size:10px;color:#94a3b8}
    .neg{color:#dc2626;font-weight:700}.pos{color:#15803d;font-weight:700}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <div class="header">
      <div><h1>REPORTE DE PROYECTO</h1><p>Izango 360 S.A.C. · RUC 20600487583</p><p>Generado: ${new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"})}</p></div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:800;color:#1D2040">${proyecto?.codigo||"—"}</div><div style="font-size:13px;color:#1D2040">${proyecto?.nombre||""}</div></div>
    </div>
    <div class="body">
      <div class="section">
        <div class="section-title">Información del proyecto</div>
        <div class="grid-2">
          <div class="box"><div class="label">Cliente</div><div class="value">${proyecto?.cliente?.razon_social||"—"}</div>${proyecto?.cliente?.ruc?`<div style="font-size:11px;color:#64748b">RUC: ${proyecto.cliente.ruc}</div>`:""}</div>
          <div class="box"><div class="label">Productor</div><div class="value">${proyecto?.productor?proyecto.productor.nombre+" "+proyecto.productor.apellido:"—"}</div><div style="margin-top:6px"><div class="label">Estado</div><div class="value">${proyecto?.estado||"—"}</div></div></div>
        </div>
        <div class="grid-3" style="margin-top:12px">
          <div class="box"><div class="label">Fecha ejecución</div><div class="value">${proyecto?.fecha_inicio||"—"}</div></div>
          <div class="box"><div class="label">Fecha fin estimada</div><div class="value">${proyecto?.fecha_fin_estimada||"—"}</div></div>
          <div class="box"><div class="label">Presupuesto referencial</div><div class="value">${proyecto?.presupuesto_referencial?fmt(proyecto.presupuesto_referencial):"—"}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Resumen financiero</div>
        <div class="grid-4">
          <div class="box"><div class="label">Total cotizado</div><div class="value">${fmt(cotAprobada?.total_cliente||0)}</div></div>
          <div class="box"><div class="label">Costo RQs</div><div class="value">${fmt(totalRQs)}</div></div>
          <div class="box"><div class="label">Margen real</div><div class="value">${fmtPct(liquidacion?.margen_real_pct||0)}</div></div>
          <div class="box"><div class="label">Total facturado</div><div class="value">${fmt(totalFacturado)}</div></div>
        </div>
      </div>
      ${cotAprobada?`<div class="section"><div class="section-title">Cotización aprobada — V${cotAprobada.version}</div>
      <table><thead><tr><th>N°</th><th>Descripción</th><th style="text-align:right">Costo</th><th style="text-align:center">Margen</th><th style="text-align:right">Precio cliente</th></tr></thead>
      <tbody>${items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.descripcion||"—"}</td><td style="text-align:right">${fmt(it.costo_total||0)}</td><td style="text-align:center">${fmtPct(it.margen_pct||0)}</td><td style="text-align:right;font-weight:700">${fmt(it.precio_cliente||0)}</td></tr>`).join("")}</tbody></table>
      <div class="total"><span style="font-size:12px;font-weight:600">TOTAL CLIENTE (inc. IGV)</span><span class="total-v">${fmt(cotAprobada.total_cliente||0)}</span></div></div>`:""}
      ${rqs&&rqs.length>0?`<div class="section"><div class="section-title">Requerimientos de pago (${rqs.length})</div>
      <table><thead><tr><th>N° RQ</th><th>Descripción</th><th>Proveedor</th><th style="text-align:right">Monto</th><th>Estado</th></tr></thead>
      <tbody>${rqs.map(r=>`<tr><td style="font-family:monospace">${r.numero_rq||"—"}</td><td>${r.descripcion||"—"}</td><td>${r.proveedor_nombre||"—"}</td><td style="text-align:right;font-weight:700">${fmt(r.monto_solicitado||0)}</td><td>${r.estado}</td></tr>`).join("")}</tbody></table>
      <div style="text-align:right;margin-top:8px;font-size:12px;font-weight:700">Total RQs: ${fmt(totalRQs)}</div></div>`:""}
      ${liquidacion?`<div class="section"><div class="section-title">Liquidación ${liquidacion.cerrada?"✓ Cerrada":"Abierta"}</div>
      <div class="grid-3" style="margin-bottom:12px">
        <div class="box"><div class="label">Costo presupuestado</div><div class="value">${fmt(liquidacion.costo_presupuestado||0)}</div></div>
        <div class="box"><div class="label">Costo real</div><div class="value">${fmt(liquidacion.costo_real||0)}</div></div>
        <div class="box"><div class="label">Desvío costo</div><div class="value ${(liquidacion.desvio_costo||0)>0?"neg":"pos"}">${fmt(liquidacion.desvio_costo||0)}</div></div>
        <div class="box"><div class="label">Margen presupuestado</div><div class="value">${fmtPct(liquidacion.margen_presupuestado_pct||0)}</div></div>
        <div class="box"><div class="label">Margen real</div><div class="value">${fmtPct(liquidacion.margen_real_pct||0)}</div></div>
        <div class="box"><div class="label">Desvío margen</div><div class="value ${(liquidacion.desvio_margen_pp||0)>=0?"pos":"neg"}">${fmtPct(liquidacion.desvio_margen_pp||0)}</div></div>
      </div></div>`:""}
      ${facturas&&facturas.length>0?`<div class="section"><div class="section-title">Facturación</div>
      <table><thead><tr><th>N° Factura</th><th style="text-align:right">Subtotal</th><th style="text-align:right">IGV</th><th style="text-align:right">Total</th><th>Estado</th><th>Emisión</th></tr></thead>
      <tbody>${facturas.map(f=>`<tr><td style="font-weight:700">${f.numero_factura}</td><td style="text-align:right">${fmt(f.subtotal||0)}</td><td style="text-align:right">${fmt(f.igv||0)}</td><td style="text-align:right;font-weight:700;color:#0F6E56">${fmt((f.subtotal||0)+(f.igv||0))}</td><td>${f.estado}</td><td>${f.fecha_emision||"—"}</td></tr>`).join("")}</tbody></table>
      <div style="text-align:right;margin-top:8px;font-size:12px;font-weight:700;color:#0F6E56">Total facturado: ${fmt(totalFacturado)}</div></div>`:""}
    </div>
    <div class="footer"><span>Izango 360 S.A.C. · RUC 20600487583 · jsosa@izango.com.pe</span><span>${proyecto?.codigo} · ${new Date().toLocaleDateString("es-PE")}</span></div>
    </body></html>`
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
