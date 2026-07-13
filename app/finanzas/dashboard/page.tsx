"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import {
  buildFinancialDashboardModel,
  loadFinancialDashboardInputs,
  TREASURY_COMPANIES,
  type FinancialCompanySummary,
  type FinancialDashboardModel,
  type TreasuryCompany,
  type TreasuryLiquidityStatus,
} from "@/lib/services/treasury"

type BalanceDraft = Record<TreasuryCompany, {
  cuenta: string
  saldo_inicial: string
  nivel_minimo: string
  nivel_seguridad: string
}>

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function money(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function numberInput(value: number) {
  return Number(value || 0).toFixed(2)
}

function statusLabel(status: TreasuryLiquidityStatus | string) {
  const labels: Record<string, string> = {
    saludable: "Saludable",
    atencion: "Atención",
    deficit: "Déficit",
    sin_configurar: "Sin configurar",
    sin_datos: "Sin datos",
  }
  return labels[status] || status
}

function statusStyle(status: TreasuryLiquidityStatus | string): CSSProperties {
  const map: Record<string, CSSProperties> = {
    saludable: { background: "#dcfce7", color: "#166534" },
    atencion: { background: "#fef3c7", color: "#92400e" },
    deficit: { background: "#fee2e2", color: "#991b1b" },
    sin_configurar: { background: "#f1f5f9", color: "#475569" },
    sin_datos: { background: "#f1f5f9", color: "#475569" },
  }
  return map[status] || map.sin_datos
}

function buildDraft(model: FinancialDashboardModel | null): BalanceDraft {
  const draft = {} as BalanceDraft

  for (const empresa of TREASURY_COMPANIES) {
    const summary = model?.summaries.find(item => item.empresa === empresa)
    draft[empresa] = {
      cuenta: empresa === "Caja Chica" ? "Caja Chica" : empresa === "Izango Selva" ? "BCP Izango Selva" : "BCP Izango 360",
      saldo_inicial: summary?.hasBalance ? numberInput(summary.cajaInicial) : "",
      nivel_minimo: summary?.hasParameters ? numberInput(summary.nivelMinimo) : "0.00",
      nivel_seguridad: summary?.hasParameters ? numberInput(summary.nivelSeguridad) : "0.00",
    }
  }

  return draft
}

export default function DashboardFinancieroPage() {
  const supabase = useMemo(() => createClient(), [])
  const [fecha, setFecha] = useState(todayYmd())
  const [model, setModel] = useState<FinancialDashboardModel | null>(null)
  const [draft, setDraft] = useState<BalanceDraft>(() => buildDraft(null))
  const [loading, setLoading] = useState(true)
  const [savingBalances, setSavingBalances] = useState(false)
  const [savingClose, setSavingClose] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMsg("")
    setNotice("")

    try {
      const inputs = await loadFinancialDashboardInputs(supabase, fecha)
      const dashboardModel = buildFinancialDashboardModel(inputs)
      setModel(dashboardModel)
      setDraft(buildDraft(dashboardModel))
      if (inputs.errors.length > 0) {
        setErrorMsg(`No se pudieron cargar todos los datos financieros: ${inputs.errors.join(" | ")}`)
      }
    } catch (error) {
      setModel(null)
      setErrorMsg(error instanceof Error ? error.message : "No se pudo cargar el dashboard financiero")
    } finally {
      setLoading(false)
    }
  }, [fecha, supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  async function saveBalances() {
    setSavingBalances(true)
    setErrorMsg("")
    setNotice("")

    const { data: { user } } = await supabase.auth.getUser()
    const rows = TREASURY_COMPANIES.map(empresa => ({
      fecha,
      empresa,
      cuenta: draft[empresa].cuenta || "Principal",
      saldo_inicial: Number(draft[empresa].saldo_inicial || 0),
      nivel_minimo: Number(draft[empresa].nivel_minimo || 0),
      nivel_seguridad: Number(draft[empresa].nivel_seguridad || 0),
      fuente: "dashboard_financiero",
      created_by: user?.id || null,
    }))

    const { error } = await supabase
      .from("tesoreria_saldos_diarios")
      .upsert(rows, { onConflict: "fecha,empresa,cuenta" })

    if (error) {
      setErrorMsg(`No se pudieron guardar saldos diarios: ${error.message}`)
    } else {
      await registrarAccion({
        accion: "guardar_saldos_diarios",
        modulo: "dashboard_financiero",
        entidad_tipo: "tesoreria_saldos_diarios",
        descripcion: `Saldos diarios guardados para ${fecha}`,
        datos_nuevos: rows,
      })
      setNotice("Saldos diarios guardados correctamente.")
      await load()
    }

    setSavingBalances(false)
  }

  async function saveDailyClose() {
    if (!model) return
    if (!confirm(`Guardar cierre diario financiero para ${fecha}?`)) return
    setSavingClose(true)
    setErrorMsg("")
    setNotice("")

    const { data: { user } } = await supabase.auth.getUser()
    const rows = [...model.summaries, model.total].map(summary => ({
      fecha,
      empresa: summary.empresa,
      caja_inicial: summary.cajaInicial,
      ingresos_esperados: summary.ingresosEsperados,
      ingresos_confirmados: summary.ingresosConfirmados,
      pagos_programados: summary.pagosProgramados,
      pagos_ejecutados: summary.pagosEjecutados,
      produccion_dia: summary.produccionDia,
      caja_disponible: summary.cajaDisponible,
      caja_final_proyectada: summary.cajaFinalProyectada,
      necesidad_fondeo: summary.necesidadFondeo,
      estado_liquidez: summary.estadoLiquidez,
      excedente_necesidad: summary.excedenteNecesidad,
      snapshot: model,
      created_by: user?.id || null,
    }))

    const { error } = await supabase.from("tesoreria_cierres_diarios").insert(rows)

    if (error) {
      setErrorMsg(`No se pudo guardar el cierre diario: ${error.message}`)
    } else {
      await registrarAccion({
        accion: "guardar_cierre_diario",
        modulo: "dashboard_financiero",
        entidad_tipo: "tesoreria_cierres_diarios",
        descripcion: `Cierre diario financiero guardado para ${fecha}`,
        datos_nuevos: rows,
      })
      setNotice("Cierre diario guardado correctamente.")
      await load()
    }

    setSavingClose(false)
  }

  const cards = model ? [
    ["Caja inicial total", money(model.kpis.cajaInicialTotal), model.sources.balances > 0 ? "saldos configurados" : "sin saldos"],
    ["Ingresos esperados hoy", money(model.kpis.ingresosEsperadosHoy), "no suma caja proyectada"],
    ["Ingresos confirmados hoy", money(model.kpis.ingresosConfirmadosHoy), "cobrados/abonados"],
    ["Pagos programados hoy", money(model.kpis.pagosProgramadosHoy), "pendientes del día"],
    ["Pagos ejecutados hoy", money(model.kpis.pagosEjecutadosHoy), "con fecha real de pago"],
    ["Producción del día", money(model.kpis.produccionDia), "categoría producción"],
    ["Caja disponible ahora", money(model.kpis.cajaDisponibleAhora), "inicial + confirmado - ejecutado"],
    ["Caja final proyectada", money(model.kpis.cajaFinalProyectada), "inicial + confirmado - programado"],
    ["Necesidad de fondeo", money(model.kpis.necesidadFondeo), "déficit grupo"],
    ["Transferencia recomendada", money(model.kpis.transferenciaRecomendada), model.rebalance.message],
    ["Liquidez del grupo", statusLabel(model.kpis.liquidezGrupo), "estado consolidado"],
    ["Pagos vencidos", `${model.kpis.pagosVencidos} / ${money(model.kpis.montoVencido)}`, "pendientes anteriores"],
  ] : []

  return (
    <main style={{ padding: 24, display: "grid", gap: 16, fontSize: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div>
          <Link href="/finanzas" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>
            ← Finanzas
          </Link>
          <h1 style={{ margin: "10px 0 4px", fontSize: 24, fontWeight: 800, color: "#111827" }}>
            Dashboard Financiero
          </h1>
          <p style={{ margin: 0, color: "#64748b", maxWidth: 900, lineHeight: 1.45 }}>
            Control diario de caja, ingresos confirmados, pagos programados, rebalanceo y cierre financiero del grupo.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={fecha}
            onChange={event => setFecha(event.target.value || todayYmd())}
            style={input}
          />
          <button onClick={load} disabled={loading} style={button}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
          <button onClick={saveDailyClose} disabled={!model || savingClose} style={primaryButton}>
            {savingClose ? "Guardando..." : "Guardar cierre"}
          </button>
        </div>
      </header>

      {notice && <Notice type="ok" text={notice} />}
      {errorMsg && <Notice type="error" text={errorMsg} />}

      {!model && !loading && !errorMsg && (
        <Notice type="warning" text="No hay datos financieros para mostrar en la fecha seleccionada." />
      )}

      {model && (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {cards.map(([label, value, sub]) => (
              <article key={label} style={kpiCard}>
                <span style={kpiLabel}>{label}</span>
                <strong style={kpiValue}>{value}</strong>
                <small style={kpiSub}>{sub}</small>
              </article>
            ))}
          </section>

          <section style={section}>
            <div style={sectionHeader}>
              <div>
                <h2 style={sectionTitle}>Saldos diarios y niveles de seguridad</h2>
                <p style={sectionSubtitle}>Caja inicial por empresa. Si no se configura, el tablero distingue “sin datos” de un cero real.</p>
              </div>
              <button onClick={saveBalances} disabled={savingBalances} style={button}>
                {savingBalances ? "Guardando..." : "Guardar saldos"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Empresa</th>
                    <th style={th}>Cuenta</th>
                    <th style={thRight}>Caja inicial</th>
                    <th style={thRight}>Nivel mínimo</th>
                    <th style={thRight}>Nivel seguridad</th>
                  </tr>
                </thead>
                <tbody>
                  {TREASURY_COMPANIES.map(empresa => (
                    <tr key={empresa}>
                      <td style={td}>{empresa}</td>
                      <td style={td}>
                        <input
                          value={draft[empresa].cuenta}
                          onChange={event => setDraft(prev => ({ ...prev, [empresa]: { ...prev[empresa], cuenta: event.target.value } }))}
                          style={tableInput}
                        />
                      </td>
                      <td style={tdRight}>
                        <input
                          type="number"
                          value={draft[empresa].saldo_inicial}
                          onChange={event => setDraft(prev => ({ ...prev, [empresa]: { ...prev[empresa], saldo_inicial: event.target.value } }))}
                          style={tableInputRight}
                        />
                      </td>
                      <td style={tdRight}>
                        <input
                          type="number"
                          value={draft[empresa].nivel_minimo}
                          onChange={event => setDraft(prev => ({ ...prev, [empresa]: { ...prev[empresa], nivel_minimo: event.target.value } }))}
                          style={tableInputRight}
                        />
                      </td>
                      <td style={tdRight}>
                        <input
                          type="number"
                          value={draft[empresa].nivel_seguridad}
                          onChange={event => setDraft(prev => ({ ...prev, [empresa]: { ...prev[empresa], nivel_seguridad: event.target.value } }))}
                          style={tableInputRight}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={section}>
            <div style={sectionHeader}>
              <div>
                <h2 style={sectionTitle}>Consolidado del grupo</h2>
                <p style={sectionSubtitle}>Ingresos esperados se muestran, pero no entran a caja proyectada hasta confirmarse.</p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Empresa</th>
                    <th style={thRight}>Caja inicial</th>
                    <th style={thRight}>Ingresos confirmados</th>
                    <th style={thRight}>Ingresos esperados</th>
                    <th style={thRight}>Pagos programados</th>
                    <th style={thRight}>Pagos ejecutados</th>
                    <th style={thRight}>Caja disponible</th>
                    <th style={thRight}>Caja final</th>
                    <th style={th}>Estado</th>
                    <th style={thRight}>Excedente / necesidad</th>
                  </tr>
                </thead>
                <tbody>
                  {[...model.summaries, model.total].map(summary => (
                    <SummaryRow key={summary.empresa} summary={summary} isTotal={summary.empresa === "Total Grupo"} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 12 }}>
            <article style={section}>
              <h2 style={sectionTitle}>Rebalanceo recomendado</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <Metric label="Empresa en déficit" value={model.rebalance.to || "—"} />
                <Metric label="Empresa con excedente" value={model.rebalance.from || "—"} />
                <Metric label="Monto a transferir" value={money(model.rebalance.amount)} />
                <Metric label="Fondeo externo restante" value={money(model.rebalance.externalFunding)} />
                <p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.5 }}>{model.rebalance.message}</p>
              </div>
            </article>

            <article style={section}>
              <h2 style={sectionTitle}>Alertas de tesorería</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {model.alerts.map(alert => (
                  <div key={alert.title} style={{ ...alertBox, borderColor: alert.level === "critical" ? "#fecaca" : alert.level === "warning" ? "#fde68a" : "#bbf7d0" }}>
                    <strong style={{ color: "#0f172a" }}>{alert.title}</strong>
                    <span style={{ color: "#475569" }}>{alert.detail}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 12 }}>
            <article style={section}>
              <h2 style={sectionTitle}>Pagos por categoría</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {model.paymentsByCategory.map(item => (
                  <BarRow key={item.categoria} label={item.categoria} value={item.monto} max={Math.max(1, model.kpis.pagosProgramadosHoy)} />
                ))}
              </div>
            </article>

            <article style={section}>
              <h2 style={sectionTitle}>Producción vs otros gastos</h2>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <BarRow label="Producción" value={model.productionVsOther.produccion} max={Math.max(1, model.kpis.pagosProgramadosHoy)} color="#0F6E56" />
                <BarRow label="Otros gastos" value={model.productionVsOther.otros} max={Math.max(1, model.kpis.pagosProgramadosHoy)} color="#64748b" />
              </div>
              <p style={sectionSubtitle}>Los RQP se clasifican como Producción cuando no existe una categoría más específica.</p>
            </article>
          </section>

          <section style={section}>
            <div style={sectionHeader}>
              <div>
                <h2 style={sectionTitle}>Evolución histórica</h2>
                <p style={sectionSubtitle}>Cierres guardados más la proyección actual de referencia.</p>
              </div>
              <span style={{ color: "#64748b", fontSize: 12 }}>
                {model.sources.closes} cierres guardados
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Fecha</th>
                    <th style={th}>Empresa</th>
                    <th style={thRight}>Caja disponible</th>
                    <th style={thRight}>Caja final proyectada</th>
                    <th style={th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {model.history.slice(-24).map((item, index) => (
                    <tr key={`${item.fecha}-${item.empresa}-${index}`}>
                      <td style={td}>{item.fecha}</td>
                      <td style={td}>{item.empresa}</td>
                      <td style={tdRight}>{money(item.caja_disponible)}</td>
                      <td style={tdRight}>{money(item.caja_final_proyectada)}</td>
                      <td style={td}><StatusPill status={item.estado_liquidez} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ color: "#64748b", fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>Facturas leídas: {model.sources.invoices}</span>
            <span>Pagos consolidados: {model.sources.payments}</span>
            <span>Saldos configurados: {model.sources.balances}</span>
            <span>{model.sources.errors.length > 0 ? "Carga parcial" : "Carga completa"}</span>
          </section>
        </>
      )}
    </main>
  )
}

function Notice({ text, type }: { text: string; type: "ok" | "warning" | "error" }) {
  const styleMap = {
    ok: { background: "#ecfdf5", color: "#166534", borderColor: "#bbf7d0" },
    warning: { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" },
    error: { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" },
  }[type]

  return <div style={{ ...noticeStyle, ...styleMap }}>{text}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ color: "#111827", textAlign: "right" }}>{value}</strong>
    </div>
  )
}

function StatusPill({ status }: { status: TreasuryLiquidityStatus | string }) {
  return <span style={{ ...pill, ...statusStyle(status) }}>{statusLabel(status)}</span>
}

function SummaryRow({ summary, isTotal }: { summary: FinancialCompanySummary; isTotal?: boolean }) {
  return (
    <tr style={{ background: isTotal ? "#f8fafc" : "white", fontWeight: isTotal ? 800 : 500 }}>
      <td style={td}>{summary.empresa}</td>
      <td style={tdRight}>{summary.hasBalance ? money(summary.cajaInicial) : "Sin datos"}</td>
      <td style={tdRight}>{money(summary.ingresosConfirmados)}</td>
      <td style={tdRight}>{money(summary.ingresosEsperados)}</td>
      <td style={tdRight}>{money(summary.pagosProgramados)}</td>
      <td style={tdRight}>{money(summary.pagosEjecutados)}</td>
      <td style={tdRight}>{summary.hasBalance ? money(summary.cajaDisponible) : "Sin datos"}</td>
      <td style={tdRight}>{summary.hasBalance ? money(summary.cajaFinalProyectada) : "Sin datos"}</td>
      <td style={td}><StatusPill status={summary.estadoLiquidez} /></td>
      <td style={tdRight}>{summary.hasBalance ? money(summary.excedenteNecesidad) : "Sin datos"}</td>
    </tr>
  )
}

function BarRow({ label, value, max, color = "#0F6E56" }: { label: string; value: number; max: number; color?: string }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
        <span style={{ color: "#334155" }}>{label}</span>
        <strong>{money(value)}</strong>
      </div>
      <div style={{ height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", background: color }} />
      </div>
    </div>
  )
}

const section: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "white",
  padding: 16,
}

const sectionHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
}

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  color: "#111827",
  fontWeight: 800,
}

const sectionSubtitle: CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.45,
}

const kpiCard: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "white",
  padding: 14,
  display: "grid",
  gap: 5,
  minHeight: 96,
}

const kpiLabel: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
}

const kpiValue: CSSProperties = {
  color: "#111827",
  fontSize: 19,
  lineHeight: 1.1,
}

const kpiSub: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  lineHeight: 1.35,
}

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
}

const th: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  color: "#64748b",
  fontSize: 11,
  textTransform: "uppercase",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
}

const thRight: CSSProperties = {
  ...th,
  textAlign: "right",
}

const td: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  whiteSpace: "nowrap",
}

const tdRight: CSSProperties = {
  ...td,
  textAlign: "right",
}

const input: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  background: "white",
  fontSize: 13,
}

const tableInput: CSSProperties = {
  ...input,
  width: "100%",
  minWidth: 150,
}

const tableInputRight: CSSProperties = {
  ...tableInput,
  textAlign: "right",
}

const button: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "white",
  borderRadius: 8,
  padding: "8px 11px",
  cursor: "pointer",
  fontSize: 13,
  color: "#0f172a",
}

const primaryButton: CSSProperties = {
  ...button,
  borderColor: "#0F6E56",
  background: "#03E373",
  color: "#063b2f",
  fontWeight: 800,
}

const noticeStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid",
  fontSize: 13,
}

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 800,
}

const alertBox: CSSProperties = {
  border: "1px solid",
  borderRadius: 10,
  padding: 10,
  display: "grid",
  gap: 3,
  fontSize: 12,
  background: "#fff",
}
