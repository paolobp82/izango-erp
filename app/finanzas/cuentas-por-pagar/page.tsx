"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import KpiCard from "@/components/ui/KpiCard"
import SectionCard from "@/components/ui/SectionCard"
import StatusBadge from "@/components/ui/StatusBadge"
import FinanceNav from "@/components/finanzas/FinanceNav"
import FinanceDataError from "@/components/finanzas/FinanceDataError"
import { useFinanceAccess } from "@/components/finanzas/useFinanceAccess"
import { RQS_POR_PAGAR, agingBucket, financeMoney, financeNumber } from "@/lib/finance"
import { rqCodigo } from "@/lib/rq-code"

export default function CuentasPorPagarPage() {
  const supabase = useMemo(() => createClient(), [])
  const { loadingAccess, authorized } = useFinanceAccess()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [source, setSource] = useState("todas")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authorized) {
      if (!loadingAccess) setLoading(false)
      return
    }

    setError("")
    Promise.all([
      supabase.from("requerimientos_pago").select("id,codigo_rq,numero_rq,descripcion,proveedor_nombre,monto_solicitado,estado,fecha_pago,created_at").in("estado", RQS_POR_PAGAR),
      supabase.from("caja_chica").select("id,concepto,monto_debe,estado,fecha,destinatario").in("estado", ["pendiente", "aprobado"]),
      supabase.from("gastos_oficina").select("id,descripcion,proveedor_nombre,monto,estado_pago,fecha,fecha_vencimiento").in("estado_pago", ["pendiente", "vencido"]),
    ]).then(results => {
      const errors = results.map(result => result.error?.message).filter(Boolean)
      if (errors.length) setError(errors.join(" · "))
      const rqs = (results[0].data || []).map((r: any) => ({ ...r, source: "rq", label: rqCodigo(r), tercero: r.proveedor_nombre, monto: r.monto_solicitado, fecha_ref: r.fecha_pago || r.created_at }))
      const caja = (results[1].data || []).map((r: any) => ({ ...r, source: "caja", label: "Caja chica", descripcion: r.concepto, tercero: r.destinatario, monto: r.monto_debe, fecha_ref: r.fecha }))
      const gastos = (results[2].data || []).map((r: any) => ({ ...r, source: "oficina", label: "Gasto oficina", tercero: r.proveedor_nombre, estado: r.estado_pago, fecha_ref: r.fecha_vencimiento || r.fecha }))
      setRows([...rqs, ...caja, ...gastos])
      setLoading(false)
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado al cargar obligaciones")
      setLoading(false)
    })
  }, [authorized, loadingAccess, supabase])

  const filtered = source === "todas" ? rows : rows.filter(row => row.source === source)
  const total = rows.reduce((s, row) => s + financeNumber(row.monto), 0)
  const bySource = (key: string) => rows.filter(row => row.source === key).reduce((s, row) => s + financeNumber(row.monto), 0)

  if (loadingAccess || loading) return <div style={{ color: "#64748B" }}>Cargando cuentas por pagar...</div>
  if (!authorized) return <div style={{ color: "#991B1B", fontWeight: 800 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22 }}>Cuentas por Pagar</h1><p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>Obligaciones operativas pendientes de programación o pago</p></div>
      <FinanceNav />
      <FinanceDataError detail={error} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <KpiCard icon="wallet" label="TOTAL POR PAGAR" value={financeMoney(total)} sub={`${rows.length} obligaciones`} borderColor="#DC2626" valueColor="#B91C1C" />
        <KpiCard icon="file" label="REQUERIMIENTOS" value={financeMoney(bySource("rq"))} sub="Flujo de aprobación RQ" borderColor="#F97316" valueColor="#C2410C" />
        <KpiCard icon="money" label="CAJA CHICA" value={financeMoney(bySource("caja"))} sub="Pendiente y aprobada" borderColor="#7C3AED" valueColor="#6D28D9" />
        <KpiCard icon="shield" label="GASTOS DE OFICINA" value={financeMoney(bySource("oficina"))} sub="Pendientes y vencidos" borderColor="#2563EB" valueColor="#1D4ED8" />
      </div>
      <SectionCard title="Obligaciones pendientes" action={<select value={source} onChange={e => setSource(e.target.value)} style={{ padding: "7px 10px", border: "1px solid #CBD5E1", borderRadius: 7 }}><option value="todas">Todas las fuentes</option><option value="rq">RQ</option><option value="caja">Caja chica</option><option value="oficina">Gastos oficina</option></select>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#F8FAFC" }}>{["ORIGEN","CONCEPTO","TERCERO","FECHA","AGING","ESTADO","MONTO"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: h === "MONTO" ? "right" : "left", fontSize: 11, color: "#64748B" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(row => <tr key={`${row.source}-${row.id}`} style={{ borderTop: "1px solid #E2E8F0" }}>
              <td style={{ padding: 12, fontWeight: 800 }}>{row.label}</td>
              <td style={{ padding: 12 }}>{row.descripcion || row.concepto || "—"}</td>
              <td style={{ padding: 12 }}>{row.tercero || "—"}</td>
              <td style={{ padding: 12 }}>{String(row.fecha_ref || "").slice(0, 10) || "—"}</td>
              <td style={{ padding: 12 }}><StatusBadge label={agingBucket(row.fecha_ref)} type={row.estado === "vencido" ? "cancelado" : "pendiente"} /></td>
              <td style={{ padding: 12 }}><StatusBadge label={row.estado} type={row.estado} /></td>
              <td style={{ padding: 12, textAlign: "right", fontWeight: 800, color: "#B91C1C" }}>{financeMoney(row.monto)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
