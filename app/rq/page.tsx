"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import ImportExport from "@/components/ImportExport"
import { enviarAlerta } from "@/lib/alertas"
import { rqCodigo } from "@/lib/rq-code"

const ESTADOS: Record<string, any> = {
  pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e",  label: "Pendiente aprobacion" },
  aprobado_produccion:  { bg: "#fed7aa", color: "#9a3412",  label: "Aprobado Produccion" },
  aprobado:             { bg: "#dcfce7", color: "#15803d",  label: "Aprobado GG" },
  programado:           { bg: "#dbeafe", color: "#1e40af",  label: "Programado pago" },
  pagado:               { bg: "#f0fdf4", color: "#166534",  label: "Pagado" },
  rechazado:            { bg: "#fee2e2", color: "#991b1b",  label: "Rechazado" },
}

const FLUJO = [
  { estado: "pendiente_aprobacion", label: "Creado", siguiente: "aprobado_produccion", accion: "Aprobar (Produccion)", roles: ["gerente_produccion", "gerente_general", "superadmin"] },
  { estado: "aprobado_produccion", label: "Aprobado Produccion", siguiente: "aprobado", accion: "Aprobar (GG)", roles: ["gerente_general", "superadmin"] },
  { estado: "aprobado", label: "Aprobado GG", siguiente: "programado", accion: "Programar pago", roles: ["controller", "superadmin"] },
  { estado: "programado", label: "Programado pago", siguiente: "pagado", accion: "Confirmar pago", roles: ["controller", "superadmin"] },
  { estado: "pagado", label: "Pagado", siguiente: null, accion: null, roles: [] },
]

const BANCOS_PAGO = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Banco de la Nacion", "Otro"]
const TIPOS_TRANSFERENCIA = ["Transferencia bancaria", "Yape", "Plin", "Efectivo", "Cheque"]
const ESTADOS_BLOQUEADOS_EDICION = ["pagado", "cerrado", "cancelado"]
const FORM_RQ_VACIO = {
  descripcion: "",
  proveedor_id: "",
  monto_solicitado: "",
  incluye_igv: "si",
  proyecto_id: "",
  tipo_pago: "contado",
  dias_credito: "",
  fecha_pago: "",
  voucher_url: "",
  nota_pago: "",
  numero_operacion: "",
  banco_pago: "",
  tipo_transferencia: "Transferencia bancaria",
}

