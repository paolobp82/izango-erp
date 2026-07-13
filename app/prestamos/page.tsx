"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import { puedeAccederRuta } from "@/lib/permissions"

const TIPOS_PRESTAMISTA: Record<string, string> = {
  banco: "Banco", entidad_financiera: "Entidad financiera",
  persona_natural: "Persona natural", familiar: "Familiar", otro: "Otro"
}
const SISTEMAS: Record<string, string> = {
  frances: "Francés (cuota fija)", aleman: "Alemán (capital fijo)", fijo: "Cuota fija manual"
}
const ESTADOS: Record<string, any> = {
  activo:       { label: "Activo",       bg: "#dbeafe", color: "#1e40af" },
  pagado:       { label: "Pagado",       bg: "#dcfce7", color: "#15803d" },
  refinanciado: { label: "Refinanciado", bg: "#fef9c3", color: "#92400e" },
  cancelado:    { label: "Cancelado",    bg: "#fee2e2", color: "#991b1b" },
}
const ESTADOS_CUOTA: Record<string, any> = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  pagado:    { label: "Pagado",    bg: "#dcfce7", color: "#15803d" },
  vencido:   { label: "Vencido",   bg: "#fee2e2", color: "#991b1b" },
  parcial:   { label: "Parcial",   bg: "#e0f2fe", color: "#0369a1" },
}
const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Banco de la Nacion", "Otro"]
const ROLES = ["controller", "gerente_general", "superadmin"]

const formVacio = {
  tipo: "empresa", nombre: "", prestamista: "", tipo_prestamista: "banco",
  monto_original: "", tasa_interes: "", tipo_tasa: "mensual",
  sistema_cuotas: "frances", num_cuotas: "", fecha_inicio: "", fecha_vencimiento: "",
  banco_prestamista: "", cuenta_prestamista: "", tiene_contrato: false,
  link_contrato: "", empleado_id: "", observaciones: "",
}

// ── Cálculo de cuotas ──────────────────────────────────────────────
function generarCuotas(form: any): any[] {
  const monto = Number(form.monto_original)
  const n = parseInt(form.num_cuotas)
  const tasaMensual = form.tipo_tasa === "anual"
    ? Number(form.tasa_interes) / 100 / 12
    : Number(form.tasa_interes) / 100
  const fechaInicio = new Date(form.fecha_inicio)
  if (!monto || !n || isNaN(fechaInicio.getTime())) return []

  const cuotas = []

  if (form.sistema_cuotas === "frances") {
    // Cuota fija = M * r * (1+r)^n / ((1+r)^n - 1)
    let cuotaFija = 0
    if (tasaMensual === 0) {
      cuotaFija = monto / n
    } else {
      cuotaFija = monto * tasaMensual * Math.pow(1 + tasaMensual, n) / (Math.pow(1 + tasaMensual, n) - 1)
    }
    let saldo = monto
    for (let i = 1; i <= n; i++) {
      const interes = saldo * tasaMensual
      const capital = cuotaFija - interes
      saldo -= capital
      const fecha = new Date(fechaInicio)
      fecha.setMonth(fecha.getMonth() + i)
      cuotas.push({
        numero_cuota: i,
        fecha_vencimiento: fecha.toISOString().split("T")[0],
        monto_capital: Math.round(capital * 100) / 100,
        monto_interes: Math.round(interes * 100) / 100,
        monto_total: Math.round(cuotaFija * 100) / 100,
        estado: "pendiente", monto_pagado: 0,
      })
    }
  } else if (form.sistema_cuotas === "aleman") {
    // Capital fijo, interés sobre saldo
    const capitalCuota = monto / n
    let saldo = monto
    for (let i = 1; i <= n; i++) {
      const interes = saldo * tasaMensual
      const total = capitalCuota + interes
      saldo -= capitalCuota
      const fecha = new Date(fechaInicio)
      fecha.setMonth(fecha.getMonth() + i)
      cuotas.push({
        numero_cuota: i,
        fecha_vencimiento: fecha.toISOString().split("T")[0],
        monto_capital: Math.round(capitalCuota * 100) / 100,
        monto_interes: Math.round(interes * 100) / 100,
        monto_total: Math.round(total * 100) / 100,
        estado: "pendiente", monto_pagado: 0,
      })
    }
  } else {
    // Fijo manual — cuota igual sin cálculo de interés automático
    const cuotaFija = monto / n
    for (let i = 1; i <= n; i++) {
      const fecha = new Date(fechaInicio)
      fecha.setMonth(fecha.getMonth() + i)
      cuotas.push({
        numero_cuota: i,
        fecha_vencimiento: fecha.toISOString().split("T")[0],
        monto_capital: Math.round(cuotaFija * 100) / 100,
        monto_interes: 0,
        monto_total: Math.round(cuotaFija * 100) / 100,
        estado: "pendiente", monto_pagado: 0,
      })
    }
  }
  return cuotas
}

