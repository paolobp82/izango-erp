"use client"

import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import FinanceNav from "@/components/finanzas/FinanceNav"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import {
  AGING_ORDER,
  FACTURAS_COBRADAS,
  FACTURAS_PENDIENTES,
  RQS_POR_PAGAR,
  agingBucket,
  financeNumber,
  financeShort,
  monthKey,
  monthLabel,
} from "@/lib/finance"

export default function FinanzasDashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({ facturas: [], rqs: [], caja: [], gastos: [], liquidaciones: [], prestamos: [], pagos: [], cuotas: [] })
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }

    async function load() {
      const results = await Promise.all([
        supabase.from("facturas").select("id,numero_factura,estado,monto_final_abonado,subtotal,igv,fecha_emision,fecha_abono,proyecto_id"),
        supabase.from("requerimientos_pago").select("id,estado,monto_solicitado,fecha_pago,created_at,updated_at,proyecto_id"),
        supabase.from("caja_chica").select("id,estado,monto_debe,monto_haber,fecha"),
        supabase.from("gastos_oficina").select("id,estado_pago,monto,fecha,fecha_vencimiento"),
        supabase.from("liquidaciones").select("id,cerrada,margen_real_pct,precio_cliente_real,costo_real,fecha_cierre,created_at,proyecto_id"),
        supabase.from("prestamos").select("id,estado,monto_original"),
        supabase.from("prestamo_pagos").select("prestamo_id,monto,fecha_pago"),
        supabase.from("prestamo_cuotas").select("prestamo_id,estado,monto_total,monto_pagado,fecha_vencimiento"),
      ])

      const errors = results.map(result => result.error?.message).filter(Boolean)
      if (errors.length) setError(errors.join(" · "))
      setData({
        facturas: results[0].data || [],
        rqs: results[1].data || [],
        caja: results[2].data || [],
        gastos: results[3].data || [],
        liquidaciones: results[4].data || [],
        prestamos: results[5].data || [],
        pagos: results[6].data || [],
        cuotas: results[7].data || [],
      })
      setLoading(false)
    }

    load()
  }, [authorized, loadingAccess, supabase])

  const metrics = useMemo(() => {
    const cobrado = data.facturas.filter((f: any) => FACTURAS_COBRADAS.includes(f.estado)).reduce((s: number, f: any) => s + financeNumber(f.monto_final_abonado), 0)
    const rqPagado = data.rqs.filter((r: any) => r.estado === "pagado").reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0)
    const gastosPagados = data.gastos.filter((g: any) => g.estado_pago === "pagado").reduce((s: number, g: any) => s + financeNumber(g.monto), 0)
    const cajaNeta = data.caja.filter((c: any) => c.estado === "aprobado").reduce((s: number, c: any) => s + financeNumber(c.monto_haber) - financeNumber(c.monto_debe), 0)
    const pagosDeuda = data.pagos.reduce((s: number, p: any) => s + financeNumber(p.monto), 0)
    const cajaEstimada = cobrado + cajaNeta - rqPagado - gastosPagados - pagosDeuda
    const cuentasCobrar = data.facturas.filter((f: any) => FACTURAS_PENDIENTES.includes(f.estado)).reduce((s: number, f: any) => s + financeNumber(f.monto_final_abonado), 0)
    const rqsPagar = data.rqs.filter((r: any) => RQS_POR_PAGAR.includes(r.estado)).reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0)
    const cajaPagar = data.caja.filter((c: any) => c.estado === "pendiente").reduce((s: number, c: any) => s + financeNumber(c.monto_debe), 0)
    const gastosPagar = data.gastos.filter((g: any) => ["pendiente", "vencido"].includes(g.estado_pago)).reduce((s: number, g: any) => s + financeNumber(g.monto), 0)
    const cuentasPagar = rqsPagar + cajaPagar + gastosPagar
    const deudaOriginal = data.prestamos.filter((p: any) => p.estado === "activo").reduce((s: number, p: any) => s + financeNumber(p.monto_original), 0)
    const deudaFinanciera = Math.max(deudaOriginal - pagosDeuda, 0)
    const cerradas = data.liquidaciones.filter((l: any) => l.cerrada && Number.isFinite(Number(l.margen_real_pct)))
    const margenPromedio = cerradas.length ? cerradas.reduce((s: number, l: any) => s + financeNumber(l.margen_real_pct), 0) / cerradas.length : 0
    const currentMonth = monthKey(new Date())
    const ventasMes = data.facturas.filter((f: any) => !["anulada", "cancelada"].includes(f.estado) && String(f.fecha_emision || "").startsWith(currentMonth)).reduce((s: number, f: any) => s + financeNumber(f.subtotal) + financeNumber(f.igv), 0)
    const costosMes = data.rqs.filter((r: any) => r.estado === "pagado" && String(r.fecha_pago || r.updated_at || "").startsWith(currentMonth)).reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0)
    const rentabilidadMes = ventasMes > 0 ? ((ventasMes - costosMes) / ventasMes) * 100 : 0
    return { cajaEstimada, cuentasCobrar, cuentasPagar, deudaFinanciera, margenPromedio, rentabilidadMes }
  }, [data])

  const monthly = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - index), 1)
      const key = monthKey(date)
      const ingresos = data.facturas.filter((f: any) => FACTURAS_COBRADAS.includes(f.estado) && String(f.fecha_abono || f.fecha_emision || "").startsWith(key)).reduce((s: number, f: any) => s + financeNumber(f.monto_final_abonado), 0)
      const egresosRq = data.rqs.filter((r: any) => r.estado === "pagado" && String(r.fecha_pago || r.updated_at || "").startsWith(key)).reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0)
      const egresosGasto = data.gastos.filter((g: any) => g.estado_pago === "pagado" && String(g.fecha || "").startsWith(key)).reduce((s: number, g: any) => s + financeNumber(g.monto), 0)
      return { mes: monthLabel(date), ingresos, egresos: egresosRq + egresosGasto }
    })
  }, [data])

  const projected = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() + index, 1)
      const key = monthKey(date)
      const ingresos = data.facturas.filter((f: any) => FACTURAS_PENDIENTES.includes(f.estado) && String(f.fecha_emision || "").startsWith(key)).reduce((s: number, f: any) => s + financeNumber(f.monto_final_abonado), 0)
      const egresosRq = data.rqs.filter((r: any) => RQS_POR_PAGAR.includes(r.estado) && String(r.fecha_pago || r.created_at || "").startsWith(key)).reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0)
      const egresosGasto = data.gastos.filter((g: any) => ["pendiente", "vencido"].includes(g.estado_pago) && String(g.fecha_vencimiento || g.fecha || "").startsWith(key)).reduce((s: number, g: any) => s + financeNumber(g.monto), 0)
      const deuda = data.cuotas.filter((c: any) => c.estado !== "pagado" && String(c.fecha_vencimiento || "").startsWith(key)).reduce((s: number, c: any) => s + Math.max(financeNumber(c.monto_total) - financeNumber(c.monto_pagado), 0), 0)
      return { mes: monthLabel(date), saldo: ingresos - egresosRq - egresosGasto - deuda }
    })
  }, [data])

  const agingCxc = AGING_ORDER.map(bucket => ({
    name: bucket,
    value: data.facturas.filter((f: any) => FACTURAS_PENDIENTES.includes(f.estado) && agingBucket(f.fecha_emision) === bucket).reduce((s: number, f: any) => s + financeNumber(f.monto_final_abonado), 0),
  }))
  const agingCxp = AGING_ORDER.map(bucket => ({
    name: bucket,
    value:
      data.rqs.filter((r: any) => RQS_POR_PAGAR.includes(r.estado) && agingBucket(r.fecha_pago || r.created_at) === bucket).reduce((s: number, r: any) => s + financeNumber(r.monto_solicitado), 0) +
      data.gastos.filter((g: any) => ["pendiente", "vencido"].includes(g.estado_pago) && agingBucket(g.fecha_vencimiento || g.fecha) === bucket).reduce((s: number, g: any) => s + financeNumber(g.monto), 0),
  }))

  if (loadingAccess || loading) return <div style={{ color: "#64748B" }}>Cargando finanzas corporativas...</div>
  if (!authorized) return <div style={{ color: "#991B1B", fontWeight: 800 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#0F172A" }}>Finanzas Corporativas</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Vista ejecutiva estimada de liquidez, obligaciones y rentabilidad</p>
      </div>
      <FinanceNav />
      {error && <div style={{ padding: 12, marginBottom: 16, background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: 8 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="wallet" label="CAJA ESTIMADA" value={financeShort(metrics.cajaEstimada)} sub="Estimación según cobros y egresos registrados" borderColor={metrics.cajaEstimada >= 0 ? "#16A34A" : "#DC2626"} valueColor={metrics.cajaEstimada >= 0 ? "#15803D" : "#DC2626"} />
        <KpiCard icon="money" label="CUENTAS POR COBRAR" value={financeShort(metrics.cuentasCobrar)} sub="Facturas pendientes" borderColor="#2563EB" valueColor="#1D4ED8" />
        <KpiCard icon="file" label="CUENTAS POR PAGAR" value={financeShort(metrics.cuentasPagar)} sub="RQ, caja chica y oficina" borderColor="#DC2626" valueColor="#B91C1C" />
        <KpiCard icon="shield" label="DEUDA FINANCIERA" value={financeShort(metrics.deudaFinanciera)} sub="Saldo de obligaciones activas" borderColor="#7C3AED" valueColor="#6D28D9" />
        <KpiCard icon="chart" label="MARGEN PROMEDIO" value={`${metrics.margenPromedio.toFixed(1)}%`} sub="Liquidaciones cerradas" borderColor="#0D9488" valueColor="#0F766E" />
        <KpiCard icon="chart" label="RENTABILIDAD DEL MES" value={`${metrics.rentabilidadMes.toFixed(1)}%`} sub="Facturación menos RQ pagados" borderColor={metrics.rentabilidadMes >= 0 ? "#16A34A" : "#DC2626"} valueColor={metrics.rentabilidadMes >= 0 ? "#15803D" : "#DC2626"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <SectionCard title="Ingresos vs egresos">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(v: any) => financeShort(v)} /><Legend /><Bar dataKey="ingresos" fill="#16A34A" name="Ingresos" radius={[4,4,0,0]} /><Bar dataKey="egresos" fill="#DC2626" name="Egresos" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Flujo proyectado">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={projected}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(v: any) => financeShort(v)} /><Line type="monotone" dataKey="saldo" stroke="#2563EB" strokeWidth={3} name="Saldo proyectado" /></LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[{ title: "Aging CxC", rows: agingCxc, color: "#2563EB" }, { title: "Aging CxP", rows: agingCxp, color: "#DC2626" }].map(section => (
          <SectionCard key={section.title} title={section.title}>
            <div style={{ display: "grid", gap: 10 }}>
              {section.rows.map(row => (
                <div key={row.name} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", alignItems: "center", gap: 10 }}>
                  <StatusBadge label={row.name} type={row.name === "Por vencer" ? "programado" : row.name === "Más de 90 días" ? "cancelado" : "pendiente"} />
                  <div style={{ height: 8, borderRadius: 999, background: "#E2E8F0", overflow: "hidden" }}><div style={{ width: `${Math.min(100, row.value ? 70 : 0)}%`, height: "100%", background: section.color }} /></div>
                  <strong style={{ fontSize: 12, color: "#334155" }}>{financeShort(row.value)}</strong>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}

