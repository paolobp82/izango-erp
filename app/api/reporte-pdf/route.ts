import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedProfile, getErrorMessage } from "@/lib/auth-server"
import { canAccessProjectReport } from "@/lib/report-auth"
import { escapeHtml as h } from "@/lib/html"

type Project = {
  id: string
  codigo?: string | null
  nombre?: string | null
  estado?: string | null
  fecha_inicio?: string | null
  fecha_fin_estimada?: string | null
  presupuesto_referencial?: number | null
  productor_id?: string | null
  comercial_id?: string | null
  cliente?: { razon_social?: string | null; ruc?: string | null; nombre_contacto?: string | null } | null
  productor?: { nombre?: string | null; apellido?: string | null } | null
}

type Cotizacion = {
  estado?: string | null
  version?: number | string | null
  total_cliente?: number | null
  cotizacion_items?: Array<{ descripcion?: string | null; costo_total?: number | null; margen_pct?: number | null; precio_cliente?: number | null }>
}

type Rq = { numero_rq?: string | null; descripcion?: string | null; proveedor_nombre?: string | null; monto_solicitado?: number | null; estado?: string | null }
type Liquidacion = { margen_real_pct?: number | null; costo_presupuestado?: number | null; costo_real?: number | null; desvio_costo?: number | null; margen_presupuestado_pct?: number | null; desvio_margen_pp?: number | null; cerrada?: boolean | null }
type Factura = { numero_factura?: string | null; subtotal?: number | null; igv?: number | null; estado?: string | null; fecha_emision?: string | null }

