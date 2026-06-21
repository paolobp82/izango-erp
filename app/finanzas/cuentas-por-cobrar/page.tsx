"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import FinanceNav from "@/components/finanzas/FinanceNav"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import { FACTURAS_PENDIENTES, agingBucket, daysFromToday, dueDateValue, financeMoney, financeNumber } from "@/lib/finance"

export default function CuentasPorCobrarPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [facturas, setFacturas] = useState<any[]>([])
  const [filtro, setFiltro] = useState("todas")

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }
    supabase.from("facturas").select("*, proyecto:proyectos(codigo,nombre,deleted_at,cliente:clientes(razon_social))").in("estado", FACTURAS_PENDIENTES).order("fecha_vencimiento", { ascending: true, nullsFirst: false }).then(({ data }) => {
      setFacturas((data || []).filter((f: any) => !f.proyecto?.deleted_at))
      setLoading(false)
    })
  }, [authorized, loadingAccess, supabase])

  const total = facturas.reduce((s, f) => s + financeNumber(f.monto_final_abonado), 0)
  const vencidas = facturas.filter(f => daysFromToday(dueDateValue(f)) > 0)
  const porVencer = facturas.filter(f => daysFromToday(dueDateValue(f)) <= 0)
  const filtradas = filtro === "vencidas" ? vencidas : filtro === "por_vencer" ? porVencer : facturas

  if (loadingAccess || loading) return <div style={{ color: "#64748B" }}>Cargando cuentas por cobrar...</div>
  if (!authorized) return <div style={{ color: "#991B1B", fontWeight: 800 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22 }}>Cuentas por Cobrar</h1><p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>Seguimiento de facturas pendientes y aging según fecha de vencimiento</p></div>
      <FinanceNav />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="money" label="TOTAL POR COBRAR" value={financeMoney(total)} sub={`${facturas.length} facturas`} borderColor="#2563EB" valueColor="#1D4ED8" />
        <KpiCard icon="wallet" label="VENCIDO" value={financeMoney(vencidas.reduce((s, f) => s + financeNumber(f.monto_final_abonado), 0))} sub={`${vencidas.length} facturas vencidas`} borderColor="#DC2626" valueColor="#B91C1C" />
        <KpiCard icon="chart" label="POR VENCER" value={financeMoney(porVencer.reduce((s, f) => s + financeNumber(f.monto_final_abonado), 0))} sub={`${porVencer.length} facturas`} borderColor="#16A34A" valueColor="#15803D" />
      </div>
      <SectionCard title="Cartera de clientes" action={<select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: 7 }}><option value="todas">Todas</option><option value="vencidas">Vencidas</option><option value="por_vencer">Por vencer</option></select>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#F8FAFC" }}>{["FACTURA","CLIENTE / PROYECTO","EMISIÓN","VENCIMIENTO","AGING","ESTADO","MONTO"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: h === "MONTO" ? "right" : "left", fontSize: 11, color: "#64748B" }}>{h}</th>)}</tr></thead>
            <tbody>{filtradas.map(f => <tr key={f.id} style={{ borderTop: "1px solid #E2E8F0" }}>
              <td style={{ padding: 12, fontWeight: 800 }}>{f.numero_factura}</td>
              <td style={{ padding: 12 }}><div style={{ fontWeight: 700 }}>{f.proyecto?.cliente?.razon_social || "Sin cliente"}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{f.proyecto?.codigo} · {f.proyecto?.nombre}</div></td>
              <td style={{ padding: 12 }}>{f.fecha_emision || "—"}</td>
              <td style={{ padding: 12 }}>{dueDateValue(f) || "—"}</td>
              <td style={{ padding: 12 }}><StatusBadge label={agingBucket(dueDateValue(f))} type={daysFromToday(dueDateValue(f)) > 90 ? "cancelado" : "pendiente"} /></td>
              <td style={{ padding: 12 }}><StatusBadge label={f.estado} type={f.estado} /></td>
              <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: "#1D4ED8" }}>{financeMoney(f.monto_final_abonado)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

