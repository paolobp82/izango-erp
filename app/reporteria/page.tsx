"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { rqCodigo } from "@/lib/rq-code"
import { rqIgvDetalle, rqTratamientoIgvLabel } from "@/lib/rq-igv"
import { rowBelongsToDeletedProject } from "@/lib/projects"
import { puedeVerInformacionSensible } from "@/lib/permissions"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  V2SectionCard,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

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
    { key: "codigo_rq", label: "N° RQ" },
    { key: "proyecto", label: "Proyecto" },
    { key: "descripcion", label: "Descripción" },
    { key: "proveedor", label: "Proveedor" },
    { key: "subtotal", label: "Subtotal", tipo: "monto" },
    { key: "tratamiento_igv", label: "Tratamiento IGV" },
    { key: "igv_monto", label: "IGV S/", tipo: "monto" },
    { key: "monto_total", label: "Monto total", tipo: "monto" },
    { key: "estado", label: "Estado" },
    { key: "solicitante", label: "Solicitado por" },
    { key: "fecha_pago", label: "Fecha pago", tipo: "fecha" },
  ],
  caja_chica: [
    { key: "tipo", label: "Tipo" },
    { key: "concepto", label: "Concepto" },
    { key: "monto", label: "Monto", tipo: "monto" },
    { key: "responsable", label: "Responsable" },
    { key: "comprobante", label: "Comprobante" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
  ],
  gastos_oficina: [
    { key: "concepto", label: "Concepto" },
    { key: "categoria", label: "Categoría" },
    { key: "monto", label: "Monto", tipo: "monto" },
    { key: "proveedor", label: "Proveedor" },
    { key: "comprobante", label: "Comprobante" },
    { key: "estado", label: "Estado" },
    { key: "fecha_emision", label: "Fecha emisión", tipo: "fecha" },
  ],
  prestamos: [
    { key: "prestamista", label: "Prestamista" },
    { key: "monto", label: "Monto prestado", tipo: "monto" },
    { key: "monto_devuelto", label: "Monto devuelto", tipo: "monto" },
    { key: "saldo_pendiente", label: "Saldo pendiente", tipo: "monto" },
    { key: "tasa_interes", label: "Tasa %" },
    { key: "estado", label: "Estado" },
    { key: "fecha", label: "Fecha", tipo: "fecha" },
  ],
  rrhh: [
    { key: "nombre_completo", label: "Trabajador" },
    { key: "cargo", label: "Cargo" },
    { key: "area", label: "Área" },
    { key: "tipo", label: "Tipo" },
    { key: "sueldo_base", label: "Sueldo base", tipo: "monto" },
    { key: "fecha_ingreso", label: "Fecha ingreso", tipo: "fecha" },
    { key: "banco", label: "Banco" },
    { key: "sistema_pension", label: "Pensión" },
  ],
  inventario: [
    { key: "nombre", label: "Ítem" },
    { key: "categoria", label: "Categoría" },
    { key: "unidad", label: "Unidad" },
    { key: "stock_total", label: "Stock total" },
    { key: "stock_minimo", label: "Stock mín." },
    { key: "cliente", label: "Cliente" },
  ],
}

