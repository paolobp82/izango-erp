"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { registrarAccion } from "@/lib/trazabilidad"
import { enviarAlerta } from "@/lib/alertas"
import { rowBelongsToDeletedProject } from "@/lib/projects"
import KpiCard from "@/components/ui/KpiCard"
import StatusBadge from "@/components/ui/StatusBadge"
import FinanceDataError from "@/components/finanzas/FinanceDataError"
import { puedeAccederRuta } from "@/lib/permissions"

const ESTADOS: Record<string, any> = {
  pendiente:  { bg: "#fef9c3", color: "#92400e",  label: "Pendiente" },
  emitida:    { bg: "#dbeafe", color: "#1e40af",  label: "Emitida" },
  cobrada:    { bg: "#dcfce7", color: "#15803d",  label: "Cobrada" },
  anulada:    { bg: "#fee2e2", color: "#991b1b",  label: "Anulada" },
}

const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha"]

function calcularFechaVencimiento(fechaEmision: string, diasCredito: string) {
  if (!fechaEmision) return ""
  const [year, month, day] = fechaEmision.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + Math.max(0, Number(diasCredito) || 0))
  return date.toISOString().slice(0, 10)
}

export default function FacturacionPage() {
  const supabase = createClient()
  const [facturas, setFacturas] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [pendientesFacturacion, setPendientesFacturacion] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)
  const [autorizado, setAutorizado] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [vencimientoManual, setVencimientoManual] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroProyecto, setFiltroProyecto] = useState("")
  const [filtroTipoCobro, setFiltroTipoCobro] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    proyecto_id: "", numero_factura: "", estado: "pendiente",
    subtotal: "", igv: "18",
    detraccion_pct: "0", retencion_pct: "0",
    pronto_pago_entidad: "", pronto_pago_pct: "0",
    banco_receptor: "", fecha_emision: "", dias_credito: "30", fecha_vencimiento: "", fecha_abono: "", link_reporte: "",
  })

  useEffect(() => { load() }, [])

  async function load() {
    setError("")
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const puedeVer = puedeAccederRuta(p?.perfil, "/facturacion")
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const proyectoIdParam = new URLSearchParams(window.location.search).get("proyecto_id") || ""

    const { data: facts, error: facturasError } = await supabase
      .from("facturas")
      .select("*, proyecto:proyectos(nombre, codigo, deleted_at)")
      .order("created_at", { ascending: false })

    const factsVisiblesBase = (facts || []).filter((factura: any) => !rowBelongsToDeletedProject(factura))

    const { data: provs, error: proyectosError } = await supabase
      .from("proyectos")
      .select("id, nombre, codigo, estado, cliente:clientes(razon_social)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    setProyectos(provs || [])

    const proyectoMap = new Map((provs || []).map((p: any) => [p.id, p]))
    const factsEnriquecidas = factsVisiblesBase.map((f: any) => ({
      ...f,
      proyecto: {
        ...(f.proyecto || {}),
        ...(proyectoMap.get(f.proyecto_id) || {}),
      }
    }))
    setFacturas(factsEnriquecidas)

    const proyectosFacturados = new Set((facts || [])
      .filter((f: any) => !["anulada", "cancelada"].includes(f.estado))
      .map((f: any) => f.proyecto_id)
      .filter(Boolean))

    const pendientes = (provs || [])
      .filter((p: any) => ["terminado","liquidado"].includes(p.estado))
      .filter((p: any) => !proyectosFacturados.has(p.id))

    setPendientesFacturacion(pendientes)
    const loadErrors = [facturasError?.message, proyectosError?.message].filter(Boolean)
    if (loadErrors.length) setError(loadErrors.join(" · "))

    if (proyectoIdParam) {
      const proyectoActivo = (provs || []).some((p: any) => p.id === proyectoIdParam)
      if (proyectoActivo) {
        setForm(prev => ({ ...prev, proyecto_id: proyectoIdParam }))
        setShowForm(true)
      }
    }

    setLoading(false)
  }
  function calcularMontos() {
    const subtotal = Number(form.subtotal) || 0
    const igvMonto = subtotal * (Number(form.igv) / 100)
    const total = subtotal + igvMonto
    const detraccionMonto = total * (Number(form.detraccion_pct) / 100)
    const retencionMonto = total * (Number(form.retencion_pct) / 100)
    const prontoPagoMonto = total * (Number(form.pronto_pago_pct) / 100)
    const montoFinal = total - detraccionMonto - retencionMonto - prontoPagoMonto
    return { subtotal, igvMonto, total, detraccionMonto, retencionMonto, prontoPagoMonto, montoFinal }
  }

  async function guardar() {
    if (!autorizado) return
    if (!form.proyecto_id || !form.numero_factura || !form.subtotal) {
      alert("Proyecto, número de factura y subtotal son obligatorios")
      return
    }
    const proyecto = proyectos.find((p: any) => p.id === form.proyecto_id)
    if (!proyecto) {
      alert("No se puede facturar un proyecto eliminado o no disponible.")
      return
    }
    setSaving(true)
    const m = calcularMontos()
    await supabase.from("facturas").insert({
      proyecto_id: form.proyecto_id,
      numero_factura: form.numero_factura,
      estado: form.estado,
      subtotal: m.subtotal,
      igv: m.igvMonto,
      detraccion_pct: Number(form.detraccion_pct),
      detraccion_monto: m.detraccionMonto,
      retencion_pct: Number(form.retencion_pct),
      retencion_monto: m.retencionMonto,
      pronto_pago_entidad: form.pronto_pago_entidad || null,
      pronto_pago_pct: Number(form.pronto_pago_pct),
      pronto_pago_monto: m.prontoPagoMonto,
      monto_final_abonado: m.montoFinal,
      banco_receptor: form.banco_receptor || null,
      fecha_emision: form.fecha_emision || null,
      dias_credito: Number(form.dias_credito) || 30,
      fecha_vencimiento: form.fecha_vencimiento || (form.fecha_emision ? calcularFechaVencimiento(form.fecha_emision, form.dias_credito) : null),
      fecha_abono: form.fecha_abono || null,
      link_reporte: form.link_reporte || null,
    })
    await enviarAlerta("proyecto_facturacion", { nombre: proyectos.find((p:any) => p.id === form.proyecto_id)?.nombre || "—", codigo: proyectos.find((p:any) => p.id === form.proyecto_id)?.codigo || "—", cliente: "—" })
    await registrarAccion({ accion: "crear", modulo: "facturacion", entidad_tipo: "factura", descripcion: "Factura creada: " + form.numero_factura })
    setSaving(false)
    setShowForm(false)
    setVencimientoManual(false)
    setForm({ proyecto_id: "", numero_factura: "", estado: "pendiente", subtotal: "", igv: "18", detraccion_pct: "0", retencion_pct: "0", pronto_pago_entidad: "", pronto_pago_pct: "0", banco_receptor: "", fecha_emision: "", dias_credito: "30", fecha_vencimiento: "", fecha_abono: "", link_reporte: "" })
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    if (!autorizado) return

    const facturaActual = facturas.find(f => f.id === id)

    if (rowBelongsToDeletedProject(facturaActual)) {
      alert("Esta factura pertenece a un proyecto eliminado y no puede procesarse.")
      return
    }

    const { error: facturaError } = await supabase
      .from("facturas")
      .update({ estado })
      .eq("id", id)

    if (facturaError) {
      alert("No se pudo actualizar la factura: " + facturaError.message)
      return
    }

    if (estado === "cobrada" && facturaActual?.tipo_factura === "final" && facturaActual?.proyecto_id) {
      const { data: liquidacion, error: liquidacionError } = await supabase
        .from("liquidaciones")
        .select("id, cerrada, aprobado_controller")
        .eq("proyecto_id", facturaActual.proyecto_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (liquidacionError) {
        alert("Factura marcada como cobrada, pero no se pudo validar la liquidación: " + liquidacionError.message)
      } else if (liquidacion?.cerrada && liquidacion?.aprobado_controller) {
        await supabase
          .from("proyectos")
          .update({ estado: "cerrado_financiero" })
          .eq("id", facturaActual.proyecto_id)

        await registrarAccion({
          accion: "cambiar_estado",
          modulo: "proyectos",
          entidad_id: facturaActual.proyecto_id,
          entidad_tipo: "proyecto",
          descripcion: "Proyecto marcado como cerrado financiero por factura final cobrada y liquidación aprobada por Controller",
          datos_nuevos: { estado: "cerrado_financiero", liquidacion_id: liquidacion.id }
        })
      } else {
        alert("Factura marcada como cobrada. El proyecto aún no se cierra financieramente porque la liquidación no está aprobada por Controller.")
      }
    }

    load()
    if (selected?.id === id) setSelected({ ...selected, estado })
  }

  async function guardarFacturaSeleccionada() {
    if (!selected) return

    const total = Number(selected.subtotal || 0) + Number(selected.igv || 0)
    const costoFactoring = Number(selected.costo_factoring || 0)
    const otrosDescuentos = Number(selected.otros_descuentos || 0)
    const detraccion = Number(selected.detraccion_monto || 0)
    const retencion = Number(selected.retencion_monto || 0)
    const montoFinal = Number(selected.monto_final_abonado || 0) > 0
      ? Number(selected.monto_final_abonado || 0)
      : Math.max(0, total - detraccion - retencion - costoFactoring - otrosDescuentos)

    if (selected.estado === "cobrada" && !selected.fecha_abono) {
      alert("Para marcar como cobrada debes registrar fecha de abono.")
      return
    }

    const updates = {
      estado: selected.estado,
      fecha_abono: selected.fecha_abono || null,
      banco_receptor: selected.banco_receptor || null,
      tipo_cobro: selected.tipo_cobro || "directo",
      entidad_factoring: selected.entidad_factoring || null,
      costo_factoring: costoFactoring,
      otros_descuentos: otrosDescuentos,
      monto_final_abonado: montoFinal,
      observacion_cobro: selected.observacion_cobro || null,
    }

    const { error } = await supabase.from("facturas").update(updates).eq("id", selected.id)
    if (error) {
      alert("No se pudo guardar la factura: " + error.message)
      return
    }

    setSelected((prev:any) => prev ? { ...prev, ...updates } : prev)
    load()
  }
  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const m = calcularMontos()

  // Facturas filtradas
  const facturasFiltradas = facturas.filter(f =>
    (filtroEstado === "todos" || f.estado === filtroEstado) &&
    (!filtroCliente || f.proyecto?.cliente?.razon_social === filtroCliente) &&
    (!filtroProyecto || f.proyecto_id === filtroProyecto) &&
    (!filtroTipoCobro || (f.tipo_cobro || "directo") === filtroTipoCobro)
  )

  // Totales globales (sin filtro)
  const totalEmitido = facturas.filter(f => f.estado !== "anulada").reduce((s, f) => s + ((f.subtotal || 0) + (f.igv || 0)), 0)
  const totalCobrado = facturas.filter(f => f.estado === "cobrada").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
  const totalPendiente = facturas.filter(f => f.estado === "emitida").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
  const totalDetracciones = facturas.filter(f => f.estado !== "anulada").reduce((s, f) => s + (f.detraccion_monto || 0), 0)

  // Totales filtrados
  const totalFiltradoFactura = facturasFiltradas.filter(f => f.estado !== "anulada").reduce((s, f) => s + ((f.subtotal || 0) + (f.igv || 0)), 0)
  const totalFiltradoAbonado = facturasFiltradas.filter(f => f.estado !== "anulada").reduce((s, f) => s + (f.monto_final_abonado || 0), 0)
  const totalFiltradoDetraccion = facturasFiltradas.filter(f => f.estado !== "anulada").reduce((s, f) => s + (f.detraccion_monto || 0), 0)

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Facturación</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{facturas.length} facturas registradas</p>
        </div>
        <ImportExport modulo="facturas" campos={[{key:"numero_factura",label:"N factura",requerido:true},{key:"subtotal",label:"Subtotal"},{key:"detraccion_pct",label:"Detraccion %"},{key:"retencion_pct",label:"Retencion %"},{key:"banco_receptor",label:"Banco"},{key:"fecha_emision",label:"Fecha emision"},{key:"dias_credito",label:"Dias credito"},{key:"fecha_vencimiento",label:"Fecha vencimiento"},{key:"fecha_abono",label:"Fecha abono"}]} datos={facturas} onImportar={async (registros) => { let exitosos=0; const errores:string[]=[]; for(const r of registros){const diasCredito=Number(r.dias_credito)||30; const fechaVencimiento=r.fecha_vencimiento||(r.fecha_emision?calcularFechaVencimiento(r.fecha_emision,String(diasCredito)):null); const{error}=await supabase.from("facturas").insert({...r,dias_credito:diasCredito,fecha_vencimiento:fechaVencimiento,estado:"pendiente",igv:(Number(r.subtotal)||0)*0.18,monto_final_abonado:Number(r.subtotal)||0}); if(error)errores.push(r.numero_factura+": "+error.message); else exitosos++;} load(); return{exitosos,errores}; }} />
        <button onClick={() => { setVencimientoManual(false); setShowForm(true) }} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva factura</button>
      </div>
      <FinanceDataError detail={error} />

      {pendientesFacturacion.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 18, border: "1px solid #bbf7d0", borderRadius: 18, background: "#f0fdf4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F6E56", margin: 0 }}>Pendientes de facturación</h2>
              <p style={{ fontSize: 12, color: "#166534", margin: "4px 0 0" }}>Proyectos terminados o liquidados disponibles para emitir factura.</p>
            </div>
            <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800 }}>
              {pendientesFacturacion.length} pendiente(s)
            </span>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {pendientesFacturacion.map((p: any) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, alignItems: "center", background: "#fff", border: "1px solid #dcfce7", borderRadius: 12, padding: "10px 12px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{p.codigo} — {p.nombre}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{p.cliente?.razon_social || "Sin cliente"}</div>
                </div>
                <button
                  className="btn-primary"
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    setVencimientoManual(false)
                    setForm(prev => ({
                      ...prev,
                      proyecto_id: p.id,
                      estado: "pendiente"
                    }))
                    setShowForm(true)
                  }}
                >
                  Crear factura
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Cards resumen global */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiCard
          icon="chart"
          label="Total emitido"
          value={fmt(totalEmitido)}
          sub={`${facturas.length} facturas`}
          borderColor="#3B82F6"
          valueColor="#1E40AF"
        />

        <KpiCard
          icon="wallet"
          label="Por cobrar"
          value={fmt(totalPendiente)}
          sub={`${facturas.filter(f => f.estado === "emitida").length} pendientes`}
          borderColor="#F59E0B"
          valueColor="#92400E"
        />

        <KpiCard
          icon="money"
          label="Cobrado"
          value={fmt(totalCobrado)}
          sub={`${facturas.filter(f => f.estado === "cobrada").length} cobradas`}
          borderColor="#10B981"
          valueColor="#166534"
        />

        <KpiCard
          icon="shield"
          label="Detracciones"
          value={fmt(totalDetracciones)}
          sub="Aplicadas"
          borderColor="#8B5CF6"
          valueColor="#6D28D9"
        />
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select style={{ ...inp, width: "auto" }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {[...new Set(facturas.map(f => f.proyecto?.cliente?.razon_social).filter(Boolean))].map((cliente:any) => (
            <option key={cliente} value={cliente}>{cliente}</option>
          ))}
        </select>

        <select style={{ ...inp, width: "auto" }} value={filtroProyecto} onChange={e => setFiltroProyecto(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((p:any) => (
            <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
          ))}
        </select>

        <select style={{ ...inp, width: "auto" }} value={filtroTipoCobro} onChange={e => setFiltroTipoCobro(e.target.value)}>
          <option value="">Todos los tipos de cobro</option>
          <option value="directo">Directo</option>
          <option value="factoring_cliente">Factoring cliente</option>
          <option value="factoring_externo">Factoring externo</option>
        </select>

        <button
          onClick={() => { setFiltroEstado("todos"); setFiltroCliente(""); setFiltroProyecto(""); setFiltroTipoCobro("") }}
          className="btn-secondary"
          style={{ fontSize: 12 }}
        >
          Limpiar
        </button>

        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {facturasFiltradas.length} facturas · Total: <strong>{fmt(totalFiltradoFactura)}</strong> · A abonar: <strong>{fmt(totalFiltradoAbonado)}</strong> · Detracciones: <strong style={{ color: "#6d28d9" }}>{fmt(totalFiltradoDetraccion)}</strong>
        </span>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 600, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", color: "#111827" }}>Nueva factura</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>PROYECTO *</label>
                  <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                    <option value="">Seleccionar proyecto</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>N° FACTURA *</label>
                  <input style={inp} value={form.numero_factura} placeholder="F001-00001" onChange={e => setForm({ ...form, numero_factura: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>SUBTOTAL S/ *</label>
                  <input type="number" style={inp} value={form.subtotal} placeholder="0.00" onChange={e => setForm({ ...form, subtotal: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>IGV %</label>
                  <input type="number" style={inp} value={form.igv} onChange={e => setForm({ ...form, igv: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ESTADO</label>
                  <select style={inp} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>DETRACCIÓN %</label>
                  <input type="number" style={inp} value={form.detraccion_pct} onChange={e => setForm({ ...form, detraccion_pct: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>RETENCIÓN %</label>
                  <input type="number" style={inp} value={form.retencion_pct} onChange={e => setForm({ ...form, retencion_pct: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>PRONTO PAGO %</label>
                  <input type="number" style={inp} value={form.pronto_pago_pct} onChange={e => setForm({ ...form, pronto_pago_pct: e.target.value })} />
                </div>
              </div>
              {Number(form.pronto_pago_pct) > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ENTIDAD PRONTO PAGO</label>
                  <input style={inp} value={form.pronto_pago_entidad} placeholder="Nombre de la entidad" onChange={e => setForm({ ...form, pronto_pago_entidad: e.target.value })} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>BANCO RECEPTOR</label>
                  <select style={inp} value={form.banco_receptor} onChange={e => setForm({ ...form, banco_receptor: e.target.value })}>
                    <option value="">Sin banco</option>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>FECHA EMISIÓN</label>
                  <input type="date" style={inp} value={form.fecha_emision} onChange={e => { const fecha_emision = e.target.value; setForm({ ...form, fecha_emision, fecha_vencimiento: vencimientoManual ? form.fecha_vencimiento : calcularFechaVencimiento(fecha_emision, form.dias_credito) }) }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>DÍAS CRÉDITO</label>
                  <input type="number" min="0" style={inp} value={form.dias_credito} onChange={e => { const dias_credito = e.target.value; setForm({ ...form, dias_credito, fecha_vencimiento: vencimientoManual ? form.fecha_vencimiento : calcularFechaVencimiento(form.fecha_emision, dias_credito) }) }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>FECHA VENCIMIENTO</label>
                  <input type="date" style={inp} value={form.fecha_vencimiento} onChange={e => { setVencimientoManual(true); setForm({ ...form, fecha_vencimiento: e.target.value }) }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>FECHA ABONO</label>
                  <input type="date" style={inp} value={form.fecha_abono} onChange={e => setForm({ ...form, fecha_abono: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>LINK REPORTE GOOGLE DRIVE</label>
                <input style={inp} value={form.link_reporte || ""} placeholder="https://drive.google.com/..." onChange={e => setForm({ ...form, link_reporte: e.target.value })} />
              </div>
              {Number(form.subtotal) > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #1D9E75", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase", marginBottom: 8 }}>Resumen</div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {[
                      { label: "Subtotal", value: fmt(m.subtotal) },
                      { label: `IGV (${form.igv}%)`, value: fmt(m.igvMonto) },
                      { label: "Total factura", value: fmt(m.total), bold: true },
                      ...(m.detraccionMonto > 0 ? [{ label: `Detracción (${form.detraccion_pct}%)`, value: "- " + fmt(m.detraccionMonto), highlight: "#6d28d9" }] : []),
                      ...(m.retencionMonto > 0 ? [{ label: `Retención (${form.retencion_pct}%)`, value: "- " + fmt(m.retencionMonto) }] : []),
                      ...(m.prontoPagoMonto > 0 ? [{ label: `Pronto pago (${form.pronto_pago_pct}%)`, value: "- " + fmt(m.prontoPagoMonto) }] : []),
                      { label: "Monto a abonar", value: fmt(m.montoFinal), bold: true, color: "#0F6E56" },
                    ].map((r: any) => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{r.label}</span>
                        <span style={{ fontSize: 12, fontWeight: r.bold ? 700 : 400, color: r.color || r.highlight || "#374151" }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : "Crear factura"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #E2E8F0", borderRadius: 18, background: "#fff", boxShadow: "0 10px 24px rgba(15,23,42,0.06)" }}>
        {facturasFiltradas.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay facturas registradas</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N° FACTURA</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CLIENTE</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TOTAL</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6d28d9" }}>DETRACCIÓN</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>A ABONAR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>EMISIÓN</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>VENCIMIENTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ABONO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>REPORTE</th>
                <th style={{ padding: "10px 20px", width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((f, idx) => {
                const ec = ESTADOS[f.estado] || { bg: "#f3f4f6", color: "#6b7280", label: f.estado }
                const total = (f.subtotal || 0) + (f.igv || 0)
                return (
                  <tr key={f.id} onClick={() => setSelected(f)} style={{ borderTop: "1px solid #F1F5F9", background: selected?.id === f.id ? "#F0FDF4" : "#FFFFFF", cursor: "pointer" }}>
                    <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#111827" }}>{f.numero_factura}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{f.proyecto?.codigo}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{f.proyecto?.nombre}</div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{f.proyecto?.cliente?.razon_social || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#374151" }}>{fmt(total)}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      {f.detraccion_monto > 0 ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#6d28d9" }}>- {fmt(f.detraccion_monto)}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>{f.detraccion_pct}%</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{fmt(f.monto_final_abonado)}</td>
                    <td style={{ padding: "12px" }}>
                      <StatusBadge label={ec.label} type={f.estado} />
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{f.fecha_emision || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{f.fecha_vencimiento || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{f.fecha_abono || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      {f.link_reporte ? <a href={f.link_reporte} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600 }}>📁 Ver</a> : <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <select style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, fontFamily: "inherit", background: "#fff", cursor: "pointer" }}
                        value={f.estado} onChange={e => cambiarEstado(f.id, e.target.value)}>
                        {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Footer con totales filtrados */}
            <tfoot>
              <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                <td colSpan={3} style={{ padding: "10px 20px", fontSize: 12, fontWeight: 700, color: "#374151" }}>
                  TOTALES {filtroEstado !== "todos" ? `(${ESTADOS[filtroEstado]?.label})` : "(todos)"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#374151" }}>{fmt(totalFiltradoFactura)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#6d28d9" }}>- {fmt(totalFiltradoDetraccion)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#0F6E56" }}>{fmt(totalFiltradoAbonado)}</td>
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      {selected && (
        <div className="card" style={{ position: "fixed", right: 24, top: 90, width: 420, maxHeight: "calc(100vh - 120px)", overflowY: "auto", zIndex: 50, padding: 18, border: "1px solid #E2E8F0", borderRadius: 18, background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>{selected.numero_factura}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{selected.proyecto?.codigo} — {selected.proyecto?.nombre}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{selected.proyecto?.cliente?.razon_social || "Sin cliente"}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "#94A3B8" }}>×</button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>Total factura</span><strong>{fmt(Number(selected.subtotal || 0) + Number(selected.igv || 0))}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>Detracción</span><strong>{fmt(selected.detraccion_monto || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>Retención</span><strong>{fmt(selected.retencion_monto || 0)}</strong>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Estado</label>
              <select style={inp} value={selected.estado || "pendiente"} onChange={e => setSelected({ ...selected, estado: e.target.value })}>
                {Object.entries(ESTADOS).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Fecha abono</label>
                <input type="date" style={inp} value={selected.fecha_abono || ""} onChange={e => setSelected({ ...selected, fecha_abono: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Banco receptor</label>
                <input style={inp} value={selected.banco_receptor || ""} onChange={e => setSelected({ ...selected, banco_receptor: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Tipo de cobro</label>
              <select style={inp} value={selected.tipo_cobro || "directo"} onChange={e => setSelected({ ...selected, tipo_cobro: e.target.value })}>
                <option value="directo">Directo</option>
                <option value="factoring_cliente">Factoring cliente</option>
                <option value="factoring_externo">Factoring externo</option>
              </select>
            </div>

            {(selected.tipo_cobro || "directo") !== "directo" && (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Entidad factoring</label>
                <input style={inp} value={selected.entidad_factoring || ""} onChange={e => setSelected({ ...selected, entidad_factoring: e.target.value })} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Costo factoring</label>
                <input type="number" style={inp} value={selected.costo_factoring || ""} onChange={e => setSelected({ ...selected, costo_factoring: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Otros descuentos</label>
                <input type="number" style={inp} value={selected.otros_descuentos || ""} onChange={e => setSelected({ ...selected, otros_descuentos: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Monto depositado real</label>
              <input type="number" style={{ ...inp, fontWeight: 800, color: "#0F6E56" }} value={selected.monto_final_abonado || ""} onChange={e => setSelected({ ...selected, monto_final_abonado: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Observación cobranza</label>
              <textarea rows={3} style={{ ...inp, resize: "vertical" }} value={selected.observacion_cobro || ""} onChange={e => setSelected({ ...selected, observacion_cobro: e.target.value })} />
            </div>

            <button onClick={guardarFacturaSeleccionada} className="btn-primary" style={{ fontSize: 13 }}>
              Guardar cobranza
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

























