"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts"

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

export default function FlujoCajaPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [rqs, setRqs] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [vista, setVista] = useState<"mensual" | "detalle">("mensual")
  const [mesSeleccionado, setMesSeleccionado] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: rqsData }, { data: facturasData }] = await Promise.all([
      supabase.from("requerimientos_pago")
        .select("*, proyecto:proyectos(nombre, codigo)")
        .not("estado", "eq", "rechazado")
        .order("created_at"),
      supabase.from("facturas")
        .select("*, proyecto:proyectos(nombre, codigo)")
        .not("estado", "eq", "anulada")
        .order("fecha_emision"),
    ])
    setRqs(rqsData || [])
    setFacturas(facturasData || [])
    setLoading(false)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtFull = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Agrupar por mes
  const hoy = new Date()
  const mesesData: any[] = []

  for (let i = -2; i <= 6; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
    const label = MESES[fecha.getMonth()] + " " + String(fecha.getFullYear()).slice(2)

    // Ingresos: facturas cobradas o emitidas en ese mes
    const ingresos = facturas.filter(f => {
      const d = f.fecha_abono || f.fecha_emision
      if (!d) return false
      return d.startsWith(key)
    }).reduce((s, f) => s + (f.monto_final_abonado || 0), 0)

    const ingresosProyectados = facturas.filter(f => {
      const d = f.fecha_emision
      if (!d || f.estado === "cobrada") return false
      return d.startsWith(key)
    }).reduce((s, f) => s + (f.monto_final_abonado || 0), 0)

    // Egresos: RQs programados o pagados en ese mes
    const egresos = rqs.filter(r => {
      if (r.estado !== "pagado") return false
      const d = r.updated_at || r.created_at
      if (!d) return false
      return d.startsWith(key)
    }).reduce((s, r) => s + (r.monto_solicitado || 0), 0)

    const egresosProyectados = rqs.filter(r => {
      if (!["aprobado_produccion", "aprobado", "programado"].includes(r.estado)) return false
      const d = r.created_at
      if (!d) return false
      return d.startsWith(key)
    }).reduce((s, r) => s + (r.monto_solicitado || 0), 0)

    mesesData.push({
      key,
      mes: label,
      ingresos: Math.round(ingresos),
      ingresosProyectados: Math.round(ingresosProyectados),
      egresos: Math.round(egresos),
      egresosProyectados: Math.round(egresosProyectados),
      neto: Math.round(ingresos + ingresosProyectados - egresos - egresosProyectados),
      esActual: i === 0,
      esPasado: i < 0,
    })
  }

  const totalIngresos = mesesData.reduce((s, m) => s + m.ingresos + m.ingresosProyectados, 0)
  const totalEgresos = mesesData.reduce((s, m) => s + m.egresos + m.egresosProyectados, 0)
  const netoTotal = totalIngresos - totalEgresos

  // Detalle del mes seleccionado
  const mesDetalle = mesSeleccionado ? mesesData.find(m => m.key === mesSeleccionado) : null
  const facturasMes = mesSeleccionado ? facturas.filter(f => (f.fecha_abono || f.fecha_emision || "").startsWith(mesSeleccionado)) : []
  const rqsMes = mesSeleccionado ? rqs.filter(r => (r.created_at || "").startsWith(mesSeleccionado) && !["rechazado"].includes(r.estado)) : []

  // RQs pendientes sin fecha
  const rqsPendientes = rqs.filter(r => ["pendiente_aprobacion", "aprobado_produccion", "aprobado", "programado"].includes(r.estado))
  const totalPendiente = rqsPendientes.reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const facturasPorCobrar = facturas.filter(f => f.estado === "emitida")
  const totalPorCobrar = facturasPorCobrar.reduce((s, f) => s + (f.monto_final_abonado || 0), 0)

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Flujo de caja</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Ingresos y egresos proyectados por mes</p>
        </div>
        <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {(["mensual", "detalle"] as const).map(v => (
            <button key={v} onClick={() => setVista(v)}
              style={{ padding: "7px 16px", border: "none", background: vista === v ? "#0F6E56" : "#fff", color: vista === v ? "#fff" : "#374151", cursor: "pointer", fontSize: 13, fontWeight: vista === v ? 700 : 400, fontFamily: "inherit", textTransform: "capitalize" }}>
              {v === "mensual" ? "📊 Gráfico" : "📋 Detalle"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: "4px solid #059669" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Por cobrar</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{fmt(totalPorCobrar)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{facturasPorCobrar.length} facturas emitidas</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #dc2626" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Por pagar (RQs)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>{fmt(totalPendiente)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{rqsPendientes.length} RQs pendientes</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Total ingresos proyectados</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>{fmt(totalIngresos)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Próximos 6 meses</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid " + (netoTotal >= 0 ? "#059669" : "#dc2626") }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Neto proyectado</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: netoTotal >= 0 ? "#059669" : "#dc2626" }}>{fmt(netoTotal)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Ingresos - Egresos</div>
        </div>
      </div>

      {vista === "mensual" ? (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16 }}>Flujo mensual — click en una barra para ver detalle</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mesesData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                onClick={(e: any) => e?.activePayload && setMesSeleccionado(e.activePayload[0]?.payload?.key)}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? (v/1000).toFixed(0)+"K" : String(v)} />
                <Tooltip formatter={(v: any) => fmtFull(v)} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#e5e7eb" />
                <Bar dataKey="ingresos" fill="#059669" name="Ingresos cobrados" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ingresosProyectados" fill="#86efac" name="Ingresos proyectados" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" fill="#dc2626" name="Egresos pagados" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresosProyectados" fill="#fca5a5" name="Egresos proyectados" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla resumen mensual */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MES</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#059669" }}>INGRESOS</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#86efac" }}>INGRESOS PROY.</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#dc2626" }}>EGRESOS</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#fca5a5" }}>EGRESOS PROY.</th>
                  <th style={{ textAlign: "right", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#374151" }}>NETO</th>
                </tr>
              </thead>
              <tbody>
                {mesesData.map((m, idx) => (
                  <tr key={m.key} onClick={() => setMesSeleccionado(m.key === mesSeleccionado ? null : m.key)}
                    style={{ borderTop: "1px solid #f3f4f6", background: m.key === mesSeleccionado ? "#f0fdf4" : m.esActual ? "#fefce8" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}>
                    <td style={{ padding: "10px 20px", fontSize: 13, fontWeight: m.esActual ? 700 : 400, color: "#111827" }}>
                      {m.mes} {m.esActual && <span style={{ fontSize: 10, background: "#fef9c3", color: "#92400e", padding: "1px 6px", borderRadius: 4, marginLeft: 4 }}>Actual</span>}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#059669", fontWeight: 600 }}>{m.ingresos > 0 ? fmt(m.ingresos) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#16a34a" }}>{m.ingresosProyectados > 0 ? fmt(m.ingresosProyectados) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{m.egresos > 0 ? fmt(m.egresos) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#ef4444" }}>{m.egresosProyectados > 0 ? fmt(m.egresosProyectados) : "—"}</td>
                    <td style={{ padding: "10px 20px", textAlign: "right", fontSize: 14, fontWeight: 800, color: m.neto >= 0 ? "#059669" : "#dc2626" }}>
                      {m.neto !== 0 ? fmt(m.neto) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vista detalle */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#f0fdf4" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>📥 Ingresos — Facturas</div>
              </div>
              {facturasPorCobrar.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay facturas pendientes de cobro</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FACTURA</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                      <th style={{ textAlign: "right", padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasPorCobrar.map((f, idx) => (
                      <tr key={f.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "#111827" }}>{f.numero_factura}</td>
                        <td style={{ padding: "8px 8px", fontSize: 11, color: "#6b7280" }}>{f.proyecto?.codigo || "—"}</td>
                        <td style={{ padding: "8px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#059669" }}>{fmtFull(f.monto_final_abonado || 0)}</td>
                        <td style={{ padding: "8px 8px" }}>
                          <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{f.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", background: "#f0fdf4", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>Total por cobrar</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>{fmtFull(totalPorCobrar)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#fef2f2" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>📤 Egresos — RQs pendientes</div>
              </div>
              {rqsPendientes.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay RQs pendientes de pago</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N° RQ</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                      <th style={{ textAlign: "right", padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rqsPendientes.map((r, idx) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "8px 16px", fontSize: 11, fontFamily: "monospace", color: "#374151" }}>{r.numero_rq || "—"}</td>
                        <td style={{ padding: "8px 8px", fontSize: 11, color: "#6b7280" }}>{r.proveedor_nombre || "—"}</td>
                        <td style={{ padding: "8px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{fmtFull(r.monto_solicitado || 0)}</td>
                        <td style={{ padding: "8px 8px" }}>
                          <span style={{ background: "#fef9c3", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{r.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", background: "#fef2f2", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>Total por pagar</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#dc2626" }}>{fmtFull(totalPendiente)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}