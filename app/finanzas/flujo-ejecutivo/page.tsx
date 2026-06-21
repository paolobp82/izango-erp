"use client"

import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import FinanceNav from "@/components/finanzas/FinanceNav"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import { FACTURAS_COBRADAS, FACTURAS_PENDIENTES, RQS_POR_PAGAR, dueDateValue, financeMoney, financeNumber, monthKey, monthLabel } from "@/lib/finance"

export default function FlujoEjecutivoPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({ facturas: [], rqs: [], gastos: [], cuotas: [] })

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }
    Promise.all([
      supabase.from("facturas").select("estado,monto_final_abonado,fecha_emision,fecha_vencimiento,fecha_abono"),
      supabase.from("requerimientos_pago").select("estado,monto_solicitado,fecha_pago,created_at,updated_at"),
      supabase.from("gastos_oficina").select("estado_pago,monto,fecha,fecha_vencimiento"),
      supabase.from("prestamo_cuotas").select("estado,monto_total,monto_pagado,fecha_vencimiento"),
    ]).then(results => {
      setData({ facturas: results[0].data || [], rqs: results[1].data || [], gastos: results[2].data || [], cuotas: results[3].data || [] })
      setLoading(false)
    })
  }, [authorized, loadingAccess, supabase])

  const flow = useMemo(() => Array.from({ length: 9 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - 2 + index, 1)
    const key = monthKey(date)
    const ingresosReales = data.facturas.filter((f: any) => FACTURAS_COBRADAS.includes(f.estado) && String(f.fecha_abono || f.fecha_emision || "").startsWith(key)).reduce((s: number, f: any) => s + financeNumber(f.monto_final_abonado), 0)
    const ingresosProyectados = data.facturas.filter((f: any) => FACTURAS_PENDIENTES.includes(f.estado) && String(dueDateValue(f) || "").startsWith(key)).reduce((s: number, f: any) => s + financeNumber(f.monto_final_abonado), 0)
    const egresosReales = data.rqs.filter((r: any) => r.estado === "pagado" && String(r.fecha_pago || r.updated_at || "").startsWith(key)).reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0) + data.gastos.filter((g: any) => g.estado_pago === "pagado" && String(g.fecha || "").startsWith(key)).reduce((s: number, g: any) => s + financeNumber(g.monto), 0)
    const egresosProyectados = data.rqs.filter((r: any) => RQS_POR_PAGAR.includes(r.estado) && String(r.fecha_pago || r.created_at || "").startsWith(key)).reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0) + data.gastos.filter((g: any) => ["pendiente", "vencido"].includes(g.estado_pago) && String(g.fecha_vencimiento || g.fecha || "").startsWith(key)).reduce((s: number, g: any) => s + financeNumber(g.monto), 0) + data.cuotas.filter((c: any) => c.estado !== "pagado" && String(c.fecha_vencimiento || "").startsWith(key)).reduce((s: number, c: any) => s + Math.max(financeNumber(c.monto_total) - financeNumber(c.monto_pagado), 0), 0)
    return { mes: monthLabel(date), ingresosReales, ingresosProyectados, egresosReales, egresosProyectados, neto: ingresosReales + ingresosProyectados - egresosReales - egresosProyectados }
  }), [data])

  const totalIngresos = flow.reduce((s, row) => s + row.ingresosReales + row.ingresosProyectados, 0)
  const totalEgresos = flow.reduce((s, row) => s + row.egresosReales + row.egresosProyectados, 0)
  const neto = totalIngresos - totalEgresos
  const peorMes = [...flow].sort((a, b) => a.neto - b.neto)[0]

  if (loadingAccess || loading) return <div style={{ color: "#64748B" }}>Cargando flujo ejecutivo...</div>
  if (!authorized) return <div style={{ color: "#991B1B", fontWeight: 800 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22 }}>Flujo Ejecutivo</h1><p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>Posición histórica y proyección de caja a nueve meses</p></div>
      <FinanceNav />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="money" label="INGRESOS TOTALES" value={financeMoney(totalIngresos)} sub="Reales y proyectados" borderColor="#16A34A" valueColor="#15803D" />
        <KpiCard icon="wallet" label="EGRESOS TOTALES" value={financeMoney(totalEgresos)} sub="Operativos y deuda" borderColor="#DC2626" valueColor="#B91C1C" />
        <KpiCard icon="chart" label="FLUJO NETO" value={financeMoney(neto)} sub="Horizonte analizado" borderColor={neto >= 0 ? "#2563EB" : "#DC2626"} valueColor={neto >= 0 ? "#1D4ED8" : "#B91C1C"} />
        <KpiCard icon="shield" label="MES DE MAYOR PRESIÓN" value={peorMes?.mes || "—"} sub={financeMoney(peorMes?.neto || 0)} borderColor="#F59E0B" valueColor="#B45309" />
      </div>
      <SectionCard title="Flujo real y proyectado">
        <ResponsiveContainer width="100%" height={330}><BarChart data={flow}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(v: any) => financeMoney(v)} /><Legend /><ReferenceLine y={0} stroke="#94A3B8" /><Bar dataKey="ingresosReales" stackId="ing" fill="#15803D" name="Ingresos reales" /><Bar dataKey="ingresosProyectados" stackId="ing" fill="#86EFAC" name="Ingresos proyectados" /><Bar dataKey="egresosReales" stackId="out" fill="#B91C1C" name="Egresos reales" /><Bar dataKey="egresosProyectados" stackId="out" fill="#FCA5A5" name="Egresos proyectados" /></BarChart></ResponsiveContainer>
      </SectionCard>
      <div style={{ height: 16 }} />
      <SectionCard title="Resumen mensual">
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#F8FAFC" }}>{["MES","INGRESOS REALES","INGRESOS PROY.","EGRESOS REALES","EGRESOS PROY.","NETO"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: h === "MES" ? "left" : "right", fontSize: 11, color: "#64748B" }}>{h}</th>)}</tr></thead>
          <tbody>{flow.map(row => <tr key={row.mes} style={{ borderTop: "1px solid #E2E8F0" }}><td style={{ padding: 12, fontWeight: 800 }}>{row.mes}</td><td style={{ padding: 12, textAlign: "right", color: "#15803D" }}>{financeMoney(row.ingresosReales)}</td><td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.ingresosProyectados)}</td><td style={{ padding: 12, textAlign: "right", color: "#B91C1C" }}>{financeMoney(row.egresosReales)}</td><td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.egresosProyectados)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900, color: row.neto >= 0 ? "#15803D" : "#B91C1C" }}>{financeMoney(row.neto)}</td></tr>)}</tbody>
        </table></div>
      </SectionCard>
    </div>
  )
}