export default function PrestamosPage() {
  const supabase = createClient()
  const [prestamos, setPrestamos] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [cuotas, setCuotas] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [showPago, setShowPago] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<any>(null)
  const [form, setForm] = useState<any>({ ...formVacio })
  const [formPago, setFormPago] = useState({ monto: "", fecha_pago: "", banco: "", numero_operacion: "", tipo: "cuota", observaciones: "" })
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [cuotasPreview, setCuotasPreview] = useState<any[]>([])
  const [cuotasResumen, setCuotasResumen] = useState<any[]>([])
  const [pagosResumen, setPagosResumen] = useState<any[]>([])

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

    const puedeVer = puedeAccederRuta(p?.perfil, "/prestamos")
    setAutorizado(puedeVer)

    if (!puedeVer) {
      setLoading(false)
      return
    }

    const { data: pr } = await supabase
      .from("prestamos")
      .select("*, empleado:rrhh_trabajadores(nombre, apellido), registrador:perfiles!registrado_por(nombre, apellido)")
      .order("created_at", { ascending: false })

    setPrestamos(pr || [])

    const idsPrestamos = (pr || []).map((p: any) => p.id)

    if (idsPrestamos.length > 0) {
      const { data: cuotasAll } = await supabase
        .from("prestamo_cuotas")
        .select("*")
        .in("prestamo_id", idsPrestamos)

      const { data: pagosAll } = await supabase
        .from("prestamo_pagos")
        .select("*")
        .in("prestamo_id", idsPrestamos)

      setCuotasResumen(cuotasAll || [])
      setPagosResumen(pagosAll || [])
    } else {
      setCuotasResumen([])
      setPagosResumen([])
    }

    const { data: em } = await supabase
      .from("rrhh_trabajadores")
      .select("id, nombre, apellido")
      .eq("activo", true)
      .order("apellido")

    setEmpleados(em || [])
    setLoading(false)
  }
  async function loadDetalle(prestamo: any) {
    setSelected(prestamo)
    const { data: c } = await supabase.from("prestamo_cuotas").select("*").eq("prestamo_id", prestamo.id).order("numero_cuota")
    const { data: p } = await supabase.from("prestamo_pagos").select("*, registrador:perfiles!registrado_por(nombre, apellido)").eq("prestamo_id", prestamo.id).order("fecha_pago", { ascending: false })
    setCuotas(c || [])
    setPagos(p || [])
  }

  async function guardar() {
    if (!autorizado || !puedeGestionar) return
    if (!form.nombre || !form.prestamista || !form.monto_original || !form.num_cuotas || !form.fecha_inicio) {
      alert("Nombre, prestamista, monto, cuotas y fecha son obligatorios"); return
    }
    setSaving(true)
    const { data: nuevo } = await supabase.from("prestamos").insert({
      tipo: form.tipo,
      nombre: form.nombre,
      prestamista: form.prestamista,
      tipo_prestamista: form.tipo_prestamista,
      monto_original: Number(form.monto_original),
      tasa_interes: Number(form.tasa_interes) || 0,
      tipo_tasa: form.tipo_tasa,
      sistema_cuotas: form.sistema_cuotas,
      num_cuotas: parseInt(form.num_cuotas),
      fecha_inicio: form.fecha_inicio,
      fecha_vencimiento: form.fecha_vencimiento || null,
      banco_prestamista: form.banco_prestamista || null,
      cuenta_prestamista: form.cuenta_prestamista || null,
      tiene_contrato: form.tiene_contrato,
      link_contrato: form.link_contrato || null,
      empleado_id: form.empleado_id || null,
      observaciones: form.observaciones || null,
      registrado_por: perfil?.id || null,
      entidad: "peru",
    }).select().single()

    if (nuevo) {
      const cuotasGen = generarCuotas(form)
      if (cuotasGen.length > 0) {
        await supabase.from("prestamo_cuotas").insert(cuotasGen.map(c => ({ ...c, prestamo_id: nuevo.id })))
      }
    }

    await registrarAccion({ accion: "crear", modulo: "prestamos", entidad_tipo: "prestamo", descripcion: "Préstamo creado: " + form.nombre })
    setSaving(false)
    setShowForm(false)
    setForm({ ...formVacio })
    load()
  }

  async function registrarPago() {
    if (!autorizado || !puedeGestionar) return
    if (!formPago.monto || !formPago.fecha_pago) { alert("Monto y fecha son obligatorios"); return }
    const monto = Number(formPago.monto)
    await supabase.from("prestamo_pagos").insert({
      prestamo_id: selected.id,
      cuota_id: cuotaSeleccionada?.id || null,
      tipo: formPago.tipo,
      monto,
      fecha_pago: formPago.fecha_pago,
      banco: formPago.banco || null,
      numero_operacion: formPago.numero_operacion || null,
      observaciones: formPago.observaciones || null,
      registrado_por: perfil?.id || null,
    })
    // Actualizar cuota si aplica
    if (cuotaSeleccionada) {
      const nuevoPagado = (cuotaSeleccionada.monto_pagado || 0) + monto
      const nuevoEstado = nuevoPagado >= cuotaSeleccionada.monto_total ? "pagado" : "parcial"
      await supabase.from("prestamo_cuotas").update({ monto_pagado: nuevoPagado, estado: nuevoEstado, fecha_pago: formPago.fecha_pago }).eq("id", cuotaSeleccionada.id)
    }
    // Recalcular saldo y estado del préstamo
    const { data: todosLosPagos } = await supabase.from("prestamo_pagos").select("monto").eq("prestamo_id", selected.id)
    const totalPagado = (todosLosPagos || []).reduce((s: number, p: any) => s + p.monto, 0) + monto
    if (totalPagado >= selected.monto_original) {
      await supabase.from("prestamos").update({ estado: "pagado" }).eq("id", selected.id)
    }
    setShowPago(false)
    setCuotaSeleccionada(null)
    setFormPago({ monto: "", fecha_pago: "", banco: "", numero_operacion: "", tipo: "cuota", observaciones: "" })
    await loadDetalle(selected)
    load()
  }

  async function cambiarEstadoPrestamo(id: string, estado: string) {
    if (!autorizado || !puedeGestionar) return
    await supabase.from("prestamos").update({ estado }).eq("id", id)
    setSelected((prev: any) => ({ ...prev, estado }))
    load()
  }

  const puedeGestionar = perfil && ROLES.includes(perfil.perfil)
  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

  const prestamosFiltrados = prestamos.filter(p => {
    if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false
    return true
  })

  const totalDeuda = prestamos.filter(p => p.estado === "activo").reduce((s, p) => s + (p.monto_original || 0), 0)

  const obligacionesActivas = prestamos.filter(p => p.estado === "activo")
  const idsActivos = new Set(obligacionesActivas.map(p => p.id))
  const cuotasActivas = cuotasResumen.filter(c => idsActivos.has(c.prestamo_id))
  const pagosActivos = pagosResumen.filter(p => idsActivos.has(p.prestamo_id))

  const capitalActivo = obligacionesActivas.reduce((s, p) => s + Number(p.monto_original || 0), 0)
  const gastoFinancieroActivo = cuotasActivas.reduce((s, c) => s + Number(c.monto_interes || 0), 0)
  const cronogramaActivo = cuotasActivas.reduce((s, c) => s + Number(c.monto_total || 0), 0)
  const pagadoActivo = pagosActivos.reduce((s, p) => s + Number(p.monto || 0), 0)
  const saldoFinancieroActivo = Math.max(cronogramaActivo - pagadoActivo, 0)
  const hoyObligaciones = new Date().toISOString().slice(0, 10)
  const cuotasPendientesActivas = cuotasActivas.filter(c => c.estado !== "pagado")
  const cuotasVencidasActivas = cuotasPendientesActivas.filter(c => c.fecha_vencimiento && c.fecha_vencimiento < hoyObligaciones)
  const proximaCuotaGlobal = cuotasPendientesActivas
    .slice()
    .sort((a, b) => String(a.fecha_vencimiento || "").localeCompare(String(b.fecha_vencimiento || "")))[0]

  // Calcular saldo de préstamo seleccionado
  const totalPagadoSelected = pagos.reduce((s, p) => s + (p.monto || 0), 0)
  const saldoSelected = selected ? selected.monto_original - totalPagadoSelected : 0
  const proximaCuota = cuotas.find(c => c.estado !== "pagado")

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  if (!autorizado) return <div style={{ padding: 24, color: "#991b1b", fontWeight: 700 }}>Acceso no autorizado</div>

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 80px)" }}>

      {/* ── PANEL IZQUIERDO ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Obligaciones Financieras</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{prestamos.length} obligaciones registradas · Deuda activa: {fmt(totalDeuda)}</p>
          </div>
          {puedeGestionar && (
            <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva obligación</button>
          )}
        </div>

        {/* Filtros */}        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Capital activo", value: fmt(capitalActivo) },
            { label: "Gasto financiero", value: fmt(gastoFinancieroActivo) },
            { label: "Cronograma total", value: fmt(cronogramaActivo) },
            { label: "Saldo financiero", value: fmt(saldoFinancieroActivo) },
            { label: "Cuotas vencidas", value: `${cuotasVencidasActivas.length}` },
            { label: "Próximo vencimiento", value: proximaCuotaGlobal?.fecha_vencimiento || "—" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 16, color: "#111827", fontWeight: 800 }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <select style={{ ...inp, width: "auto" }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            <option value="empresa">Empresa</option>
            <option value="empleado">Empleado</option>
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Lista deudas y financiamientos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {prestamosFiltrados.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay deudas o financiamientos registrados</div>
          ) : prestamosFiltrados.map(p => {
            const es = ESTADOS[p.estado] || ESTADOS.activo
            const activo = selected?.id === p.id
            return (
              <div key={p.id} onClick={() => loadDetalle(p)}
                style={{ background: activo ? "#f0fdf4" : "#fff", border: activo ? "1.5px solid #1D9E75" : "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{p.nombre}</span>
                      <span style={{ background: es.bg, color: es.color, fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 99 }}>{es.label}</span>
                      <span style={{ background: "#f3f4f6", color: "#374151", fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 99 }}>{p.tipo === "empresa" ? "Empresa" : "Empleado"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      {TIPOS_PRESTAMISTA[p.tipo_prestamista] || p.tipo_prestamista}: <strong>{p.prestamista}</strong>
                      {p.empleado && <span style={{ marginLeft: 8 }}>· {p.empleado.nombre} {p.empleado.apellido}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#374151" }}>💰 {fmt(p.monto_original)}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {p.fecha_inicio}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{p.num_cuotas} cuotas · {p.tasa_interes}% {p.tipo_tasa}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{SISTEMAS[p.sistema_cuotas]}</span>
                      {p.tiene_contrato && <span style={{ fontSize: 11, color: "#1e40af", background: "#dbeafe", padding: "1px 6px", borderRadius: 99 }}>📄 Contrato</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── PANEL DERECHO (detalle) ── */}
      {selected && (
        <div style={{ width: 420, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowY: "auto", flexShrink: 0 }}>
          {/* Header detalle */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{selected.nombre}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{selected.prestamista}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>×</button>
          </div>

          {/* Resumen financiero */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Monto original", value: fmt(selected.monto_original), color: "#374151" },
                { label: "Total pagado", value: fmt(totalPagadoSelected), color: "#15803d" },
                { label: "Saldo pendiente", value: fmt(Math.max(saldoSelected, 0)), color: saldoSelected > 0 ? "#991b1b" : "#15803d" },
              ].map(r => (
                <div key={r.label} style={{ textAlign: "center", background: "#f9fafb", borderRadius: 8, padding: "8px 4px" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.value}</div>
                </div>
              ))}
            </div>

            {proximaCuota && (
              <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
                <strong>Próxima cuota:</strong> #{proximaCuota.numero_cuota} — {fmt(proximaCuota.monto_total)} · Vence: {proximaCuota.fecha_vencimiento}
              </div>
            )}

            {/* Cambiar estado */}
            {puedeGestionar && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {Object.entries(ESTADOS).map(([k, v]) => (
                  <button key={k} onClick={() => cambiarEstadoPrestamo(selected.id, k)}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, border: selected.estado === k ? `2px solid ${v.color}` : "1px solid #e5e7eb", background: selected.estado === k ? v.bg : "#fff", color: selected.estado === k ? v.color : "#6b7280", cursor: "pointer", fontWeight: selected.estado === k ? 700 : 400 }}>
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info del préstamo */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>DATOS DEL PRÉSTAMO</div>
            <div style={{ display: "grid", gap: 6 }}>
              {[
                { label: "Tipo prestamista", value: TIPOS_PRESTAMISTA[selected.tipo_prestamista] || "—" },
                { label: "Sistema cuotas", value: SISTEMAS[selected.sistema_cuotas] || "—" },
                { label: "Tasa interés", value: `${selected.tasa_interes}% ${selected.tipo_tasa}` },
                { label: "N° cuotas", value: selected.num_cuotas },
                { label: "Fecha inicio", value: selected.fecha_inicio },
                { label: "Banco prestamista", value: selected.banco_prestamista || "—" },
                { label: "Cuenta prestamista", value: selected.cuenta_prestamista || "—" },
                { label: "Contrato", value: selected.tiene_contrato ? "Sí" : "No" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#9ca3af" }}>{r.label}</span>
                  <span style={{ color: "#374151", fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
              {selected.link_contrato && (
                <a href={selected.link_contrato} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#0F6E56", fontWeight: 600 }}>📄 Ver contrato</a>
              )}
            </div>
          </div>

          {/* Cuotas */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CRONOGRAMA DE CUOTAS ({cuotas.length})</div>
              {puedeGestionar && (
                <button onClick={() => { setShowPago(true); setCuotaSeleccionada(null); setFormPago({ ...formPago, tipo: "prepago" }) }}
                  style={{ fontSize: 11, padding: "3px 10px", background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                  + Prepago
                </button>
              )}
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {cuotas.map(c => {
                const ec = ESTADOS_CUOTA[c.estado] || ESTADOS_CUOTA.pendiente
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: ec.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: ec.color }}>{c.numero_cuota}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{fmt(c.monto_total)}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>Capital: {fmt(c.monto_capital)} · Interés: {fmt(c.monto_interes)} · {c.fecha_vencimiento}</div>
                      {c.monto_pagado > 0 && <div style={{ fontSize: 10, color: "#15803d" }}>Pagado: {fmt(c.monto_pagado)}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ background: ec.bg, color: ec.color, fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 99 }}>{ec.label}</span>
                      {puedeGestionar && c.estado !== "pagado" && (
                        <button onClick={() => { setCuotaSeleccionada(c); setFormPago({ ...formPago, monto: String(c.monto_total - c.monto_pagado), tipo: "cuota" }); setShowPago(true) }}
                          style={{ fontSize: 10, padding: "2px 6px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Historial de pagos */}
          <div style={{ padding: "12px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>HISTORIAL DE PAGOS ({pagos.length})</div>
            {pagos.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Sin pagos registrados</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pagos.map(p => (
                  <div key={p.id} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{fmt(p.monto)}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{p.fecha_pago}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {p.tipo === "prepago" ? "🔄 Prepago" : p.tipo === "pago_total" ? "✅ Pago total" : `Cuota`}
                      {p.banco && ` · ${p.banco}`}
                      {p.numero_operacion && ` · Op: ${p.numero_operacion}`}
                    </div>
                    {p.registrador && <div style={{ fontSize: 10, color: "#9ca3af" }}>Registrado por: {p.registrador.nombre} {p.registrador.apellido}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL PAGO ── */}
      {showPago && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                {formPago.tipo === "prepago" ? "Registrar prepago" : cuotaSeleccionada ? `Pagar cuota #${cuotaSeleccionada.numero_cuota}` : "Registrar pago"}
              </h3>
              <button onClick={() => { setShowPago(false); setCuotaSeleccionada(null) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af" }}>×</button>
            </div>
            {cuotaSeleccionada && (
              <div style={{ background: "#f0fdf4", border: "1px solid #1D9E75", borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
                Cuota #{cuotaSeleccionada.numero_cuota} · Total: {fmt(cuotaSeleccionada.monto_total)} · Pendiente: {fmt(cuotaSeleccionada.monto_total - cuotaSeleccionada.monto_pagado)}
              </div>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>MONTO S/ *</label>
                  <input type="number" style={inp} value={formPago.monto} onChange={e => setFormPago({ ...formPago, monto: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>FECHA *</label>
                  <input type="date" style={inp} value={formPago.fecha_pago} onChange={e => setFormPago({ ...formPago, fecha_pago: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>BANCO</label>
                  <select style={inp} value={formPago.banco} onChange={e => setFormPago({ ...formPago, banco: e.target.value })}>
                    <option value="">Sin banco</option>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>N° OPERACIÓN</label>
                  <input style={inp} value={formPago.numero_operacion} placeholder="Código operación" onChange={e => setFormPago({ ...formPago, numero_operacion: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={lbl}>TIPO DE PAGO</label>
                <select style={inp} value={formPago.tipo} onChange={e => setFormPago({ ...formPago, tipo: e.target.value })}>
                  <option value="cuota">Cuota regular</option>
                  <option value="prepago">Prepago</option>
                  <option value="pago_total">Pago total</option>
                </select>
              </div>
              <div>
                <label style={lbl}>OBSERVACIONES</label>
                <input style={inp} value={formPago.observaciones} placeholder="Notas..." onChange={e => setFormPago({ ...formPago, observaciones: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => { setShowPago(false); setCuotaSeleccionada(null) }} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={registrarPago} className="btn-primary" style={{ fontSize: 13 }}>Registrar pago</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO PRÉSTAMO ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>Nueva deuda o financiamiento</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {/* Tipo */}
              <div style={{ display: "flex", gap: 10 }}>
                {["empresa", "empleado"].map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: form.tipo === t ? "2px solid #0F6E56" : "1px solid #e5e7eb", background: form.tipo === t ? "#f0fdf4" : "#fff", color: form.tipo === t ? "#0F6E56" : "#6b7280", fontWeight: form.tipo === t ? 700 : 400, cursor: "pointer", fontSize: 13 }}>
                    {t === "empresa" ? "🏢 Préstamo empresa" : "👤 Préstamo empleado"}
                  </button>
                ))}
              </div>
              <div>
                <label style={lbl}>NOMBRE DEL PRÉSTAMO *</label>
                <input style={inp} value={form.nombre} placeholder="Ej: Préstamo BCP capital trabajo" onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>PRESTAMISTA *</label>
                  <input style={inp} value={form.prestamista} placeholder="Nombre del banco o persona" onChange={e => setForm({ ...form, prestamista: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>TIPO PRESTAMISTA</label>
                  <select style={inp} value={form.tipo_prestamista} onChange={e => setForm({ ...form, tipo_prestamista: e.target.value })}>
                    {Object.entries(TIPOS_PRESTAMISTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              {form.tipo === "empleado" && (
                <div>
                  <label style={lbl}>EMPLEADO</label>
                  <select style={inp} value={form.empleado_id} onChange={e => setForm({ ...form, empleado_id: e.target.value })}>
                    <option value="">Seleccionar empleado</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>MONTO ORIGINAL S/ *</label>
                  <input type="number" style={inp} value={form.monto_original} placeholder="0.00" onChange={e => setForm({ ...form, monto_original: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>N° CUOTAS *</label>
                  <input type="number" style={inp} value={form.num_cuotas} placeholder="12" onChange={e => setForm({ ...form, num_cuotas: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>TASA INTERÉS %</label>
                  <input type="number" style={inp} value={form.tasa_interes} placeholder="0.00" onChange={e => setForm({ ...form, tasa_interes: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>TIPO TASA</label>
                  <select style={inp} value={form.tipo_tasa} onChange={e => setForm({ ...form, tipo_tasa: e.target.value })}>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>SISTEMA CUOTAS</label>
                  <select style={inp} value={form.sistema_cuotas} onChange={e => setForm({ ...form, sistema_cuotas: e.target.value })}>
                    {Object.entries(SISTEMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>FECHA INICIO *</label>
                  <input type="date" style={inp} value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>FECHA VENCIMIENTO</label>
                  <input type="date" style={inp} value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>BANCO PRESTAMISTA</label>
                  <select style={inp} value={form.banco_prestamista} onChange={e => setForm({ ...form, banco_prestamista: e.target.value })}>
                    <option value="">Sin banco</option>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>CUENTA PRESTAMISTA</label>
                  <input style={inp} value={form.cuenta_prestamista} placeholder="N° cuenta" onChange={e => setForm({ ...form, cuenta_prestamista: e.target.value })} />
                </div>
              </div>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: form.tiene_contrato ? 10 : 0 }}>
                  <input type="checkbox" checked={form.tiene_contrato} onChange={e => setForm({ ...form, tiene_contrato: e.target.checked })} style={{ width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Tiene contrato</span>
                </label>
                {form.tiene_contrato && (
                  <input style={inp} value={form.link_contrato} placeholder="Link Google Drive o URL del contrato" onChange={e => setForm({ ...form, link_contrato: e.target.value })} />
                )}
              </div>
              <div>
                <label style={lbl}>OBSERVACIONES</label>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
              </div>

              {/* Preview cuotas */}
              {form.monto_original && form.num_cuotas && form.fecha_inicio && (
                <div>
                  <button type="button" onClick={() => { setCuotasPreview(generarCuotas(form)); setShowPreview(!showPreview) }}
                    style={{ fontSize: 12, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 6, padding: "4px 12px", cursor: "pointer", width: "100%" }}>
                    {showPreview ? "Ocultar" : "Ver"} cronograma estimado ({form.num_cuotas} cuotas)
                  </button>
                  {showPreview && cuotasPreview.length > 0 && (
                    <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            <th style={{ padding: "6px 8px", textAlign: "center", color: "#6b7280" }}>#</th>
                            <th style={{ padding: "6px 8px", textAlign: "left", color: "#6b7280" }}>Vencimiento</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>Capital</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>Interés</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", color: "#6b7280" }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cuotasPreview.map(c => (
                            <tr key={c.numero_cuota} style={{ borderTop: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "5px 8px", textAlign: "center", color: "#6b7280" }}>{c.numero_cuota}</td>
                              <td style={{ padding: "5px 8px", color: "#374151" }}>{c.fecha_vencimiento}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: "#374151" }}>{fmt(c.monto_capital)}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: "#9a3412" }}>{fmt(c.monto_interes)}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: "#111827" }}>{fmt(c.monto_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>
                {saving ? "Guardando..." : "Crear préstamo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




