"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { mapRQPToTreasuryPayment } from "@/lib/services/treasury"
import type { TreasuryPaymentItem } from "@/lib/domain/treasury"

const estadoLabel: Record<string, string> = {
  sin_programar: "Sin programar",
  programado: "Programado",
  vence_hoy: "Vence hoy",
  vencido: "Vencido",
  pagado: "Pagado",
  anulado: "Anulado",
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function fmtDate(value?: string | null) {
  if (!value) return "—"
  return String(value).slice(0, 10)
}

export default function TesoreriaPage() {
  const supabase = createClient()
  const [items, setItems] = useState<TreasuryPaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  async function load() {
    setLoading(true)
    setErrorMsg("")

    const { data, error } = await supabase
      .from("requerimientos_pago")
      .select(`
        id,
        codigo_rq,
        numero_rq,
        proveedor_nombre,
        monto_solicitado,
        tipo_pago,
        condicion_comercial,
        medio_pago,
        tipo_transferencia,
        fecha_necesidad_pago,
        fecha_programada_pago,
        fecha_pago,
        estado,
        proyecto:proyectos(id, nombre, codigo)
      `)
      .not("estado", "in", '("cancelado","rechazado")')
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      setErrorMsg(error.message)
      setItems([])
      setLoading(false)
      return
    }

    setItems((data || []).map(mapRQPToTreasuryPayment))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const resumen = useMemo(() => {
    return {
      total: items.length,
      vencidos: items.filter(i => i.estado_pago === "vencido").length,
      hoy: items.filter(i => i.estado_pago === "vence_hoy").length,
      programados: items.filter(i => i.estado_pago === "programado").length,
      montoPendiente: items
        .filter(i => i.estado_pago !== "pagado" && i.estado_pago !== "anulado")
        .reduce((sum, i) => sum + Number(i.monto || 0), 0),
    }
  }, [items])

  return (
    <main style={{ padding: 24, display: "grid", gap: 18 }}>
      <div>
        <Link href="/finanzas" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
          ← Finanzas
        </Link>
        <h1 style={{ margin: "10px 0 4px", fontSize: 28, fontWeight: 800, color: "#111827" }}>
          Tesorería
        </h1>
        <p style={{ margin: 0, color: "#6b7280", maxWidth: 820 }}>
          Bandeja operativa de pagos. Primera versión conectada a RQP en modo lectura.
        </p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={cardStyle}><strong>{resumen.total}</strong><span>Total pagos</span></div>
        <div style={cardStyle}><strong>{resumen.vencidos}</strong><span>Vencidos</span></div>
        <div style={cardStyle}><strong>{resumen.hoy}</strong><span>Vencen hoy</span></div>
        <div style={cardStyle}><strong>{resumen.programados}</strong><span>Programados</span></div>
        <div style={cardStyle}><strong>{fmtMoney(resumen.montoPendiente)}</strong><span>Monto pendiente</span></div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Bandeja de Pagos</h2>
          <button onClick={load} disabled={loading} style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: 14, color: "#991b1b", background: "#fef2f2", fontSize: 13 }}>
            Error cargando Tesorería: {errorMsg}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#f9fafb", color: "#6b7280" }}>
              <tr>
                <th style={th}>Origen</th>
                <th style={th}>Documento</th>
                <th style={th}>Beneficiario</th>
                <th style={th}>Proyecto</th>
                <th style={th}>F. Necesidad</th>
                <th style={th}>F. Programada</th>
                <th style={th}>Estado</th>
                <th style={thRight}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={`${item.origen}-${item.id}`} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={td}>{item.origen.toUpperCase()}</td>
                  <td style={td}>{item.documento}</td>
                  <td style={td}>{item.beneficiario || "—"}</td>
                  <td style={td}>{item.proyecto || "—"}</td>
                  <td style={td}>{fmtDate(item.fecha_necesidad_pago)}</td>
                  <td style={td}>{fmtDate(item.fecha_programada_pago)}</td>
                  <td style={td}>
                    <span style={{ border: "1px solid #d1d5db", borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap" }}>
                      {estadoLabel[item.estado_pago] || item.estado_pago}
                    </span>
                  </td>
                  <td style={tdRight}>{fmtMoney(item.monto)}</td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>
                    No hay pagos para mostrar.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>
                    Cargando pagos...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "white",
  display: "grid",
  gap: 4,
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 700,
  fontSize: 11,
}

const thRight: React.CSSProperties = {
  ...th,
  textAlign: "right",
}

const td: React.CSSProperties = {
  padding: "11px 12px",
  color: "#374151",
}

const tdRight: React.CSSProperties = {
  ...td,
  textAlign: "right",
  fontWeight: 700,
}