export default function ReporteriaPage() {
  const supabase = createClient()
  const [modulo, setModulo] = useState("proyectos")
  const [columnasSel, setColumnasSel] = useState<string[]>([])
  const [filtros, setFiltros] = useState({ fechaDesde: "", fechaHasta: "", estado: "", clienteId: "", proyectoId: "" })
  const [datos, setDatos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generado, setGenerado] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("perfiles").select("*").eq("id", user.id).single().then(({ data }) => setPerfil(data))
      }
    })
  }, [])

  useEffect(() => {
    const caps = CAMPOS[modulo] || []
    setColumnasSel(caps.map(c => c.key))
    setGenerado(false)
    setDatos([])
  }, [modulo])

  const toggleCol = (key: string) => {
    setColumnasSel(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const verInfoSensible = puedeVerInformacionSensible(perfil?.perfil)

  async function generarReporte() {
    setLoading(true)
    setGenerado(true)
    let res: any[] = []

    if (modulo === "proyectos") {
      let q = supabase.from("proyectos").select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)").is("deleted_at", null).order("created_at", { ascending: false })
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.clienteId) q = q.eq("cliente_id", filtros.clienteId)
      if (filtros.fechaDesde) q = q.gte("created_at", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("created_at", filtros.fechaHasta + "T23:59:59")
      const { data } = await q
      res = (data || []).map(p => ({
        ...p,
        cliente: p.cliente?.razon_social || "—",
        productor: p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—",
        presupuesto_referencial: verInfoSensible ? p.presupuesto_referencial : undefined,
      }))
    } else if (modulo === "facturacion") {
      let q = supabase.from("facturas").select("*, proyecto:proyectos(nombre,codigo,deleted_at), cliente:clientes(razon_social)").order("fecha_emision", { ascending: false })
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.clienteId) q = q.eq("cliente_id", filtros.clienteId)
      if (filtros.proyectoId) q = q.eq("proyecto_id", filtros.proyectoId)
      if (filtros.fechaDesde) q = q.gte("fecha_emision", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha_emision", filtros.fechaHasta)
      const { data } = await q
      res = (data || []).filter((f: any) => !rowBelongsToDeletedProject(f)).map(f => ({
        ...f,
        proyecto: f.proyecto ? `${f.proyecto.codigo} — ${f.proyecto.nombre}` : "—",
        cliente: f.cliente?.razon_social || "—",
        subtotal: verInfoSensible ? f.subtotal : undefined,
        igv: verInfoSensible ? f.igv : undefined,
        total: verInfoSensible ? f.total : undefined,
        monto_final_abonado: verInfoSensible ? f.monto_final_abonado : undefined,
      }))
    } else if (modulo === "liquidaciones") {
      let q = supabase.from("proyectos").select("*, cliente:clientes(razon_social)").not("costo_real", "is", null).is("deleted_at", null).order("created_at", { ascending: false })
      if (filtros.clienteId) q = q.eq("cliente_id", filtros.clienteId)
      const { data } = await q
      res = (data || []).map(p => ({
        proyecto: `${p.codigo} — ${p.nombre}`,
        costo_presupuestado: verInfoSensible ? p.costo_presupuestado : undefined,
        costo_real: verInfoSensible ? p.costo_real : undefined,
        precio_cliente_presupuestado: verInfoSensible ? p.precio_cliente_presupuestado : undefined,
        precio_cliente_real: verInfoSensible ? p.precio_cliente_real : undefined,
        margen_presupuestado_pct: verInfoSensible && p.margen_presupuestado_pct ? `${p.margen_presupuestado_pct}%` : "—",
        margen_real_pct: verInfoSensible && p.margen_real_pct ? `${p.margen_real_pct}%` : "—",
        cerrada: p.liquidacion_cerrada ? "Sí" : "No",
      }))
    } else if (modulo === "rqs") {
      let q = supabase.from("requerimientos_pago").select("*, proyecto:proyectos(nombre,codigo,deleted_at), proveedor:proveedores(razon_social,nombre_comercial), solicitante:perfiles!solicitado_por(nombre,apellido)").order("created_at", { ascending: false })
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.proyectoId) q = q.eq("proyecto_id", filtros.proyectoId)
      if (filtros.fechaDesde) q = q.gte("created_at", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("created_at", filtros.fechaHasta + "T23:59:59")
      const { data } = await q
      res = (data || []).filter((r: any) => !rowBelongsToDeletedProject(r)).map(r => {
        const detIgv = rqIgvDetalle(r)
        return {
          ...r,
          codigo_rq: rqCodigo(r),
          proyecto: r.proyecto ? `${r.proyecto.codigo} — ${r.proyecto.nombre}` : "Sin proyecto",
          proveedor: r.proveedor ? (r.proveedor.razon_social || r.proveedor.nombre_comercial) : (r.proveedor_nombre || "—"),
          solicitante: r.solicitante ? `${r.solicitante.nombre} ${r.solicitante.apellido}` : "—",
          subtotal: verInfoSensible ? detIgv.subtotal : undefined,
          tratamiento_igv: rqTratamientoIgvLabel(r),
          igv_monto: verInfoSensible ? detIgv.igv : undefined,
          monto_total: verInfoSensible ? detIgv.total : undefined,
        }
      })
    } else if (modulo === "caja_chica") {
      let q = supabase.from("caja_chica_movimientos").select("*, responsable:perfiles!responsable_id(nombre,apellido)").order("fecha", { ascending: false })
      if (filtros.fechaDesde) q = q.gte("fecha", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha", filtros.fechaHasta)
      const { data } = await q
      res = (data || []).map(m => ({
        ...m,
        responsable: m.responsable ? `${m.responsable.nombre} ${m.responsable.apellido}` : "—",
        monto: verInfoSensible ? m.monto : undefined,
      }))
    } else if (modulo === "gastos_oficina") {
      let q = supabase.from("gastos_oficina").select("*, proveedor:proveedores(razon_social)").order("fecha_emision", { ascending: false })
      if (filtros.estado) q = q.eq("estado", filtros.estado)
      if (filtros.fechaDesde) q = q.gte("fecha_emision", filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte("fecha_emision", filtros.fechaHasta)
      const { data } = await q
      res = (data || []).map(g => ({
        ...g,
        proveedor: g.proveedor?.razon_social || "—",
        monto: verInfoSensible ? g.monto : undefined,
      }))
    } else if (modulo === "prestamos") {
      const { data } = await supabase.from("prestamos").select("*").order("fecha", { ascending: false })
      res = (data || []).map(p => ({
        ...p,
        monto: verInfoSensible ? p.monto : undefined,
        monto_devuelto: verInfoSensible ? p.monto_devuelto : undefined,
        saldo_pendiente: verInfoSensible ? (p.monto - (p.monto_devuelto || 0)) : undefined,
      }))
    } else if (modulo === "rrhh") {
      const { data } = await supabase.from("rrhh_trabajadores").select("*").eq("activo", true).order("apellido")
      res = (data || []).map(t => ({
        ...t,
        nombre_completo: `${t.apellido}, ${t.nombre}`,
        sueldo_base: verInfoSensible ? t.sueldo_base : undefined,
      }))
    } else if (modulo === "inventario") {
      const { data } = await supabase.from("inventario_items").select("*, cliente:clientes(razon_social), inventario_stock_sin_variante(cantidad)").eq("activo", true).order("nombre")
      res = (data || []).map(item => ({
        ...item,
        cliente: item.cliente?.razon_social || "Propio Izango",
        stock_total: item.inventario_stock_sin_variante?.reduce((s: number, x: any) => s + (x.cantidad || 0), 0) || 0,
      }))
    }

    setDatos(res)
    setLoading(false)
  }

  function exportarCSV() {
    if (datos.length === 0) return
    const caps = (CAMPOS[modulo] || []).filter(c => columnasSel.includes(c.key))
    const headers = caps.map(c => c.label)
    const rows = datos.map(row => caps.map(c => {
      const val = row[c.key]
      if (val === null || val === undefined) return ""
      return String(val).replace(/"/g, '""')
    }))
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-${modulo}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const capsDef = CAMPOS[modulo] || []
  const camposActivos = capsDef.filter(c => columnasSel.includes(c.key))

  const fmt = (val: number) => "S/ " + val.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", color: "var(--v2-text)", width: "100%", outline: "none", boxSizing: "border-box" as const }

  const columns: V2TableColumn<any>[] = camposActivos.map(c => ({
    key: c.key,
    header: c.label,
    align: c.tipo === "monto" ? "right" : "left",
    render: (row) => {
      const val = row[c.key]
      if (c.tipo === "monto") {
        return <span style={{ fontWeight: 600, fontSize: 13 }}>{fmt(Number(val) || 0)}</span>
      }
      return <span style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{val === null || val === undefined ? "—" : String(val)}</span>
    },
  }))

  return (
    <V2ListPageTemplate
      header={
        <V2PageHeader
          eyebrow="Analítica"
          title="Centro de Reportería"
          subtitle="Genera reportes dinámicos, aplica filtros por fecha/estado y exporta a CSV"
          actions={
            datos.length > 0 ? (
              <V2Button variant="secondary" onClick={exportarCSV}>
                Exportar CSV
              </V2Button>
            ) : undefined
          }
        />
      }
      summary={
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          {MODULOS.map(m => (
            <button
              key={m.key}
              onClick={() => setModulo(m.key)}
              style={{
                padding: "10px 14px",
                border: "1px solid var(--v2-border)",
                borderRadius: "var(--v2-radius)",
                background: modulo === m.key ? "var(--v2-primary)" : "var(--v2-surface)",
                color: modulo === m.key ? "#fff" : "var(--v2-text)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      }
      toolbar={
        <V2FilterBar
          searchValue=""
          onSearchChange={() => {}}
          activeFiltersCount={(filtros.fechaDesde ? 1 : 0) + (filtros.fechaHasta ? 1 : 0) + (filtros.estado ? 1 : 0)}
          hideDrawerButton
          onToggleDrawer={() => {}}
          quickFilters={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ width: 140 }}>
                <input
                  type="date"
                  style={inp}
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                />
              </div>
              <div style={{ width: 140 }}>
                <input
                  type="date"
                  style={inp}
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                />
              </div>
              <div style={{ width: 150 }}>
                <input
                  style={inp}
                  placeholder="Estado..."
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                />
              </div>
              <V2Button variant="primary" onClick={generarReporte} disabled={loading}>
                {loading ? "Generando..." : "Generar reporte"}
              </V2Button>
            </div>
          }
          showClearButton={Boolean(filtros.fechaDesde || filtros.fechaHasta || filtros.estado)}
          onClearFilters={() => setFiltros({ fechaDesde: "", fechaHasta: "", estado: "", clienteId: "", proyectoId: "" })}
        />
      }
      table={
        <div style={{ display: "grid", gap: 16 }}>
          <V2SectionCard title="Columnas visibles">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {capsDef.map(c => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", background: columnasSel.includes(c.key) ? "var(--v2-surface-subtle)" : "var(--v2-surface)", padding: "4px 10px", borderRadius: 99, border: "1px solid var(--v2-border)" }}>
                  <input type="checkbox" checked={columnasSel.includes(c.key)} onChange={() => toggleCol(c.key)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </V2SectionCard>

          {!generado ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--v2-muted)", background: "var(--v2-surface)", borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-border)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--v2-text)", marginBottom: 6 }}>Configura y genera tu reporte</div>
              <div style={{ fontSize: 13, color: "var(--v2-muted)" }}>Selecciona el módulo, aplica filtros y genera tu reporte.</div>
            </div>
          ) : (
            <V2DataTable
              columns={columns}
              rows={datos}
              getRowKey={(r) => String(r.id || Math.random())}
              empty={
                <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                  No se encontraron registros con los filtros aplicados.
                </div>
              }
            />
          )}
        </div>
      }
    />
  )
}
