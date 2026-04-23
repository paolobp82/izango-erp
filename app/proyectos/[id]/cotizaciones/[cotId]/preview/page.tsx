"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams } from "next/navigation"

export default function PreviewCotizacionPage() {
  const rawParams = useParams()
  const id = rawParams?.id as string
  const cotId = rawParams?.cotId as string
  const supabase = createClient()
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [proyecto, setProyecto] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cotId) return
    async function load() {
      const { data: cot } = await supabase.from("cotizaciones").select("*, proyecto:proyectos(id,nombre,codigo,cliente:clientes(razon_social,ruc))").eq("id", cotId).single()
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

  const feePct = cotizacion?.fee_activo ? (cotizacion?.fee_agencia_pct || 0) : 0
  const igvPct = cotizacion?.igv_pct || 18
  const totalPrecioCliente = items.reduce((s, i) => s + (i.precio_cliente || 0), 0)
  const feeMonto = totalPrecioCliente * (feePct / 100)
  const subtotalConFee = totalPrecioCliente + feeMonto
  const igvMonto = subtotalConFee * (igvPct / 100)
  const totalFinal = subtotalConFee + igvMonto

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href={"/proyectos/" + id + "/cotizaciones/" + cotId} style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Volver al editor</a>
          <span style={{ color: "#d1d5db" }}>|</span>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Vista previa — lo que verá el cliente</span>
        </div>
        <button onClick={() => window.print()} className="btn-primary" style={{ fontSize: 13 }}>Imprimir / PDF</button>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0F6E56" }}>IZANGO 360</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Agencia de BTL y Activaciones</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>PROFORMA N° {proyecto?.codigo}-V{cotizacion?.version}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Fecha: {today}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Validez: {cotizacion?.validez_dias || 10} días</div>
          </div>
        </div>

        <div style={{ height: 2, background: "#0F6E56", marginBottom: 24 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 6 }}>Cliente</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{proyecto?.cliente?.razon_social}</div>
            {proyecto?.cliente?.ruc && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>RUC: {proyecto.cliente.ruc}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 6 }}>Proyecto</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{proyecto?.nombre}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Condición: {cotizacion?.condicion_pago}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ background: "#0F6E56" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#fff" }}>N°</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#fff" }}>Descripción</th>
              <th style={{ textAlign: "center", padding: "10px", fontSize: 11, fontWeight: 700, color: "#fff", width: 70 }}>Cant.</th>
              <th style={{ textAlign: "center", padding: "10px", fontSize: 11, fontWeight: 700, color: "#fff", width: 70 }}>Días</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#fff", width: 130 }}>P. Unitario</th>
              <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#fff", width: 130 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, color: "#111827", fontWeight: 500 }}>{item.descripcion || "—"}</td>
                <td style={{ padding: "10px", textAlign: "center", fontSize: 13, color: "#374151" }}>{item.cantidad}</td>
                <td style={{ padding: "10px", textAlign: "center", fontSize: 13, color: "#374151" }}>{item.fechas}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, color: "#374151" }}>
                  {item.precio_cliente > 0 ? fmt(item.precio_cliente / (item.cantidad || 1)) : "—"}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#0F6E56" }}>
                  {item.precio_cliente > 0 ? fmt(item.precio_cliente) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 320 }}>
            {feePct > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Fee agencia ({feePct}%)</span>
                <span style={{ fontSize: 13, color: "#374151" }}>{fmt(feeMonto)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Subtotal antes IGV</span>
              <span style={{ fontSize: 13, color: "#374151" }}>{fmt(subtotalConFee)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>IGV ({igvPct}%)</span>
              <span style={{ fontSize: 13, color: "#374151" }}>{fmt(igvMonto)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#0F6E56", borderRadius: 8, marginTop: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>TOTAL</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{fmt(totalFinal)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
          <p style={{ margin: 0 }}>Validez: {cotizacion?.validez_dias || 10} días calendario desde su emisión.</p>
          <p style={{ margin: "4px 0 0" }}>Izango 360 S.A.C. · Lima, Perú</p>
        </div>
      </div>
    </div>
  )
}