const htmlHeaders = { "Content-Type": "text/html; charset=utf-8" }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const proyectoId = searchParams.get("proyecto_id")
  if (!proyectoId) return NextResponse.json({ error: "proyecto_id requerido" }, { status: 400 })

  try {
    const auth = await getAuthenticatedProfile()
    if (auth.error) return auth.error

    const supabase = auth.supabase
    const { data: proyecto } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social,ruc,nombre_contacto), productor:perfiles!productor_id(nombre,apellido)")
      .eq("id", proyectoId)
      .single<Project>()

    if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 })
    if (!canAccessProjectReport(auth.profile, proyecto)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }

    const [{ data: cotizaciones }, { data: rqs }, { data: liquidacion }, { data: facturas }] = await Promise.all([
      supabase.from("cotizaciones").select("*, cotizacion_items(*)").eq("proyecto_id", proyectoId).order("version").returns<Cotizacion[]>(),
      supabase.from("requerimientos_pago").select("numero_rq,descripcion,proveedor_nombre,monto_solicitado,estado").eq("proyecto_id", proyectoId).order("created_at").returns<Rq[]>(),
      supabase.from("liquidaciones").select("costo_presupuestado,costo_real,desvio_costo,margen_presupuestado_pct,margen_real_pct,desvio_margen_pp,cerrada").eq("proyecto_id", proyectoId).maybeSingle<Liquidacion>(),
      supabase.from("facturas").select("numero_factura,subtotal,igv,estado,fecha_emision").eq("proyecto_id", proyectoId).returns<Factura[]>(),
    ])

    const cotAprobada = cotizaciones?.find((c) => c.estado === "aprobada_cliente") || cotizaciones?.[cotizaciones.length - 1]
    const items = cotAprobada?.cotizacion_items || []
    const totalRQs = (rqs || []).reduce((sum, rq) => sum + Number(rq.monto_solicitado || 0), 0)
    const totalFacturado = (facturas || []).reduce((sum, f) => sum + Number(f.subtotal || 0) + Number(f.igv || 0), 0)
    const fmt = (n: unknown) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const pct = (n: unknown) => Number(n || 0).toFixed(1) + "%"
    const today = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })

    const itemRows = items.map((item, index) => `<tr>
      <td>${index + 1}</td>
      <td>${h(item.descripcion || "—")}</td>
      <td class="right">${h(fmt(item.costo_total))}</td>
      <td class="right">${h(pct(item.margen_pct))}</td>
      <td class="right strong">${h(fmt(item.precio_cliente))}</td>
    </tr>`).join("")

    const rqRows = (rqs || []).map((rq) => `<tr>
      <td>${h(rq.numero_rq || "—")}</td>
      <td>${h(rq.descripcion || "—")}</td>
      <td>${h(rq.proveedor_nombre || "—")}</td>
      <td class="right strong">${h(fmt(rq.monto_solicitado))}</td>
      <td>${h(rq.estado || "—")}</td>
    </tr>`).join("")

    const facturaRows = (facturas || []).map((factura) => `<tr>
      <td>${h(factura.numero_factura || "—")}</td>
      <td class="right">${h(fmt(factura.subtotal))}</td>
      <td class="right">${h(fmt(factura.igv))}</td>
      <td class="right strong">${h(fmt(Number(factura.subtotal || 0) + Number(factura.igv || 0)))}</td>
      <td>${h(factura.estado || "—")}</td>
      <td>${h(factura.fecha_emision || "—")}</td>
    </tr>`).join("")

    const productor = proyecto.productor ? `${proyecto.productor.nombre || ""} ${proyecto.productor.apellido || ""}`.trim() : "—"
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;color:#1D2040;font-size:12px;margin:0;background:#fff}
      .header{background:#03E373;padding:24px 32px;display:flex;justify-content:space-between;gap:20px}
      .body{padding:24px 32px}.section{margin-bottom:22px}.title{font-size:13px;font-weight:700;color:#0F6E56;text-transform:uppercase;border-bottom:2px solid #03E373;padding-bottom:6px;margin-bottom:12px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.box{background:#f8fafc;border-left:3px solid #03E373;border-radius:8px;padding:12px}
      .label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}.value{font-size:13px;font-weight:700;margin-top:4px}
      table{width:100%;border-collapse:collapse}th{background:#1D2040;color:#fff;text-align:left;padding:8px;font-size:10px}td{border-bottom:1px solid #f1f5f9;padding:8px}.right{text-align:right}.strong{font-weight:700}
      .footer{background:#f8fafc;border-top:2px solid #03E373;padding:12px 32px;font-size:10px;color:#64748b}
    </style></head><body>
      <div class="header">
        <div><h1>REPORTE DE PROYECTO</h1><p>Izango 360 S.A.C. · Generado: ${h(today)}</p></div>
        <div style="text-align:right"><h2>${h(proyecto.codigo || "—")}</h2><p>${h(proyecto.nombre || "")}</p></div>
      </div>
      <div class="body">
        <div class="section"><div class="title">Informacion del proyecto</div><div class="grid">
          <div class="box"><div class="label">Cliente</div><div class="value">${h(proyecto.cliente?.razon_social || "—")}</div><div>${h(proyecto.cliente?.ruc || "")}</div></div>
          <div class="box"><div class="label">Productor</div><div class="value">${h(productor)}</div><div>${h(proyecto.estado || "—")}</div></div>
          <div class="box"><div class="label">Fechas</div><div class="value">${h(proyecto.fecha_inicio || "—")} / ${h(proyecto.fecha_fin_estimada || "—")}</div></div>
        </div></div>
        <div class="section"><div class="title">Resumen financiero</div><div class="grid">
          <div class="box"><div class="label">Total cotizado</div><div class="value">${h(fmt(cotAprobada?.total_cliente))}</div></div>
          <div class="box"><div class="label">Costo RQs</div><div class="value">${h(fmt(totalRQs))}</div></div>
          <div class="box"><div class="label">Total facturado</div><div class="value">${h(fmt(totalFacturado))}</div></div>
        </div></div>
        ${cotAprobada ? `<div class="section"><div class="title">Cotizacion aprobada V${h(cotAprobada.version || "—")}</div><table><thead><tr><th>#</th><th>Descripcion</th><th class="right">Costo</th><th class="right">Margen</th><th class="right">Precio</th></tr></thead><tbody>${itemRows}</tbody></table></div>` : ""}
        ${(rqs || []).length ? `<div class="section"><div class="title">Requerimientos de pago</div><table><thead><tr><th>RQ</th><th>Descripcion</th><th>Proveedor</th><th class="right">Monto</th><th>Estado</th></tr></thead><tbody>${rqRows}</tbody></table><p class="right strong">Total RQs: ${h(fmt(totalRQs))}</p></div>` : ""}
        ${liquidacion ? `<div class="section"><div class="title">Liquidacion ${liquidacion.cerrada ? "cerrada" : "abierta"}</div><div class="grid">
          <div class="box"><div class="label">Costo presupuestado</div><div class="value">${h(fmt(liquidacion.costo_presupuestado))}</div></div>
          <div class="box"><div class="label">Costo real</div><div class="value">${h(fmt(liquidacion.costo_real))}</div></div>
          <div class="box"><div class="label">Margen real</div><div class="value">${h(pct(liquidacion.margen_real_pct))}</div></div>
        </div></div>` : ""}
        ${(facturas || []).length ? `<div class="section"><div class="title">Facturacion</div><table><thead><tr><th>Factura</th><th class="right">Subtotal</th><th class="right">IGV</th><th class="right">Total</th><th>Estado</th><th>Emision</th></tr></thead><tbody>${facturaRows}</tbody></table></div>` : ""}
      </div>
      <div class="footer">Izango 360 S.A.C. · ${h(proyecto.codigo || "—")} · ${h(today)}</div>
    </body></html>`

    return new NextResponse(html, { headers: htmlHeaders })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