export default function RQPage() {
  const supabase = createClient()
  const [rqs, setRqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroProveedor, setFiltroProveedor] = useState("")
  const [filtroProyecto, setFiltroProyecto] = useState("")
  const [proveedores, setProveedores] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [showNuevoRQ, setShowNuevoRQ] = useState(false)
const [proyectos, setProyectos] = useState<any[]>([])
const [formRQ, setFormRQ] = useState(FORM_RQ_VACIO)
const [proveedoresTodos, setProveedoresTodos] = useState<any[]>([])
  const [showEditarRQ, setShowEditarRQ] = useState(false)
  const [formEditarRQ, setFormEditarRQ] = useState(FORM_RQ_VACIO)
  const [fechaPago, setFechaPago] = useState("")
  const [filtroTipoPago, setFiltroTipoPago] = useState("")
  const [datosPago, setDatosPago] = useState({
    voucher_url: "", numero_operacion: "", banco_pago: "", tipo_transferencia: "Transferencia bancaria", nota_pago: ""
  })
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 50

  useEffect(() => { load() }, [])

  async function load() {
    const proyectoIdParam = new URLSearchParams(window.location.search).get("proyecto_id") || ""
    const viewParam = new URLSearchParams(window.location.search).get("view") || ""
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
    }
    const { data } = await supabase
      .from("requerimientos_pago")
      .select("*, proyecto:proyectos(id, nombre, codigo, productor:perfiles!productor_id(nombre, apellido)), proveedor:proveedores(nombre, banco, numero_cuenta, tipo_pago)")
      .order("created_at", { ascending: false })
    setRqs(data || [])
    const { data: projs } = await supabase.from("proyectos").select("id, codigo, nombre").is("deleted_at", null).order("codigo")
    setProyectos(projs || [])
    const { data: provsTodos } = await supabase.from("proveedores").select("id, nombre").order("nombre")
    setProveedoresTodos(provsTodos || [])
    const provIds = [...new Set((data || []).map((r: any) => r.proveedor_id).filter(Boolean))]
    if (provIds.length > 0) {
      const { data: provs } = await supabase.from("proveedores").select("id, nombre").in("id", provIds)
      setProveedores(provs || [])
    }
    if (proyectoIdParam) {
      setFiltroProyecto(proyectoIdParam)
      setFormRQ(prev => ({ ...prev, proyecto_id: proyectoIdParam }))
      setShowNuevoRQ(viewParam !== "list")
    }
    setLoading(false)
  }

  async function cambiarEstado(id: string, estado: string, extra?: any) {
    if (estado === "pagado") {
      const rq = rqs.find(r => r.id === id)
      if (rq?.proyecto_id) {
        const otrosRqs = rqs.filter(r => r.proyecto_id === rq.proyecto_id && r.id !== id)
        const todosPagados = otrosRqs.every(r => r.estado === "pagado")
        if (todosPagados) {
          await supabase.from("proyectos").update({ estado: "en_curso" }).eq("id", rq.proyecto_id)
        }
      }
    }
    const updates: any = { estado, ...extra }
    if (["aprobado_produccion", "aprobado", "programado", "pagado"].includes(estado)) {
      updates.aprobado_por = perfil?.id
    }
    if (estado === "pagado") {
      updates.fecha_pago = extra?.fecha_pago || fechaPago || new Date().toISOString().split("T")[0]
      updates.voucher_url = datosPago.voucher_url || null
      updates.numero_operacion = datosPago.numero_operacion || null
      updates.banco_pago = datosPago.banco_pago || null
      updates.tipo_transferencia = datosPago.tipo_transferencia || null
      updates.nota_pago = datosPago.nota_pago || null
    }
    await supabase.from("requerimientos_pago").update(updates).eq("id", id)
    await registrarAccion({ accion: "cambiar_estado", modulo: "rq", entidad_id: id, entidad_tipo: "rq", descripcion: "RQ cambiado a: " + estado })
    load()
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, estado, ...updates }))
  }

  async function guardarDatosPago() {
    if (!selected) return
    setGuardandoPago(true)
    await supabase.from("requerimientos_pago").update({
      voucher_url: datosPago.voucher_url || null,
      numero_operacion: datosPago.numero_operacion || null,
      banco_pago: datosPago.banco_pago || null,
      tipo_transferencia: datosPago.tipo_transferencia || null,
      nota_pago: datosPago.nota_pago || null,
    }).eq("id", selected.id)
    setGuardandoPago(false)
    load()
  }

  function puedeEditarRQ(rq: any) {
    if (!rq) return false
    if (ESTADOS_BLOQUEADOS_EDICION.includes(rq.estado)) return false
    return ["superadmin", "gerente_general", "gerente_produccion", "controller", "productor"].includes(perfil?.perfil)
  }

  function mensajeEdicionRQ(rq: any) {
    if (!rq) return "Selecciona un RQ para editar."
    if (ESTADOS_BLOQUEADOS_EDICION.includes(rq.estado)) return "Este RQ no se puede editar porque esta pagado, cerrado o cancelado."
    if (!["superadmin", "gerente_general", "gerente_produccion", "controller", "productor"].includes(perfil?.perfil)) return "Tu rol no tiene permiso para editar este RQ."
    return ""
  }

  function proyectoBloqueadoEdicion(rq: any) {
    return Boolean(rq?.proyecto_id && rq.estado !== "pendiente_aprobacion")
  }

  function abrirEditarRQ(rq: any) {
    if (!puedeEditarRQ(rq)) return
    setFormEditarRQ({
      descripcion: rq.descripcion || "",
      proveedor_id: rq.proveedor_id || "",
      monto_solicitado: rq.monto_solicitado ? String(rq.monto_solicitado) : "",
      incluye_igv: rq.incluye_igv === false ? "no" : "si",
      proyecto_id: rq.proyecto_id || "",
      tipo_pago: rq.tipo_pago || "contado",
      dias_credito: rq.dias_credito ? String(rq.dias_credito) : "",
      fecha_pago: rq.fecha_pago || "",
      voucher_url: rq.voucher_url || "",
      nota_pago: rq.nota_pago || "",
      numero_operacion: rq.numero_operacion || "",
      banco_pago: rq.banco_pago || "",
      tipo_transferencia: rq.tipo_transferencia || "Transferencia bancaria",
    })
    setShowEditarRQ(true)
  }

  async function guardarEdicionRQ() {
    if (!selected || !puedeEditarRQ(selected)) return
    if (!formEditarRQ.descripcion || !formEditarRQ.monto_solicitado) {
      alert("Descripcion y monto son obligatorios")
      return
    }
    const prov = proveedoresTodos.find((p: any) => p.id === formEditarRQ.proveedor_id)
    const updates: any = {
      descripcion: formEditarRQ.descripcion,
      proveedor_id: formEditarRQ.proveedor_id || null,
      proveedor_nombre: prov?.nombre || "",
      monto_solicitado: Number(formEditarRQ.monto_solicitado),
      incluye_igv: formEditarRQ.incluye_igv !== "no",
      tipo_pago: formEditarRQ.tipo_pago,
      dias_credito: formEditarRQ.dias_credito ? Number(formEditarRQ.dias_credito) : null,
      fecha_pago: formEditarRQ.fecha_pago || null,
      voucher_url: formEditarRQ.voucher_url || null,
      nota_pago: formEditarRQ.nota_pago || null,
      numero_operacion: formEditarRQ.numero_operacion || null,
      banco_pago: formEditarRQ.banco_pago || null,
      tipo_transferencia: formEditarRQ.tipo_transferencia || null,
    }
    if (!proyectoBloqueadoEdicion(selected)) {
      updates.proyecto_id = formEditarRQ.proyecto_id || null
    }
    const { data: updated, error } = await supabase
      .from("requerimientos_pago")
      .update(updates)
      .eq("id", selected.id)
      .not("estado", "in", "(pagado,cerrado,cancelado)")
      .select("id")
      .maybeSingle()
    if (error || !updated) {
      alert("No se pudo editar el RQ. Puede que ya este pagado, cerrado o cancelado.")
      return
    }
    await registrarAccion({ accion: "editar", modulo: "rq", entidad_id: selected.id, entidad_tipo: "rq", descripcion: "RQ editado: " + rqCodigo(selected), datos_nuevos: updates })
    setSelected((prev: any) => prev ? { ...prev, ...updates, proveedor: prov ? { ...(prev.proveedor || {}), nombre: prov.nombre } : prev.proveedor } : prev)
    setShowEditarRQ(false)
    load()
  }

  function getSiguienteAccion(rq: any) {
    const rol = perfil?.perfil
    const paso = FLUJO.find(f => f.estado === rq.estado)
    if (!paso || !paso.siguiente) return null
    if (paso.roles.includes(rol)) return { label: paso.accion, nextEstado: paso.siguiente, color: "#0F6E56" }
    return null
  }

  function puedeRechazar(rq: any) {
    const rol = perfil?.perfil
    if (rq.estado === "pagado" || rq.estado === "rechazado") return false
    return ["gerente_produccion", "gerente_general", "controller", "superadmin"].includes(rol)
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const igvMonto = (rq: any) => Number(rq?.monto_solicitado || 0) * 0.18
  const totalConIgv = (rq: any) => Number(rq?.monto_solicitado || 0) + igvMonto(rq)

  const filtradosBase = rqs.filter(r => {
    if (filtroEstado && r.estado !== filtroEstado) return false
    if (filtroProveedor && r.proveedor_id !== filtroProveedor) return false
    if (filtroProyecto && r.proyecto_id !== filtroProyecto) return false
    if (filtroTipoPago && r.tipo_pago !== filtroTipoPago) return false
    return true
  })
  const filtrados = filtradosBase
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const totalPendiente = rqs.filter(r => r.estado === "pendiente_aprobacion").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalAprobado = rqs.filter(r => ["aprobado_produccion", "aprobado"].includes(r.estado)).reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalProgramado = rqs.filter(r => r.estado === "programado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)
  const totalPagado = rqs.filter(r => r.estado === "pagado").reduce((s, r) => s + (r.monto_solicitado || 0), 0)

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
  const lbl: any = { fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3, display: "block" }

  const puedeEditarPago = ["controller", "superadmin"].includes(perfil?.perfil)
  const selectedBloqueado = selected ? ESTADOS_BLOQUEADOS_EDICION.includes(selected.estado) : false
  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Requerimientos de pago</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {rqs.length} RQs · {perfil ? perfil.nombre + " " + perfil.apellido + " (" + perfil.perfil + ")" : ""}
          </p>
        </div>
        {["superadmin","gerente_general","gerente_produccion","controller"].includes(perfil?.perfil) && (<button onClick={async () => { const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre"); setProveedores(provs || []); setProveedoresTodos(provs || []); const { data: projs } = await supabase.from("proyectos").select("id, codigo, nombre").is("deleted_at", null).in("estado", ["en_curso"]).order("codigo"); setProyectos(projs || []); setShowNuevoRQ(true) }} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo RQ</button>)}
        <ImportExport modulo="requerimientos" campos={[{key:"codigo_rq",label:"N RQ"},{key:"descripcion",label:"Descripcion"},{key:"proveedor_nombre",label:"Proveedor"},{key:"monto_solicitado",label:"Monto"},{key:"incluye_igv",label:"Incluye IGV"},{key:"estado",label:"Estado"}]} datos={rqs.map(rq => ({ ...rq, codigo_rq: rqCodigo(rq), incluye_igv: rq.incluye_igv === false ? "No" : "Si" }))} onImportar={async () => ({ exitosos: 0, errores: ["RQs se generan automaticamente"] })} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Pendientes", value: fmt(totalPendiente), color: "#92400e", bg: "#fef9c3", count: rqs.filter(r => r.estado === "pendiente_aprobacion").length },
          { label: "En aprobacion", value: fmt(totalAprobado), color: "#9a3412", bg: "#fed7aa", count: rqs.filter(r => ["aprobado_produccion","aprobado"].includes(r.estado)).length },
          { label: "Programados", value: fmt(totalProgramado), color: "#1e40af", bg: "#dbeafe", count: rqs.filter(r => r.estado === "programado").length },
          { label: "Pagados", value: fmt(totalPagado), color: "#166534", bg: "#f0fdf4", count: rqs.filter(r => r.estado === "pagado").length },
        ].map(t => (
          <div key={t.label} className="card" style={{ background: t.bg, border: "none" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.color, textTransform: "uppercase", marginBottom: 4 }}>{t.label} ({t.count})</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
            value={filtroTipoPago} onChange={e => setFiltroTipoPago(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="contado">Contado</option>
            <option value="adelanto">Adelanto</option>
            <option value="credito">Credito</option>
          </select>
          {filtroProyecto && (
            <span style={{ fontSize: 12, color: "#0F6E56", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 99, padding: "4px 10px", fontWeight: 700 }}>
              Proyecto filtrado
            </span>
          )}
          {(filtroEstado || filtroProveedor || filtroTipoPago || filtroProyecto) && (
            <button onClick={() => { setFiltroEstado(""); setFiltroProveedor(""); setFiltroTipoPago(""); setFiltroProyecto("") }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
              Limpiar filtros
            </button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtrados.length} resultados</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>N RQ</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROVEEDOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRODUCTOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCION</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MONTO</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>IGV</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>TIPO PAGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>F. SOLICITUD</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>F. VENCIMIENTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ padding: "10px 20px", width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginados.map((rq, idx) => {
                const ec = ESTADOS[rq.estado] || { bg: "#f3f4f6", color: "#6b7280", label: rq.estado }
                const accion = getSiguienteAccion(rq)
                return (
                  <tr key={rq.id}
                    style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === rq.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                    onClick={() => {
                      if (selected?.id === rq.id) { setSelected(null); return }
                      setSelected(rq)
                      setDatosPago({
                        voucher_url: rq.voucher_url || "",
                        numero_operacion: rq.numero_operacion || "",
                        banco_pago: rq.banco_pago || "",
                        tipo_transferencia: rq.tipo_transferencia || "Transferencia bancaria",
                        nota_pago: rq.nota_pago || "",
                      })
                    }}>
                    <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 700, color: "#0F6E56" }}>{rqCodigo(rq)}</td>
                    <td style={{ padding: "12px" }}>
                      {rq.proyecto_id ? (
                        <a href={`/proyectos/${rq.proyecto_id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: "none", display: "inline-block" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>{rq.proyecto?.codigo}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{rq.proyecto?.nombre}</div>
                        </a>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>—</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>Sin proyecto</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{rq.proveedor_nombre || rq.proveedor?.nombre || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>
                      {rq.proyecto?.productor ? rq.proyecto.productor.nombre + " " + rq.proyecto.productor.apellido : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rq.descripcion || "—"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>
                      {fmt(rq.monto_solicitado)}
                      {rq.incluye_igv === false && <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>Total ref. {fmt(totalConIgv(rq))}</div>}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span style={{ background: rq.incluye_igv === false ? "#fef9c3" : "#f0fdf4", color: rq.incluye_igv === false ? "#92400e" : "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {rq.incluye_igv === false ? "No" : "Si"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12 }}>
                      {rq.tipo_pago ? (
                        <span style={{ background: rq.tipo_pago === "credito" ? "#dbeafe" : rq.tipo_pago === "adelanto" ? "#fef9c3" : "#f0fdf4", color: rq.tipo_pago === "credito" ? "#1e40af" : rq.tipo_pago === "adelanto" ? "#92400e" : "#15803d", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                          {rq.tipo_pago}{rq.dias_credito ? " " + rq.dias_credito + "d" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>
                      {rq.created_at ? new Date(rq.created_at).toLocaleDateString("es-PE") : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#374151" }}>
                      {rq.tipo_pago === "credito" && rq.dias_credito && rq.created_at
                        ? new Date(new Date(rq.created_at).getTime() + rq.dias_credito * 86400000).toLocaleDateString("es-PE")
                        : rq.tipo_pago === "contado" && rq.created_at
                        ? new Date(rq.created_at).toLocaleDateString("es-PE")
                        : "—"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: ec.bg, color: ec.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {ec.label}
                      </span>
                      {rq.estado === "pagado" && rq.numero_operacion && (
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Op: {rq.numero_operacion}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {puedeEditarRQ(rq) && (
                        <button onClick={() => { setSelected(rq); abrirEditarRQ(rq) }}
                          style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer", fontWeight: 600 }}>
                          Editar
                        </button>
                      )}
                      {accion && (
                        <button onClick={() => cambiarEstado(rq.id, accion.nextEstado)}
                          style={{ fontSize: 11, padding: "4px 10px", border: "none", borderRadius: 6, background: accion.color, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                          {accion.label}
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={12} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay requerimientos de pago</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F6E56" }}>{rqCodigo(selected)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {puedeEditarRQ(selected) && (
                  <button onClick={() => abrirEditarRQ(selected)} style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer", fontWeight: 600 }}>
                    Editar RQ
                  </button>
                )}
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>x</button>
              </div>
            </div>
            {!puedeEditarRQ(selected) && mensajeEdicionRQ(selected) && (
              <div style={{ padding: "8px 10px", border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {mensajeEdicionRQ(selected)}
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={lbl}>Proyecto</div>
                {selected.proyecto_id ? (
                  <a href={`/proyectos/${selected.proyecto_id}`} style={{ fontSize: 13, color: "#0F6E56", fontWeight: 600, textDecoration: "none" }}>
                    {selected.proyecto?.codigo} — {selected.proyecto?.nombre}
                  </a>
                ) : (
                  <div style={{ fontSize: 13, color: "#374151" }}>Sin proyecto</div>
                )}
              </div>
              <div>
                <div style={lbl}>Proveedor</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selected.proveedor_nombre || selected.proveedor?.nombre}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {selected.proveedor_banco || selected.proveedor?.banco || "—"} · {selected.proveedor_cuenta || selected.proveedor?.numero_cuenta || "Sin cuenta"}
                </div>
              </div>
              <div>
                <div style={lbl}>Descripcion</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{selected.descripcion || "—"}</div>
              </div>
              <div>
                <div style={lbl}>Monto solicitado</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0F6E56" }}>{fmt(selected.monto_solicitado)}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                  Incluye IGV: <strong style={{ color: selected.incluye_igv === false ? "#92400e" : "#15803d" }}>{selected.incluye_igv === false ? "No" : "Si"}</strong>
                </div>
                {selected.incluye_igv === false && (
                  <div style={{ marginTop: 8, padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#6b7280" }}>Subtotal</span><strong>{fmt(selected.monto_solicitado)}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#6b7280" }}>IGV 18%</span><strong>{fmt(igvMonto(selected))}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid #e5e7eb", paddingTop: 4 }}><span style={{ color: "#374151", fontWeight: 700 }}>Total referencial</span><strong>{fmt(totalConIgv(selected))}</strong></div>
                  </div>
                )}
              </div>

              {/* Flujo aprobacion */}
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>Flujo de aprobacion</div>
                {FLUJO.map((paso, i) => {
                  const estados = FLUJO.map(f => f.estado)
                  const idxActual = estados.indexOf(selected.estado)
                  const completado = i <= idxActual
                  const actual = i === idxActual
                  const rolLabel: Record<string, string> = { gerente_produccion: "Gerente Prod.", gerente_general: "Gerente General", controller: "Controller", superadmin: "Superadmin" }
                  const rolesLabel = paso.roles.filter(r => r !== "superadmin").map(r => rolLabel[r] || r).join(", ")
                  return (
                    <div key={paso.estado} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: completado ? "#0F6E56" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: completado ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: actual ? "#0F6E56" : completado ? "#374151" : "#9ca3af", fontWeight: actual ? 700 : 400 }}>{paso.label}</div>
                        {rolesLabel && <div style={{ fontSize: 10, color: "#9ca3af" }}>{rolesLabel}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Datos de pago — visible en programado, pagado, y al confirmar */}
              {(selected.estado === "programado" || selected.estado === "pagado" || selected.estado === "aprobado") && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase", marginBottom: 10 }}>
                    {selected.estado === "pagado" ? "Datos del pago realizado" : "Datos de operacion"}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div>
                      <label style={lbl}>N operacion / referencia</label>
                      <input style={inp} value={datosPago.numero_operacion} placeholder="Ej: 123456789" onChange={e => setDatosPago({ ...datosPago, numero_operacion: e.target.value })} readOnly={!puedeEditarPago || selectedBloqueado} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={lbl}>Banco origen</label>
                        <select style={inp} value={datosPago.banco_pago} onChange={e => setDatosPago({ ...datosPago, banco_pago: e.target.value })} disabled={!puedeEditarPago || selectedBloqueado}>
                          <option value="">Seleccionar</option>
                          {BANCOS_PAGO.map(b => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Tipo transferencia</label>
                        <select style={inp} value={datosPago.tipo_transferencia} onChange={e => setDatosPago({ ...datosPago, tipo_transferencia: e.target.value })} disabled={!puedeEditarPago || selectedBloqueado}>
                          {TIPOS_TRANSFERENCIA.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Link voucher (Google Drive)</label>
                      <input style={inp} value={datosPago.voucher_url} placeholder="https://drive.google.com/..." onChange={e => setDatosPago({ ...datosPago, voucher_url: e.target.value })} readOnly={!puedeEditarPago || selectedBloqueado} />
                      {datosPago.voucher_url && (
                        <a href={datosPago.voucher_url} target="_blank" style={{ fontSize: 11, color: "#1e40af", display: "inline-block", marginTop: 3 }}>Ver voucher →</a>
                      )}
                    </div>
                    <div>
                      <label style={lbl}>Nota de pago</label>
                      <input style={inp} value={datosPago.nota_pago} placeholder="Observaciones opcionales..." onChange={e => setDatosPago({ ...datosPago, nota_pago: e.target.value })} readOnly={!puedeEditarPago || selectedBloqueado} />
                    </div>
                    {puedeEditarPago && !selectedBloqueado && (
                      <button onClick={guardarDatosPago} disabled={guardandoPago}
                        style={{ fontSize: 12, padding: "6px", border: "none", borderRadius: 6, background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                        {guardandoPago ? "Guardando..." : "Guardar datos operacion"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Fecha de pago */}
              {(selected.estado === "aprobado" || selected.estado === "programado") && getSiguienteAccion(selected) && (
                <div>
                  <label style={lbl}>Fecha de pago</label>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                    style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, width: "100%", fontFamily: "inherit", outline: "none" }} />
                </div>
              )}

              {getSiguienteAccion(selected) && (
                <button onClick={() => {
                  const accion = getSiguienteAccion(selected)
                  if (accion) cambiarEstado(selected.id, accion.nextEstado, fechaPago ? { fecha_pago: fechaPago } : {})
                }}
                  style={{ padding: "10px", border: "none", borderRadius: 8, background: "#0F6E56", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  {getSiguienteAccion(selected)?.label}
                </button>
              )}

              {["superadmin","gerente_general","controller"].includes(perfil?.perfil) && (
                <button onClick={async () => {
                  if (!confirm("¿Eliminar este RQ permanentemente?")) return
                  await supabase.from("requerimientos_pago").delete().eq("id", selected.id)
                  setSelected(null)
                  load()
                }}
                  style={{ padding: "8px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>
                  🗑 Eliminar RQ
                </button>
              )}
              {puedeRechazar(selected) && (
                <button onClick={() => cambiarEstado(selected.id, "rechazado")}
                  style={{ padding: "8px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>
                  Rechazar RQ
                </button>
              )}

              {!getSiguienteAccion(selected) && selected.estado !== "pagado" && selected.estado !== "rechazado" && (
                <div style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                  {(() => {
                    const paso = FLUJO.find(f => f.estado === selected.estado)
                    if (!paso) return "Estado final"
                    const rolLabel: Record<string, string> = { gerente_produccion: "Gerente de Produccion", gerente_general: "Gerente General", controller: "Controller" }
                    return `Requiere aprobacion de: ${paso.roles.filter(r => r !== "superadmin").map(r => rolLabel[r] || r).join(" o ")}`
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      {showEditarRQ && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Editar RQ</h2>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{rqCodigo(selected)}</div>
              </div>
              <button onClick={() => setShowEditarRQ(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={lbl}>PROYECTO</label>
                <select style={{ ...inp, background: proyectoBloqueadoEdicion(selected) ? "#f9fafb" : "#fff" }} value={formEditarRQ.proyecto_id} disabled={proyectoBloqueadoEdicion(selected)} onChange={e => setFormEditarRQ({ ...formEditarRQ, proyecto_id: e.target.value })}>
                  <option value="">Sin proyecto</option>{proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                </select>
                {proyectoBloqueadoEdicion(selected) && (
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>El proyecto no se puede cambiar porque este RQ ya tiene flujo financiero.</div>
                )}
              </div>
              <div><label style={lbl}>CONCEPTO</label><input style={inp} value={formEditarRQ.descripcion} placeholder="Concepto del RQ..." onChange={e => setFormEditarRQ({ ...formEditarRQ, descripcion: e.target.value })} /></div>
              <div><label style={lbl}>PROVEEDOR</label><select style={inp} value={formEditarRQ.proveedor_id} onChange={e => setFormEditarRQ({ ...formEditarRQ, proveedor_id: e.target.value })}><option value="">Seleccionar proveedor</option>{proveedoresTodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>MONTO (S/)</label><input type="number" style={inp} value={formEditarRQ.monto_solicitado} placeholder="0.00" onChange={e => setFormEditarRQ({ ...formEditarRQ, monto_solicitado: e.target.value })} /></div>
                <div><label style={lbl}>FECHA REQUERIDA</label><input type="date" style={inp} value={formEditarRQ.fecha_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, fecha_pago: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>INCLUYE IGV</label><select style={inp} value={formEditarRQ.incluye_igv} onChange={e => setFormEditarRQ({ ...formEditarRQ, incluye_igv: e.target.value })}><option value="si">Si, el monto incluye IGV</option><option value="no">No, agregar IGV aparte</option></select></div>
              {formEditarRQ.incluye_igv === "no" && formEditarRQ.monto_solicitado && (
                <div style={{ padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                  Subtotal {fmt(Number(formEditarRQ.monto_solicitado))} · IGV {fmt(Number(formEditarRQ.monto_solicitado || 0) * 0.18)} · Total referencial {fmt(Number(formEditarRQ.monto_solicitado || 0) * 1.18)}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>TIPO DE PAGO</label><select style={inp} value={formEditarRQ.tipo_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, tipo_pago: e.target.value })}><option value="contado">Contado</option><option value="adelanto">Adelanto</option><option value="credito">Credito</option></select></div>
                <div><label style={lbl}>DIAS DE PAGO</label><input type="number" style={inp} value={formEditarRQ.dias_credito} placeholder="Ej: 30" onChange={e => setFormEditarRQ({ ...formEditarRQ, dias_credito: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>SUSTENTO / LINK</label><input style={inp} value={formEditarRQ.voucher_url} placeholder="https://..." onChange={e => setFormEditarRQ({ ...formEditarRQ, voucher_url: e.target.value })} /></div>
              <div><label style={lbl}>OBSERVACIONES</label><textarea style={{ ...inp, resize: "vertical" }} rows={3} value={formEditarRQ.nota_pago} placeholder="Observaciones internas..." onChange={e => setFormEditarRQ({ ...formEditarRQ, nota_pago: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>N OPERACION</label><input style={inp} value={formEditarRQ.numero_operacion} placeholder="Opcional" onChange={e => setFormEditarRQ({ ...formEditarRQ, numero_operacion: e.target.value })} /></div>
                <div><label style={lbl}>BANCO</label><select style={inp} value={formEditarRQ.banco_pago} onChange={e => setFormEditarRQ({ ...formEditarRQ, banco_pago: e.target.value })}><option value="">Seleccionar</option>{BANCOS_PAGO.map(b => <option key={b}>{b}</option>)}</select></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowEditarRQ(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarEdicionRQ} className="btn-primary" style={{ fontSize: 13 }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
      {showNuevoRQ && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nuevo Requerimiento de Pago</h2>
              <button onClick={() => setShowNuevoRQ(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9ca3af" }}>x</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={lbl}>PROYECTO</label><select style={inp} value={formRQ.proyecto_id} onChange={e => setFormRQ({ ...formRQ, proyecto_id: e.target.value })}><option value="">Sin proyecto</option>{proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}</select></div>
              <div><label style={lbl}>DESCRIPCION</label><input style={inp} value={formRQ.descripcion} placeholder="Concepto del RQ..." onChange={e => setFormRQ({ ...formRQ, descripcion: e.target.value })} /></div>
              <div><label style={lbl}>PROVEEDOR</label><select style={inp} value={formRQ.proveedor_id} onChange={e => setFormRQ({ ...formRQ, proveedor_id: e.target.value })}><option value="">Seleccionar proveedor</option>{proveedoresTodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
              <div><label style={lbl}>MONTO (S/)</label><input type="number" style={inp} value={formRQ.monto_solicitado} placeholder="0.00" onChange={e => setFormRQ({ ...formRQ, monto_solicitado: e.target.value })} /></div>
              <div><label style={lbl}>INCLUYE IGV</label><select style={inp} value={formRQ.incluye_igv} onChange={e => setFormRQ({ ...formRQ, incluye_igv: e.target.value })}><option value="si">Si, el monto incluye IGV</option><option value="no">No, agregar IGV aparte</option></select></div>
              {formRQ.incluye_igv === "no" && formRQ.monto_solicitado && (
                <div style={{ padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                  Subtotal {fmt(Number(formRQ.monto_solicitado))} · IGV {fmt(Number(formRQ.monto_solicitado || 0) * 0.18)} · Total referencial {fmt(Number(formRQ.monto_solicitado || 0) * 1.18)}
                </div>
              )}
              <div><label style={lbl}>TIPO DE PAGO</label><select style={inp} value={formRQ.tipo_pago} onChange={e => setFormRQ({ ...formRQ, tipo_pago: e.target.value })}><option value="contado">Contado</option><option value="adelanto">Adelanto</option><option value="credito">Credito</option></select></div>
              <div><label style={lbl}>DIAS DE PAGO (opcional)</label><input type="number" style={inp} value={formRQ.dias_credito} placeholder="Ej: 30, 45, 60..." onChange={e => setFormRQ({ ...formRQ, dias_credito: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowNuevoRQ(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={async () => {
                if (!formRQ.descripcion || !formRQ.monto_solicitado) { alert("Descripcion y monto son obligatorios"); return }
                const prov = proveedoresTodos.find((p: any) => p.id === formRQ.proveedor_id)
                await supabase.from("requerimientos_pago").insert({ proyecto_id: formRQ.proyecto_id || null, estado: "pendiente_aprobacion", proveedor_id: formRQ.proveedor_id || null, proveedor_nombre: prov?.nombre || "", monto_solicitado: Number(formRQ.monto_solicitado), incluye_igv: formRQ.incluye_igv !== "no", descripcion: formRQ.descripcion, tipo_pago: formRQ.tipo_pago, dias_credito: formRQ.dias_credito ? Number(formRQ.dias_credito) : null, es_adicional: true })
                setShowNuevoRQ(false)
                setFormRQ(FORM_RQ_VACIO)
                load()
              }} className="btn-primary" style={{ fontSize: 13 }}>Crear RQ</button>
            </div>
          </div>
        </div>
)}
    </div>
    </div>
  )
}
