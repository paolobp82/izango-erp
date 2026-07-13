"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type RQPFlujo = {
  id: string
  codigo_rq?: string | null
  numero_rq?: string | null
  proveedor_nombre?: string | null
  monto_solicitado?: number | null
  fecha_necesidad_pago?: string | null
  fecha_programada_pago?: string | null
  fecha_pago?: string | null
  created_at?: string | null
  estado?: string | null
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

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function FlujoEjecutivoPage() {
  const supabase = createClient()
  const [rqs, setRqs] = useState<RQPFlujo[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [fechaBase, setFechaBase] = useState(new Date().toISOString().slice(0, 10))

  async function load() {
    setLoading(true)
    setErrorMsg("")

    const { data, error } = await supabase
      .from("requerimientos_pago")
      .select("id,codigo_rq,numero_rq,proveedor_nombre,monto_solicitado,fecha_necesidad_pago,fecha_programada_pago,fecha_pago,created_at,estado")
      .order("created_at", { ascending: false })
      .limit(800)

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

  const dias = useMemo(() => {
    const base = new Date(`${fechaBase}T00:00:00`)
    return Array.from({ length: 7 }, (_, i) => addDays(base, i))
  }, [fechaBase])

  const filas = useMemo(() => {
    const activos = rqs.filter(r => !["cancelado", "rechazado"].includes(String(r.estado || "")))

    return dias.map(dia => {
      const pagosProgramados = activos
        .filter(r => !r.fecha_pago)
        .filter(r => (ymd(r.fecha_programada_pago) || ymd(r.fecha_necesidad_pago)) === dia)

      const pagosEjecutados = activos.filter(r => ymd(r.fecha_pago) === dia)
      const produccionDia = activos.filter(r => ymd(r.created_at) === dia)

      const montoProgramado = pagosProgramados.reduce((sum, r) => sum + Number(r.monto_solicitado || 0), 0)
      const montoEjecutado = pagosEjecutados.reduce((sum, r) => sum + Number(r.monto_solicitado || 0), 0)
      const montoProduccion = produccionDia.reduce((sum, r) => sum + Number(r.monto_solicitado || 0), 0)

      const cajaInicial = 0
      const ingresosEsperados = 0
      const ingresosConfirmados = 0
      const cajaDisponible = cajaInicial + ingresosConfirmados - montoEjecutado
      const cajaFinal = cajaInicial + ingresosEsperados - montoProgramado
      const necesidadFondeo = Math.max(0, montoProgramado - cajaDisponible)

      return {
        dia,
        cajaInicial,
        ingresosEsperados,
        ingresosConfirmados,
        pagosProgramados: montoProgramado,
        pagosEjecutados: montoEjecutado,
        produccionDia: montoProduccion,
        cajaDisponible,
        cajaFinal,
        necesidadFondeo,
        cantidadProgramados: pagosProgramados.length,
        cantidadEjecutados: pagosEjecutados.length,
      }
    })
  }, [rqs, dias])

  return (
    <main style={{ padding: 24, display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
        <div>
          <Link href="/finanzas/dashboard" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
            ← Dashboard Financiero
          </Link>
          <h1 style={{ margin: "10px 0 4px", fontSize: 28, fontWeight: 800, color: "#111827" }}>
            Flujo Ejecutivo Diario
          </h1>
          <p style={{ margin: 0, color: "#6b7280", maxWidth: 860 }}>
            Vista diaria de pagos programados, pagos ejecutados, producción del día y necesidad de fondeo. Ingresos y caja inicial quedan listos para conexión con CxC y parámetros de caja.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={fechaBase} onChange={e => setFechaBase(e.target.value)} style={input} />
          <button onClick={load} disabled={loading} style={button}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: 14, borderRadius: 12, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
          Error cargando Flujo Ejecutivo: {errorMsg}
        </div>
      )}

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Vista 7 días</h2>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#f9fafb", color: "#6b7280" }}>
              <tr>
                <th style={th}>Día</th>
                <th style={thRight}>Caja inicial</th>
                <th style={thRight}>Ingresos esperados</th>
                <th style={thRight}>Ingresos confirmados</th>
                <th style={thRight}>Pagos programados</th>
                <th style={thRight}>Pagos ejecutados</th>
                <th style={thRight}>Producción</th>
                <th style={thRight}>Caja disponible</th>
                <th style={thRight}>Caja final</th>
                <th style={thRight}>Fondeo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(fila => (
                <tr key={fila.dia} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={td}>{fila.dia}</td>
                  <td style={tdRight}>{money(fila.cajaInicial)}</td>
                  <td style={tdRight}>{money(fila.ingresosEsperados)}</td>
                  <td style={tdRight}>{money(fila.ingresosConfirmados)}</td>
                  <td style={tdRight}>{money(fila.pagosProgramados)} <small>({fila.cantidadProgramados})</small></td>
                  <td style={tdRight}>{money(fila.pagosEjecutados)} <small>({fila.cantidadEjecutados})</small></td>
                  <td style={tdRight}>{money(fila.produccionDia)}</td>
                  <td style={tdRight}>{money(fila.cajaDisponible)}</td>
                  <td style={tdRight}>{money(fila.cajaFinal)}</td>
                  <td style={tdRight}>{money(fila.necesidadFondeo)}</td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={10} style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>
                    Cargando flujo ejecutivo...
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

const input: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
}

const button: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "white",
  borderRadius: 8,
  padding: "8px 11px",
  cursor: "pointer",
  fontSize: 13,
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 700,
  fontSize: 11,
  whiteSpace: "nowrap",
}

const thRight: CSSProperties = {
  ...th,
  textAlign: "right",
}

const td: CSSProperties = {
  padding: "11px 12px",
  color: "#374151",
  whiteSpace: "nowrap",
}

const tdRight: CSSProperties = {
  ...td,
  textAlign: "right",
  fontWeight: 700,
}
