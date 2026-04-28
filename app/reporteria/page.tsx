"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const MODULOS = [
  { key: "proyectos",     label: "Proyectos",       icon: "📁" },
  { key: "facturacion",   label: "Facturación",      icon: "🧾" },
  { key: "liquidaciones", label: "Liquidaciones",    icon: "💼" },
  { key: "rqs",           label: "Req. de pago",     icon: "📋" },
  { key: "caja_chica",    label: "Caja chica",       icon: "💵" },
  { key: "gastos_oficina",label: "Gastos oficina",   icon: "🏢" },
  { key: "prestamos",     label: "Préstamos",        icon: "🏦" },
  { key: "rrhh",          label: "RRHH",             icon: "👥" },
  { key: "inventario",    label: "Inventario",       icon: "📦" },
]

const CAMPOS: Record<string, { key: string; label: string; tipo?: string }[]> = {
  proyectos: [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Nombre" },
    { key: "cliente", label: "Cliente" },
    { key: "estado", label: "Estado" },
    { key: "productor", label: "Productor" },
    { key: "fecha_inicio", label: "Fecha inicio", tipo: "fecha" },
    { key: "fecha_fin_estimada", label: "Fecha fin", tipo: "fecha" },
    { key: "presupuesto_referencial", label: "Presupuesto", tipo: "monto" },
  ],
  facturacion: [
    { key: "numero_factura", label: "N° Factura" },
    { key: "proyecto", label: "Proyecto" },
    { key: "cliente", label: "Cliente" },
    { key: "subtotal", label: "Subtotal", tipo: "monto" },
    { key: "igv", label: "IGV", tipo: "monto" },
    { key: "total", label: "Total", tipo: "monto" },
    { key: "detraccion_pct", label: "Detracción %" },
    { key: "detraccion_monto", label: "Detracción S/", tipo: "monto" },
    { key: "monto_final_abonado", label: "A abonar", tipo: "monto" },
    { key: "estado", label: "Estado" },
    { key: "fecha_emision", label: "Fecha emisión", tipo: "fecha" },
    { key: "fecha_abono", label: "Fecha abono", tipo: "fecha" },
    { key: "banco_receptor", label: "Banco" },
  ],
  liquidaciones: [
    { key: "proyecto", label: "Proyecto" },
    { key: "costo_presupuestado", label: "Costo presup.", tipo: "monto" },
    { key: "costo_real", label: "Costo real", tipo: "monto" },
    { key: "precio_cliente_presupuestado", label: "Precio presup.", tipo: "monto" },
    { key: "precio_cliente_real", label: "Precio real", tipo: "monto" },
    { key: "margen_presupuestado_pct", label: "Margen presup. %" },
    { key: "margen_real_pct", label: "Margen real %" },
    { key: "cerrada", label: "Cerrada" },
  ],
  rqs: [
    { key: "numero_rq", label: "N° RQ" },
    { key: "proyecto", label: "Proyecto" },
    { key: "descripcion", label: "Descripción" },
    { key: "proveedor_nombre", label: "Proveedor" },
    { key: "monto_solicitado", label: "Monto", tipo: "monto" },
    { key: "estado", label: "Estado" },
    { key: "fecha_vencimiento", label: "Vencimiento", tipo: "fecha" },
    { key: "fecha_pago", label: "Fecha pago", tipo: "fecha" },
  ],
  caja_chica: [
    { key: "concepto", label: "Concepto" },
    { key: "monto_debe", label: "Debe", tipo: "monto" },
    { key: "monto_haber", label: "Haber", tipo: "monto" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "tipo_comprobante", label: "Comprobante" },
    { key: "numero_operacion", label: "N° Operación" },
    { key: "estado", label: "Estado" },
    { key: "proyecto", label: "Proyecto" },
    { key: "categoria", label: "Categoría" },
    { key: "solicitante", label: "Solicitante" },
  ],
  gastos_oficina: [
    { key: "descripcion", label: "Descripción" },
    { key: "tipo", label: "Tipo" },
    { key: "monto", label: "Monto", tipo: "monto" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
    { key: "estado_pago", label: "Estado" },
    { key: "proveedor", label: "Proveedor" },
    { key: "tipo_comprobante", label: "Comprobante" },
    { key: "numero_comprobante", label: "N° Comprobante" },
    { key: "recurrente", label: "Recurrente" },
    { key: "frecuencia", label: "Frecuencia" },
    { key: "categoria_costo", label: "Centro costos" },
  ],
  prestamos: [
    { key: "nombre", label: "Nombre" },
    { key: "tipo", label: "Tipo" },
    { key: "prestamista", label: "Prestamista" },
    { key: "tipo_prestamista", label: "Tipo prestamista" },
    { key: "monto_original", label: "Monto original", tipo: "monto" },
    { key: "tasa_interes", label: "Tasa interés %" },
    { key: "num_cuotas", label: "N° cuotas" },
    { key: "sistema_cuotas", label: "Sistema" },
    { key: "fecha_inicio", label: "Fecha inicio", tipo: "fecha" },
    { key: "estado", label: "Estado" },
    { key: "empleado", label: "Empleado" },
  ],
  rrhh: [
    { key: "nombre", label: "Nombre" },
    { key: "apellido", label: "Apellido" },
    { key: "cargo", label: "Cargo" },
    { key: "departamento", label: "Departamento" },
    { key: "tipo_contrato", label: "Tipo contrato" },
    { key: "sueldo_bruto", label: "Sueldo bruto", tipo: "monto" },
    { key: "fecha_ingreso", label: "Fecha ingreso", tipo: "fecha" },
    { key: "activo", label: "Activo" },
  ],
  inventario: [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Nombre" },
    { key: "categoria", label: "Categoría" },
    { key: "stock_actual", label: "Stock" },
    { key: "unidad", label: "Unidad" },
    { key: "precio_unitario", label: "Precio unit.", tipo: "monto" },
    { key: "almacen", label: "Almacén" },
  ],
}

const ESTADO_FILTROS: Record<string, string[]> = {
  proyectos: ["pendiente_aprobacion", "aprobado_produccion", "aprobado", "en_curso", "terminado", "liquidado", "facturado", "cancelado", "rechazado"],
  facturacion: ["pendiente", "emitida", "cobrada", "anulada"],
  rqs: ["pendiente", "aprobado", "rechazado", "pagado", "cancelado"],
  caja_chica: ["pendiente", "aprobado", "rechazado"],
  gastos_oficina: ["pendiente", "pagado", "vencido"],
  prestamos: ["activo", "pagado", "refinanciado", "cancelado"],
}

export default function ReporteriaPage() {
  const supabase = createClient()
  const [moduloActivo, setModuloActivo] = useState("proyectos")
  const [camposSeleccionados, setCamposSeleccionados] = useState<string[]>(CAMPOS.proyectos.map(c => c.key))
  const [datos, setDatos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generado, setGenerado] = useState(false)
  const [filtros, setFiltros] = useState({ fechaDesde: "", fechaHasta: "", estado: "", busqueda: "" })
  const [clientes, setClientes] = useState<any[]>([])
  const [filtroCliente, setFiltroCliente] = useState("")

  useEffect(() => {
    setCamposSeleccionados(CAMPOS[moduloActivo].map(c => c.key))
    setDatos([])
    setGenerado(false)
    setFiltros({ fechaDesde: "", fechaHasta: "", estado: "", busqueda: "" })
    setFiltroCliente("")
  }, [moduloActivo])

  useEffect(() => {
    supabase.from("clientes").select("id, razon_social").order("razon_social").then(({ data }) => setClientes(data || []))
  }, [])

  async function generarReporte() {
    setLoading(true)
    let data: any[] = []

    if (moduloActivo === "proyectos") {
      let q = supabase.from("proyectos").select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre, apellido)")
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtroCliente) q = q.eq("cliente_id", filtroCliente)
      if (filtros.fechaDesde) q = q.gte("fecha_inicio", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha_inicio", filtros.fechaHasta)
      const { data: r } = await q.order("created_at", { ascending: false })
      data = (r || []).map(p => ({
        ...p,
        cliente: p.cliente?.razon_social || "—",
        productor: p.productor ? p.productor.nombre + " " + p.productor.apellido : "—",
      }))
    } else if (moduloActivo === "facturacion") {
      let q = supabase.from("facturas").select("*, proyecto:proyectos(nombre, codigo, cliente:clientes(razon_social))")
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.fechaDesde) q = q.gte("fecha_emision", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha_emision", filtros.fechaHasta)
      const { data: r } = await q.order("created_at", { ascending: false })
      data = (r || []).map(f => ({
        ...f,
        proyecto: f.proyecto ? f.proyecto.codigo + " — " + f.proyecto.nombre : "—",
        cliente: f.proyecto?.cliente?.razon_social || "—",
        total: (f.subtotal || 0) + (f.igv || 0),
      }))
    } else if (moduloActivo === "liquidaciones") {
      let q = supabase.from("liquidaciones").select("*, proyecto:proyectos(nombre, codigo)")
      if (filtros.fechaDesde) q = q.gte("created_at", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("created_at", filtros.fechaHasta)
      const { data: r } = await q.order("created_at", { ascending: false })
      data = (r || []).map(l => ({
        ...l,
        proyecto: l.proyecto ? l.proyecto.codigo + " — " + l.proyecto.nombre : "—",
        cerrada: l.cerrada ? "Sí" : "No",
      }))
    } else if (moduloActivo === "rqs") {
      let q = supabase.from("requerimientos_pago").select("*, proyecto:proyectos(nombre, codigo)")
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.fechaDesde) q = q.gte("fecha_vencimiento", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha_vencimiento", filtros.fechaHasta)
      const { data: r } = await q.order("created_at", { ascending: false })
      data = (r || []).map(r => ({ ...r, proyecto: r.proyecto ? r.proyecto.codigo + " — " + r.proyecto.nombre : "—" }))
    } else if (moduloActivo === "caja_chica") {
      let q = supabase.from("caja_chica").select("*, proyecto:proyectos(nombre, codigo), solicitante:perfiles!solicitado_por(nombre, apellido)")
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.fechaDesde) q = q.gte("fecha", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha", filtros.fechaHasta)
      const { data: r } = await q.order("created_at", { ascending: false })
      data = (r || []).map(c => ({
        ...c,
        proyecto: c.proyecto ? c.proyecto.codigo + " — " + c.proyecto.nombre : "—",
        solicitante: c.solicitante ? c.solicitante.nombre + " " + c.solicitante.apellido : "—",
      }))
    } else if (moduloActivo === "gastos_oficina") {
      let q = supabase.from("gastos_oficina").select("*, proveedor:proveedores(nombre)")
      if (filtros.estado) q = q.eq("estado_pago", filtros.estado)
      if (filtros.fechaDesde) q = q.gte("fecha", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha", filtros.fechaHasta)
      const { data: r } = await q.order("fecha", { ascending: false })
      data = (r || []).map(g => ({ ...g, proveedor: g.proveedor?.nombre || g.proveedor_nombre || "—", recurrente: g.recurrente ? "Sí" : "No" }))
    } else if (moduloActivo === "prestamos") {
      let q = supabase.from("prestamos").select("*, empleado:rrhh_trabajadores(nombre, apellido)")
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.fechaDesde) q = q.gte("fecha_inicio", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha_inicio", filtros.fechaHasta)
      const { data: r } = await q.order("created_at", { ascending: false })
      data = (r || []).map(p => ({ ...p, empleado: p.empleado ? p.empleado.nombre + " " + p.empleado.apellido : "—" }))
    } else if (moduloActivo === "rrhh") {
      let q = supabase.from("rrhh_trabajadores").select("*")
      if (filtros.fechaDesde) q = q.gte("fecha_ingreso", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha_ingreso", filtros.fechaHasta)
      const { data: r } = await q.order("apellido")
      data = (r || []).map(t => ({ ...t, activo: t.activo ? "Sí" : "No" }))
    } else if (moduloActivo === "inventario") {
      const { data: r } = await supabase.from("inventario_items").select("*, almacen:inventario_almacenes(nombre)").order("nombre")
      data = (r || []).map(i => ({ ...i, almacen: i.almacen?.nombre || "—" }))
    }

    // Filtro por búsqueda texto
    if (filtros.busqueda) {
      const b = filtros.busqueda.toLowerCase()
      data = data.filter(row =>
        Object.values(row).some(v => String(v || "").toLowerCase().includes(b))
      )
    }

    setDatos(data)
    setGenerado(true)
    setLoading(false)
  }

  function toggleCampo(key: string) {
    setCamposSeleccionados(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function seleccionarTodos() {
    setCamposSeleccionados(CAMPOS[moduloActivo].map(c => c.key))
  }

  function deseleccionarTodos() {
    setCamposSeleccionados([])
  }

  function exportarCSV() {
    const campos = CAMPOS[moduloActivo].filter(c => camposSeleccionados.includes(c.key))
    const headers = campos.map(c => c.label).join(",")
    const rows = datos.map(row =>
      campos.map(c => {
        const val = row[c.key]
        const str = val === null || val === undefined ? "" : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(",")
    ).join("\n")
    const csv = headers + "\n" + rows
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte_${moduloActivo}_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const camposActivos = CAMPOS[moduloActivo].filter(c => camposSeleccionados.includes(c.key))
  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", outline: "none" }

  // Calcular totales de columnas numéricas
  const totales: Record<string, number> = {}
  camposActivos.forEach(c => {
    if (c.tipo === "monto") {
      totales[c.key] = datos.reduce((s, row) => s + (Number(row[c.key]) || 0), 0)
    }
  })
  const hayTotales = Object.keys(totales).length > 0

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Reportería</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Genera reportes personalizados de todos los módulos</p>
        </div>
        {generado && datos.length > 0 && (
          <button onClick={exportarCSV}
            style={{ padding: "8px 16px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ⬇ Exportar CSV
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>

        {/* ── PANEL IZQUIERDO — configuración ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Módulo */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>Módulo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {MODULOS.map(m => (
                <button key={m.key} onClick={() => setModuloActivo(m.key)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: "none", background: moduloActivo === m.key ? "#f0fdf4" : "transparent", color: moduloActivo === m.key ? "#0F6E56" : "#374151", fontWeight: moduloActivo === m.key ? 700 : 400, cursor: "pointer", fontSize: 13, textAlign: "left" }}>
                  <span>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>Filtros</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>FECHA DESDE</label>
                <input type="date" style={{ ...inp, width: "100%" }} value={filtros.fechaDesde} onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>FECHA HASTA</label>
                <input type="date" style={{ ...inp, width: "100%" }} value={filtros.fechaHasta} onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })} />
              </div>
              {ESTADO_FILTROS[moduloActivo] && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>ESTADO</label>
                  <select style={{ ...inp, width: "100%" }} value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
                    <option value="">Todos</option>
                    {ESTADO_FILTROS[moduloActivo].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              )}
              {moduloActivo === "proyectos" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>CLIENTE</label>
                  <select style={{ ...inp, width: "100%" }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
                    <option value="">Todos</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>BÚSQUEDA</label>
                <input style={{ ...inp, width: "100%" }} placeholder="Buscar en resultados..." value={filtros.busqueda} onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Campos */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Columnas</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={seleccionarTodos} style={{ fontSize: 10, color: "#0F6E56", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Todos</button>
                <button onClick={deseleccionarTodos} style={{ fontSize: 10, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Ninguno</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CAMPOS[moduloActivo].map(c => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#374151" }}>
                  <input type="checkbox" checked={camposSeleccionados.includes(c.key)} onChange={() => toggleCampo(c.key)} style={{ width: 13, height: 13 }} />
                  {c.label}
                  {c.tipo === "monto" && <span style={{ fontSize: 10, color: "#9ca3af" }}>S/</span>}
                </label>
              ))}
            </div>
          </div>

          <button onClick={generarReporte} disabled={loading || camposSeleccionados.length === 0}
            style={{ padding: "10px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {loading ? "Generando..." : "🔍 Generar reporte"}
          </button>
        </div>

        {/* ── PANEL DERECHO — resultados ── */}
        <div>
          {!generado ? (
            <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Configura y genera tu reporte</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>Selecciona el módulo, aplica filtros y elige las columnas que necesitas</div>
            </div>
          ) : (
            <div>
              {/* Header resultados */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  <strong style={{ color: "#111827" }}>{datos.length}</strong> registros encontrados
                  {filtros.fechaDesde && ` · Desde ${filtros.fechaDesde}`}
                  {filtros.fechaHasta && ` · Hasta ${filtros.fechaHasta}`}
                  {filtros.estado && ` · Estado: ${filtros.estado}`}
                </div>
                <button onClick={exportarCSV}
                  style={{ fontSize: 12, padding: "5px 12px", background: "#fff", border: "1px solid #1D9E75", borderRadius: 6, color: "#0F6E56", cursor: "pointer", fontWeight: 600 }}>
                  ⬇ Exportar CSV
                </button>
              </div>

              {datos.length === 0 ? (
                <div className="card" style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                  No se encontraron registros con los filtros aplicados
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        {camposActivos.map(c => (
                          <th key={c.key} style={{ textAlign: c.tipo === "monto" ? "right" : "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
                            {c.label.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datos.map((row, idx) => (
                        <tr key={idx} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                          {camposActivos.map(c => {
                            const val = row[c.key]
                            return (
                              <td key={c.key} style={{ padding: "9px 12px", textAlign: c.tipo === "monto" ? "right" : "left", color: "#374151", whiteSpace: "nowrap" }}>
                                {c.tipo === "monto"
                                  ? <span style={{ fontWeight: 600 }}>{fmt(Number(val) || 0)}</span>
                                  : val === null || val === undefined ? <span style={{ color: "#d1d5db" }}>—</span> : String(val)
                                }
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {hayTotales && (
                      <tfoot>
                        <tr style={{ background: "#f0fdf4", borderTop: "2px solid #1D9E75" }}>
                          {camposActivos.map((c, i) => (
                            <td key={c.key} style={{ padding: "10px 12px", textAlign: c.tipo === "monto" ? "right" : "left", fontWeight: 700, fontSize: 12 }}>
                              {i === 0 ? <span style={{ color: "#0F6E56" }}>TOTALES</span>
                                : totales[c.key] !== undefined
                                  ? <span style={{ color: "#0F6E56" }}>{fmt(totales[c.key])}</span>
                                  : ""}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}