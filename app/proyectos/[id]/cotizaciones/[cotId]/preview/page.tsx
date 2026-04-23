"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams } from "next/navigation"

const AGENCIA = {
  peru: {
    nombre: "Izango 360 S.A.C.",
    ruc: "20600487583",
    direccion: "Jiron Los Rosales 240, San Luis, Lima",
    contacto: "Jose Manuel Sosa Canessa",
    cargo: "Director Comercial",
    celular: "987 627 997",
    email: "jsosa@izango.com.pe",
    banco: "BCP",
    tipo_cuenta: "Corriente Soles",
    numero_cuenta: "390-2247794-0-81",
    cci: "002-390002247794081-35",
    cuenta_detraccion: "000-14062335",
  },
  selva: {
    nombre: "Izango Selva 360 S.A.C.",
    ruc: "20607083721",
    direccion: "Cal. los Claveles Nro. 157, Maynas, Loreto",
    contacto: "Jose Manuel Sosa Canessa",
    cargo: "Director Comercial",
    celular: "987 627 997",
    email: "jsosa@izango.com.pe",
    banco: "BCP",
    tipo_cuenta: "Corriente Soles",
    numero_cuenta: "194-9396704-0-99",
    cci: "002-19400939670409-994",
    cuenta_detraccion: "000-14062335",
  }
}

const LOGO_URL = "https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png"
const COLOR_PRIMARY = "#03E373"
const COLOR_DARK = "#1D2040"

