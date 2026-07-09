"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type RQPFinanciero = {
  id: string
  monto_solicitado: number | null
  fecha_necesidad_pago?: string | null
  fecha_programada_pago?: string | null
  fecha_pago?: string | null
  created_at?: string | null
  estado?: string | null
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function ymd(value?: string | null) {
  return value ? String(value).slice(0, 10) : ""
}

function money(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export default function DashboardFinancieroPage() {
  const supabase = createClient()
  const [rqs, setRqs] = useState<RQPFinanciero[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  async function load() {
    setLoading(true)
    setErrorMsg("")

    const { data, error } = await supabase
      .from("requerimientos_pago")
      .select("id,monto_solicitado,fecha_necesidad_pago,fecha_programada_pago,fecha_pago,created_at,estado")
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      setErrorMsg(error.message)
      setRqs([])
      setLoading(false)
      return
    }

    setRqs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const kpi = useMemo(() => {
    const hoy = todayYmd()
    const activos = rqs.filter(r => !["cancelado", "rechazado"].includes(String(r.estado || "")))

    const pagosProgramadosHoy = activos
      .filter(r => ymd(r.fecha_programada_pago) === hoy)
      .reduce((sum, r) => sum + Number(r.monto_solicitado || 0), 0)

    const pagosEjecutadosHoy = activos
      .filter(r => ymd(r.fecha_pago) === hoy)
      .reduce((sum, r) => sum + Number(r.monto_solicitado || 0), 0)

    const produccionDia = activos
      .filter(r => ymd(r.created_at) === hoy)
      .reduce((sum, r) => sum + Number(r.monto_solicitado || 0), 0)

    const pagosVencidos = activos
      .filter(r => !r.fecha_pago)
      .filter(r => {
        const fecha = ymd(r.fecha_programada_pago) || ymd(r.fecha_necesidad_pago)
        return fecha && fecha < hoy
      })

    const montoVencido = pagosVencidos.reduce((sum, r) => sum + Number(r.monto_solicitado || 0), 0)

    const cajaInicialTotal = 0
    const ingresosEsperadosHoy = 0
    const ingresosConfirmadosHoy = 0
    const cajaDisponibleActual = cajaInicialTotal + ingresosConfirmadosHoy - pagosEjecutadosHoy
    const cajaFinalProyectada = cajaInicialTotal + ingresosEsperadosHoy - pagosProgramadosHoy
    const necesidadFondeo = Math.max(0, pagosProgramadosHoy - cajaDisponibleActual)
    const transferenciaRecomendada = necesidadFondeo
    const liquidezGrupo = cajaDisponibleActual

    return {
      cajaInicialTotal,
      ingresosEsperadosHoy,
      ingresosConfirmadosHoy,
      pagosProgramadosHoy,
      pagosEjecutadosHoy,
      produccionDia,
      cajaDisponibleActual,
      cajaFinalProyectada,
      necesidadFondeo,
      transferenciaRecomendada,
      liquidezGrupo,
      pagosVencidos: pagosVencidos.length,
      montoVencido,
    }
  }, [rqs])

  const cards = [
    ["Caja inicial total", money(kpi.cajaInicialTotal)],
    ["Ingresos esperados hoy", money(kpi.ingresosEsperadosHoy)],
    ["Ingresos confirmados hoy", money(kpi.ingresosConfirmadosHoy)],
    ["Pagos programados hoy", money(kpi.pagosProgramadosHoy)],
    ["Pagos ejecutados hoy", money(kpi.pagosEjecutadosHoy)],
    ["Producción del día", money(kpi.produccionDia)],
    ["Caja disponible actual", money(kpi.cajaDisponibleActual)],
    ["Caja final proyectada", money(kpi.cajaFinalProyectada)],
    ["Necesidad de fondeo", money(kpi.necesidadFondeo)],
    ["Transferencia recomendada", money(kpi.transferenciaRecomendada)],
    ["Liquidez del grupo", money(kpi.liquidezGrupo)],
    ["Pagos vencidos", `${kpi.pagosVencidos} / ${money(kpi.montoVencido)}`],
  ]

  return (
    <main style={{ padding: 24, display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "#111827" }}>
            Dashboard Financiero
          </h1>
          <p style={{ margin: 0, color: "#6b7280", maxWidth: 880 }}>
            Primera base ejecutiva. RQP ya alimenta pagos, vencidos y producción del día. Ingresos, caja inicial y liquidez quedarán conectados al Flujo Ejecutivo y CxC.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/finanzas/tesoreria" style={buttonLink}>Tesorería</Link>
          <Link href="/finanzas/flujo-ejecutivo" style={buttonLink}>Flujo Ejecutivo</Link>
          <Link href="/finanzas/cuentas-por-pagar" style={buttonLink}>CxP</Link>
          <Link href="/prestamos" style={buttonLink}>Obligaciones</Link>
          <button onClick={load} disabled={loading} style={button}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: 14, borderRadius: 12, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
          Error cargando dashboard financiero: {errorMsg}
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {cards.map(([label, value]) => (
          <article key={label} style={card}>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{label}</span>
            <strong style={{ color: "#111827", fontSize: 20 }}>{value}</strong>
          </article>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <article style={panel}>
          <h2 style={panelTitle}>Izango 360</h2>
          <p style={panelText}>Caja y pagos operativos principales. Conectado parcialmente vía RQP.</p>
        </article>

        <article style={panel}>
          <h2 style={panelTitle}>Izango Selva</h2>
          <p style={panelText}>Pendiente de conectar a parámetros de caja y flujo ejecutivo.</p>
        </article>

        <article style={panel}>
          <h2 style={panelTitle}>Caja Chica</h2>
          <p style={panelText}>Pendiente de integrar como origen independiente de Tesorería.</p>
        </article>

        <article style={panel}>
          <h2 style={panelTitle}>Consolidado</h2>
          <p style={panelText}>Agrupará Izango 360, Izango Selva y Caja Chica.</p>
        </article>
      </section>
    </main>
  )
}

const card: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "white",
  display: "grid",
  gap: 6,
}

const panel: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
  background: "white",
}

const panelTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 16,
  color: "#111827",
}

const panelText: CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: 13,
  lineHeight: 1.45,
}

const button: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "white",
  borderRadius: 8,
  padding: "8px 11px",
  cursor: "pointer",
  fontSize: 13,
}

const buttonLink: CSSProperties = {
  ...button,
  textDecoration: "none",
  color: "#111827",
}





