"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import FinanceNav from "@/components/finanzas/FinanceNav"
import FinanceDataError from "@/components/finanzas/FinanceDataError"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import { EmptyState } from "@/components/design-system"
import {
  agingBucket,
  daysFromToday,
  dueDateValue,
  esFacturaAnulada,
  financeMoney,
  montoCobradoFactura,
  saldoPendienteFactura,
  totalFactura,
} from "@/lib/finance"

export default function CuentasPorCobrarPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [facturas, setFacturas] = useState<any[]>([])
  const [filtro, setFiltro] = useState("todas")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }
    async function load() {
      setError("")
      try {
        const { data, error: loadError } = await supabase.from("facturas").select("*, proyecto:proyectos(codigo,nombre,deleted_at,cliente:clientes(razon_social))").order("fecha_vencimiento", { ascending: true, nullsFirst: false })
        if (loadError) setError(loadError.message)
        setFacturas((data || []).filter((f: any) => !f.proyecto?.deleted_at && !esFacturaAnulada(f)))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error inesperado al cargar facturas")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authorized, loadingAccess, supabase])

  const totalFacturado = facturas.reduce((s, f) => s + totalFactura(f), 0)
  const totalCobrado = facturas.reduce((s, f) => s + montoCobradoFactura(f), 0)
  const totalPendiente = facturas.reduce((s, f) => s + saldoPendienteFactura(f), 0)
  const vencidas = facturas.filter(f => saldoPendienteFactura(f) > 0 && daysFromToday(dueDateValue(f)) > 0)
  const porVencer = facturas.filter(f => saldoPendienteFactura(f) > 0 && daysFromToday(dueDateValue(f)) <= 0)
  const filtradas = filtro === "vencidas" ? vencidas : filtro === "por_vencer" ? porVencer : facturas

  if (loadingAccess || loading) return <div style={{ color: "#64748B" }}>Cargando cuentas por cobrar...</div>
  if (!authorized) return <div style={{ color: "#991B1B", fontWeight: 800 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22 }}>Cuentas por Cobrar</h1><p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>Seguimiento de facturas pendientes y aging según fecha de vencimiento</p></div>
      <FinanceNav />
      <FinanceDataError detail={error} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="money" label="TOTAL FACTURADO ACTIVO" value={financeMoney(totalFacturado)} sub={`${facturas.length} facturas`} borderColor="#2563EB" valueColor="#1D4ED8" />
        <KpiCard icon="wallet" label="TOTAL COBRADO" value={financeMoney(totalCobrado)} sub="Dinero recibido" borderColor="#16A34A" valueColor="#15803D" />
        <KpiCard icon="chart" label="TOTAL PENDIENTE" value={financeMoney(totalPendiente)} sub={`${facturas.filter(f => saldoPendienteFactura(f) > 0).length} con saldo`} borderColor="#F59E0B" valueColor="#92400E" />
        <KpiCard icon="shield" label="TOTAL VENCIDO" value={financeMoney(vencidas.reduce((s, f) => s + saldoPendienteFactura(f), 0))} sub={`${vencidas.length} facturas vencidas`} borderColor="#DC2626" valueColor="#B91C1C" />
      </div>
      <SectionCard title="Cartera de clientes" action={<select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: 7 }}><option value="todas">Todas</option><option value="vencidas">Vencidas</option><option value="por_vencer">Por vencer</option></select>}>
        {facturas.length === 0 ? (
          <EmptyState
            title="No existen facturas registradas"
            description="Los proyectos marcados como facturados no sustituyen el registro de una factura."
          />
        ) : <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#F8FAFC" }}>{["FACTURA","CLIENTE / PROYECTO","EMISIÓN","VENCIMIENTO","TOTAL","COBRADO","SALDO","AGING","ESTADO"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: ["TOTAL","COBRADO","SALDO"].includes(h) ? "right" : "left", fontSize: 11, color: "#64748B" }}>{h}</th>)}</tr></thead>
            <tbody>{filtradas.map(f => <tr key={f.id} style={{ borderTop: "1px solid #E2E8F0" }}>
              <td style={{ padding: 12, fontWeight: 800 }}>{f.numero_factura}</td>
              <td style={{ padding: 12 }}><div style={{ fontWeight: 700 }}>{f.proyecto?.cliente?.razon_social || "Sin cliente"}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{f.proyecto?.codigo} · {f.proyecto?.nombre}</div></td>
              <td style={{ padding: 12 }}>{f.fecha_emision || "—"}</td>
              <td style={{ padding: 12 }}>{dueDateValue(f) || "—"}</td>
              <td style={{ padding: 12, textAlign: "right", fontWeight: 800 }}>{financeMoney(totalFactura(f))}</td>
              <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: "#15803D" }}>{financeMoney(montoCobradoFactura(f))}</td>
              <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: "#1D4ED8" }}>{financeMoney(saldoPendienteFactura(f))}</td>
              <td style={{ padding: 12 }}><StatusBadge label={agingBucket(dueDateValue(f))} type={daysFromToday(dueDateValue(f)) > 90 ? "cancelado" : "pendiente"} /></td>
              <td style={{ padding: 12 }}><StatusBadge label={f.estado} type={f.estado} /></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </SectionCard>
    </div>
  )
}

