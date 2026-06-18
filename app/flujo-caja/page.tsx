"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts"
import { rqCodigo } from "@/lib/rq-code"
import { rowBelongsToDeletedProject } from "@/lib/projects"
import KpiCard from "@/components/ui/KpiCard"
import StatusBadge from "@/components/ui/StatusBadge"
import { puedeAccederRuta } from "@/lib/permissions"

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

export default function FlujoCajaPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)
  const [autorizado, setAutorizado] = useState(false)
  const [rqs, setRqs] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [vista, setVista] = useState<"mensual" | "detalle">("mensual")
  const [mesSeleccionado, setMesSeleccionado] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const puedeVer = puedeAccederRuta(p?.perfil, "/flujo-caja")
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const [{ data: rqsData }, { data: facturasData }] = await Promise.all([
      supabase.from("requerimientos_pago")
        .select("*, proyecto:proyectos(nombre, codigo, deleted_at)")
        .not("estado", "in", "(rechazado,cancelado,cerrado)")
        .order("created_at"),
      supabase.from("facturas")
        .select("*, proyecto:proyectos(nombre, codigo, deleted_at)")
        .not("estado", "eq", "anulada")
        .order("fecha_emision"),
    ])

    setRqs((rqsData || []).filter((rq: any) => !rowBelongsToDeletedProject(rq)))
    setFacturas((facturasData || []).filter((factura: any) => !rowBelongsToDeletedProject(factura)))
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

  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

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
              style={{ padding: "8px 18px", border: "none", background: vista === v ? "#0F6E56" : "#FFFFFF", color: vista === v ? "#FFFFFF" : "#334155", cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "inherit", textTransform: "capitalize" }}>
              {v === "mensual" ? "📊 Gráfico" : "📋 Detalle"}
            </button>
          ))}
        </div>
      </div>      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="POR COBRAR"
          value={fmt(totalPorCobrar)}
          sub={`${facturasPorCobrar.length} facturas emitidas`}
          icon="money"
          borderColor="#16A34A"
          valueColor="#15803D"
        />

        <KpiCard
          label="POR PAGAR"
          value={fmt(totalPendiente)}
          sub={`${rqsPendientes.length} RQs pendientes`}
          icon="wallet"
          borderColor="#DC2626"
          valueColor="#DC2626"
        />

        <KpiCard
          label="INGRESOS PROYECTADOS"
          value={fmt(totalIngresos)}
          sub="Próximos 6 meses"
          icon="chart"
          borderColor="#2563EB"
          valueColor="#1E40AF"
        />

        <KpiCard
          label="NETO PROYECTADO"
          value={fmt(netoTotal)}
          sub="Ingresos - egresos"
          icon="shield"
          borderColor={netoTotal >= 0 ? "#16A34A" : "#DC2626"}
          valueColor={netoTotal >= 0 ? "#15803D" : "#DC2626"}
        />
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
          <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
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
                      {m.mes} {m.esActual && <span style={{ fontSize: 10, background: "#DBEAFE", color: "#1E40AF", padding: "2px 8px", borderRadius: 999, marginLeft: 6, fontWeight: 800 }}>Actual</span>}
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
            <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#f0fdf4" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>Ingresos pendientes de cobro <span style={{ background: "#DCFCE7", color: "#166534", borderRadius: 999, padding: "2px 8px", fontSize: 11, marginLeft: 8 }}>{facturasPorCobrar.length} facturas</span></div>
              </div>
              {facturasPorCobrar.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay facturas pendientes de cobro</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
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
                          <StatusBadge label={f.estado} type={f.estado} />
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
            <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#FFFFFF", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", background: "#fef2f2" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>Egresos pendientes de pago <span style={{ background: "#FEE2E2", color: "#B91C1C", borderRadius: 999, padding: "2px 8px", fontSize: 11, marginLeft: 8 }}>{rqsPendientes.length} RQs</span></div>
              </div>
              {rqsPendientes.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No hay RQs pendientes de pago</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ textAlign: "left", padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N° RQ</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                      <th style={{ textAlign: "right", padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                      <th style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rqsPendientes.map((r, idx) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "8px 16px", fontSize: 11, fontFamily: "monospace", color: "#374151" }}>{rqCodigo(r)}</td>
                        <td style={{ padding: "8px 8px", fontSize: 11, color: "#6b7280" }}>{r.proveedor_nombre || "—"}</td>
                        <td style={{ padding: "8px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{fmtFull(r.monto_solicitado || 0)}</td>
                        <td style={{ padding: "8px 8px" }}>
                          <StatusBadge label={r.estado} type={r.estado} />
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