export default function PreviewCotizacionPage() {
  const rawParams = useParams()
  const id = rawParams?.id as string
  const cotId = rawParams?.cotId as string
  const supabase = createClient()
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [proyecto, setProyecto] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [entidad, setEntidad] = useState<"peru" | "selva">("peru")

  useEffect(() => {
    if (!cotId) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from("perfiles").select("entidad").eq("id", user.id).single()
        if (p?.entidad) setEntidad(p.entidad)
      }
      const { data: cot } = await supabase.from("cotizaciones")
        .select("*, proyecto:proyectos(id,nombre,codigo,cliente:clientes(razon_social,ruc,direccion,nombre_contacto,email_contacto,telefono_contacto))")
        .eq("id", cotId).single()
      setCotizacion(cot)
      setProyecto(cot?.proyecto)
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotId).order("orden")
      setItems(its || [])
      setLoading(false)
    }
    load()
  }, [cotId])

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const today = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  const ag = AGENCIA[entidad]
  const feePct = cotizacion?.fee_activo ? (cotizacion?.fee_agencia_pct || 0) : 0
  const igvPct = cotizacion?.igv_pct || 18
  const totalPrecioCliente = items.reduce((s, i) => s + (i.precio_cliente || 0), 0)
  const feeMonto = totalPrecioCliente * (feePct / 100)
  const subtotalConFee = totalPrecioCliente + feeMonto
  const igvMonto = subtotalConFee * (igvPct / 100)
  const totalFinal = subtotalConFee + igvMonto

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", padding: "20px 0 40px" }}>
      {/* Toolbar */}
      <div style={{ maxWidth: 900, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={"/proyectos/" + id + "/cotizaciones/" + cotId}
          style={{ fontSize: 13, color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          ← Volver al editor
        </a>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={entidad} onChange={e => setEntidad(e.target.value as any)}
            style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "#fff" }}>
            <option value="peru">Izango 360 SAC (Peru)</option>
            <option value="selva">Izango Selva 360 SAC</option>
          </select>
          <button onClick={() => window.print()}
            style={{ padding: "7px 16px", background: COLOR_PRIMARY, border: "none", borderRadius: 7, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Documento */}
      <div style={{ maxWidth: 900, margin: "0 auto", background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>

        {/* Header verde */}
        <div style={{ background: COLOR_PRIMARY, padding: "28px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={LOGO_URL} alt="Izango" style={{ height: 100, objectFit: "contain" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLOR_DARK, letterSpacing: "-0.5px" }}>PROFORMA</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLOR_DARK, marginTop: 2 }}>
              N° {proyecto?.codigo}-V{cotizacion?.version}
            </div>
            <div style={{ fontSize: 12, color: COLOR_DARK, opacity: 0.7, marginTop: 2 }}>Fecha: {today}</div>
            <div style={{ fontSize: 12, color: COLOR_DARK, opacity: 0.7 }}>Validez: {cotizacion?.validez_dias || 10} días</div>
          </div>
        </div>

        <div style={{ padding: "32px 40px" }}>

          {/* Info agencia y cliente */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 20px", borderLeft: "4px solid " + COLOR_PRIMARY }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>De</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLOR_DARK }}>{ag.nombre}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>RUC: {ag.ruc}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{ag.direccion}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{ag.contacto} · {ag.cargo}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>📱 {ag.celular} · ✉ {ag.email}</div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 20px", borderLeft: "4px solid #e2e8f0" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Para</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLOR_DARK }}>{proyecto?.cliente?.razon_social}</div>
              {proyecto?.cliente?.ruc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>RUC: {proyecto.cliente.ruc}</div>}
              {proyecto?.cliente?.direccion && <div style={{ fontSize: 12, color: "#64748b" }}>{proyecto.cliente.direccion}</div>}
              {proyecto?.cliente?.nombre_contacto && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Attn: {proyecto.cliente.nombre_contacto}</div>}
              {proyecto?.cliente?.email_contacto && <div style={{ fontSize: 12, color: "#64748b" }}>✉ {proyecto.cliente.email_contacto}</div>}
              <div style={{ fontSize: 13, fontWeight: 600, color: COLOR_DARK, marginTop: 6 }}>{proyecto?.nombre}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Condición: {cotizacion?.condicion_pago}</div>
            </div>
          </div>

          {/* Tabla items */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
            <thead>
              <tr style={{ background: COLOR_DARK }}>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#fff", width: 40 }}>N°</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#fff" }}>Descripción</th>
                <th style={{ textAlign: "center", padding: "10px 10px", fontSize: 11, fontWeight: 700, color: "#fff", width: 65 }}>Cant.</th>
                <th style={{ textAlign: "center", padding: "10px 10px", fontSize: 11, fontWeight: 700, color: "#fff", width: 65 }}>Días</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#fff", width: 130 }}>P. Unitario</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: COLOR_PRIMARY, width: 130 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "11px 12px", textAlign: "center", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: COLOR_DARK, fontWeight: 500 }}>{item.descripcion || "—"}</td>
                  <td style={{ padding: "11px 10px", textAlign: "center", fontSize: 13, color: "#475569" }}>{item.cantidad}</td>
                  <td style={{ padding: "11px 10px", textAlign: "center", fontSize: 13, color: "#475569" }}>{item.fechas}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, color: "#475569" }}>
                    {item.precio_cliente > 0 ? fmt(item.precio_cliente / (item.cantidad || 1)) : "—"}
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 14, fontWeight: 700, color: COLOR_DARK }}>
                    {item.precio_cliente > 0 ? fmt(item.precio_cliente) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
            <div style={{ width: 340 }}>
              {feePct > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Fee agencia ({feePct}%)</span>
                  <span style={{ fontSize: 13, color: "#475569" }}>{fmt(feeMonto)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Subtotal antes de IGV</span>
                <span style={{ fontSize: 13, color: "#475569" }}>{fmt(subtotalConFee)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>IGV ({igvPct}%)</span>
                <span style={{ fontSize: 13, color: "#475569" }}>{fmt(igvMonto)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", background: COLOR_DARK, borderRadius: 10, marginTop: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>TOTAL</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: COLOR_PRIMARY }}>{fmt(totalFinal)}</span>
              </div>
            </div>
          </div>

          {/* Datos bancarios */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "18px 24px", marginBottom: 24, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Datos para el pago
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Banco</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLOR_DARK }}>{ag.banco} · {ag.tipo_cuenta}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>N° Cuenta</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLOR_DARK }}>{ag.numero_cuenta}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>CCI</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLOR_DARK }}>{ag.cci}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Cuenta Detracción (Banco de la Nación)</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLOR_DARK }}>{ag.cuenta_detraccion}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "2px solid " + COLOR_PRIMARY, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Validez: {cotizacion?.validez_dias || 10} días calendario · {ag.nombre} · RUC {ag.ruc}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {ag.email} · {ag.celular}
            </div>
          </div>

        </div>
      </div>
    </div>
  )

}