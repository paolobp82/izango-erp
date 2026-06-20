"use client"

import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import FinanceNav from "@/components/finanzas/FinanceNav"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import { financeMoney, financeNumber } from "@/lib/finance"

export default function RentabilidadPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }

    Promise.all([
      supabase.from("liquidaciones").select("id,proyecto_id,cerrada,costo_real,precio_cliente_real,margen_real_pct,desvio_costo,proyecto:proyectos(codigo,nombre,deleted_at,cliente:clientes(razon_social))").order("created_at", { ascending: false }),
      supabase.from("facturas").select("proyecto_id,subtotal,igv,estado"),
    ]).then(([liqResult, factResult]) => {
      const facturas = factResult.data || []
      const liquidaciones = (liqResult.data || []).filter((l: any) => !l.proyecto?.deleted_at).map((liq: any) => {
        const facturado = facturas.filter((f: any) => f.proyecto_id === liq.proyecto_id && !["anulada", "cancelada"].includes(f.estado)).reduce((s: number, f: any) => s + financeNumber(f.subtotal) + financeNumber(f.igv), 0)
        const ingreso = facturado || financeNumber(liq.precio_cliente_real)
        const costo = financeNumber(liq.costo_real)
        const utilidad = ingreso - costo
        const margen = ingreso > 0 ? (utilidad / ingreso) * 100 : financeNumber(liq.margen_real_pct)
        return { ...liq, ingreso, costo, utilidad, margen }
      })
      setRows(liquidaciones)
      setLoading(false)
    })
  }, [authorized, loadingAccess, supabase])

  const cerradas = rows.filter(row => row.cerrada)
  const ingresos = cerradas.reduce((s, row) => s + row.ingreso, 0)
  const costos = cerradas.reduce((s, row) => s + row.costo, 0)
  const utilidad = ingresos - costos
  const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0
  const chart = rows.slice(0, 10).reverse().map(row => ({ proyecto: row.proyecto?.codigo || "—", ingreso: row.ingreso, costo: row.costo }))

  if (loadingAccess || loading) return <div style={{ color: "#64748B" }}>Cargando rentabilidad...</div>
  if (!authorized) return <div style={{ color: "#991B1B", fontWeight: 800 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22 }}>Rentabilidad</h1><p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>Resultado económico por proyecto y liquidación</p></div>
      <FinanceNav />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="money" label="INGRESOS LIQUIDADOS" value={financeMoney(ingresos)} sub={`${cerradas.length} proyectos cerrados`} borderColor="#2563EB" valueColor="#1D4ED8" />
        <KpiCard icon="wallet" label="COSTO REAL" value={financeMoney(costos)} sub="Costo consolidado" borderColor="#F97316" valueColor="#C2410C" />
        <KpiCard icon="chart" label="UTILIDAD REAL" value={financeMoney(utilidad)} sub="Ingresos menos costos" borderColor={utilidad >= 0 ? "#16A34A" : "#DC2626"} valueColor={utilidad >= 0 ? "#15803D" : "#B91C1C"} />
        <KpiCard icon="shield" label="MARGEN REAL" value={`${margen.toFixed(1)}%`} sub="Promedio ponderado" borderColor={margen >= 30 ? "#16A34A" : "#F59E0B"} valueColor={margen >= 30 ? "#15803D" : "#B45309"} />
      </div>
      <SectionCard title="Ingresos y costos por proyecto">
        <ResponsiveContainer width="100%" height={280}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="proyecto" /><YAxis /><Tooltip formatter={(v: any) => financeMoney(v)} /><Bar dataKey="ingreso" fill="#2563EB" name="Ingreso" radius={[4,4,0,0]} /><Bar dataKey="costo" fill="#F97316" name="Costo" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
      </SectionCard>
      <div style={{ height: 16 }} />
      <SectionCard title="Detalle de rentabilidad">
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#F8FAFC" }}>{["PROYECTO","CLIENTE","ESTADO","INGRESO","COSTO","UTILIDAD","MARGEN"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: ["INGRESO","COSTO","UTILIDAD","MARGEN"].includes(h) ? "right" : "left", fontSize: 11, color: "#64748B" }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id} style={{ borderTop: "1px solid #E2E8F0" }}>
            <td style={{ padding: 12 }}><strong>{row.proyecto?.codigo || "—"}</strong><div style={{ fontSize: 11, color: "#94A3B8" }}>{row.proyecto?.nombre}</div></td>
            <td style={{ padding: 12 }}>{row.proyecto?.cliente?.razon_social || "—"}</td>
            <td style={{ padding: 12 }}><StatusBadge label={row.cerrada ? "Cerrada" : "Abierta"} type={row.cerrada ? "completado" : "pendiente"} /></td>
            <td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.ingreso)}</td>
            <td style={{ padding: 12, textAlign: "right" }}>{financeMoney(row.costo)}</td>
            <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: row.utilidad >= 0 ? "#15803D" : "#B91C1C" }}>{financeMoney(row.utilidad)}</td>
            <td style={{ padding: 12, textAlign: "right", fontWeight: 800 }}>{row.margen.toFixed(1)}%</td>
          </tr>)}</tbody>
        </table></div>
      </SectionCard>
    </div>
  )
}
