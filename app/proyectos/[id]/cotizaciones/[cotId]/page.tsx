"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { registrarAccion } from "@/lib/trazabilidad"
import { registrarHistorial } from "@/lib/historial"
import { enviarAlerta } from "@/lib/alertas"

const COSTOS_INTERNOS = [
  { key: "costo_almacenaje", label: "Almacenaje" },
  { key: "costo_impresion", label: "Impresión" },
  { key: "costo_permisos", label: "Permisos" },
  { key: "costo_instalacion", label: "Instalación" },
  { key: "costo_performer", label: "Performer" },
  { key: "costo_alquiler", label: "Alquiler" },
  { key: "costo_supervision", label: "Supervisión" },
  { key: "costo_movilidad", label: "Movilidad" },
]

function calcItem(item: any) {
  const costoBase = COSTOS_INTERNOS.reduce((s, c) => s + (Number(item[c.key]) || 0), 0)
    + (item.extras_produccion || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
    + (item.extras_alquiler || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
  const cantidad = Number(item.cantidad) || 1
  const fechas = Number(item.fechas) || 1
  const costoUnitario = item.costo_manual !== null && item.costo_manual !== undefined && item.costo_manual !== ""
    ? Number(item.costo_manual) : costoBase
  const costoTotal = costoUnitario * cantidad * fechas
  const margenPct = Number(item.margen_pct) || 0
  const precioClienteManual = item.precio_cliente_manual !== null && item.precio_cliente_manual !== undefined && item.precio_cliente_manual !== "" ? Number(item.precio_cliente_manual) : null
  const precioCliente = precioClienteManual !== null ? precioClienteManual * cantidad * fechas : (margenPct < 100 ? costoTotal / (1 - margenPct / 100) : costoTotal)
  const precioClienteRounded = Math.round(precioCliente * 100) / 100
  const margenMonto = Math.round((precioClienteRounded - costoTotal) * 100) / 100
  const margenCalculado = precioClienteRounded > 0 ? ((precioClienteRounded - costoTotal) / precioClienteRounded) * 100 : margenPct
  const margenFinal = precioClienteManual !== null ? margenCalculado : margenPct
  return { ...item, costo_base_calculado: costoBase, costo_total: costoTotal, costo_unitario: costoUnitario, precio_cliente: precioClienteRounded, margen_monto: margenMonto, margen_pct: margenFinal }
}

function newFamilia(cotizacionId: any, orden: number) {
  return {
    id: "new_fam_" + Date.now(), cotizacion_id: cotizacionId, orden,
    tipo: "familia", descripcion: "Nueva familia", familia_id: null,
    es_opcional: false, incluir_en_total: true, celda_titulo: null, numero_item: null, columna_extra_valor: "",
    cantidad: 1, fechas: 1, margen_pct: 0, costo_manual: null,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
    costo_total: 0, precio_cliente: 0, margen_monto: 0, costo_base_calculado: 0, costo_unitario: 0,
  }
}

function newCeldaExtra(cotizacionId: any, orden: number) {
  return {
    id: "new_cel_" + Date.now(), cotizacion_id: cotizacionId, orden,
    tipo: "celda_extra", descripcion: "", familia_id: null,
    es_opcional: false, incluir_en_total: false, celda_titulo: "Campo adicional", numero_item: null, columna_extra_valor: "",
    cantidad: 1, fechas: 1, margen_pct: 0, costo_manual: null,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
    costo_total: 0, precio_cliente: 0, margen_monto: 0, costo_base_calculado: 0, costo_unitario: 0,
  }
}

function newItem(cotizacionId: any, orden: number, familiaId?: string) {
  return calcItem({
    id: "new_" + Date.now(), cotizacion_id: cotizacionId, orden,
    descripcion: "", cantidad: 1, fechas: 1, margen_pct: 40, costo_manual: null,
    tipo: "item", familia_id: familiaId || null, es_opcional: false, incluir_en_total: true,
    celda_titulo: null, numero_item: null, columna_extra_valor: "",
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
  })
}

export default function CotizacionEditorPage() {
  const rawParams = useParams()
  const id = rawParams?.id as string | undefined
  const cotId = rawParams?.cotId as string | undefined
  const router = useRouter()
  const supabase = createClient()

  const [cotizacion, setCotizacion] = useState<any>(null)
  const [proyecto, setProyecto] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [centrosCostos, setCentrosCostos] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<string>("")
const autoSaveRef = useRef<any>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [feeActivo, setFeeActivo] = useState(true)
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [biblioteca, setBiblioteca] = useState<any[]>([])
  const [busquedaBib, setBusquedaBib] = useState("")
  const [bloqueada, setBloqueada] = useState(false)
  const [perfilActual, setPerfilActual] = useState<any>(null)
  const [descuentoPct, setDescuentoPct] = useState(0)
  const [subitems, setSubitems] = useState<Record<string, any[]>>({})
  const [columnaExtra, setColumnaExtra] = useState<{activa: boolean, titulo: string}>({activa: false, titulo: "Dirección"})
  const [hasBackup, setHasBackup] = useState(false)
  const [contactosCliente, setContactosCliente] = useState<any[]>([])
  const [contactoClienteId, setContactoClienteId] = useState<string | null>(null)
  const [contactosCliente, setContactosCliente] = useState<any[]>([])
const [contactoClienteId, setContactoClienteId] = useState<string | null>(null)

  useEffect(() => {
    if (!cotId) return
    async function load() {
      const { data: cot } = await supabase
        .from("cotizaciones")
        .select("*, proyecto:proyectos!proyecto_id(id,nombre,codigo,cliente:clientes!cliente_id(id,razon_social))")
        .eq("id", cotId).single()
      setCotizacion(cot)
      setProyecto(cot?.proyecto)
      if (cot?.fee_activo === false) setFeeActivo(false)
      setBloqueada(false) // se evalúa abajo según perfil
      setDescuentoPct(cot?.descuento_pct || 0)
      setContactoClienteId(cot?.contacto_cliente_id || null)
      if (cot?.proyecto?.cliente?.id) {
        const { data: ctcs } = await supabase
          .from("cliente_contactos")
          .select("*")
          .eq("cliente_id", cot.proyecto.cliente.id)
          .eq("activo", true)
          .order("orden")
        setContactosCliente(ctcs || [])
      }
      if (cot?.columna_extra_titulo) setColumnaExtra({ activa: true, titulo: cot.columna_extra_titulo })
      setContactoClienteId(cot?.contacto_cliente_id || null)

// Cargar contactos del cliente
if (cot?.proyecto?.cliente) {
  const { data: clienteData } = await supabase
    .from("clientes")
    .select("id")
    .eq("razon_social", cot.proyecto.cliente.razon_social)
    .single()
  if (clienteData) {
    const { data: ctcs } = await supabase
      .from("cliente_contactos")
      .select("*")
      .eq("cliente_id", clienteData.id)
      .eq("activo", true)
      .order("orden")
    setContactosCliente(ctcs || [])
  }
}
        const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
        setPerfilActual(p)
const puedeBloquear = ["superadmin","gerente_general"].includes(p?.perfil)
if (!puedeBloquear) setBloqueada(false)
else setBloqueada(cot?.bloqueada || false)
      }
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotId).order("orden")
      const parsed = (its || []).map((i: any) => {
        let ep: any[] = [], ea: any[] = []
        try { ep = JSON.parse(i.extras_produccion || "[]") } catch {}
        try { ea = JSON.parse(i.extras_alquiler || "[]") } catch {}
        return calcItem({ ...i, extras_produccion: ep, extras_alquiler: ea })
      })
      setItems(parsed)
      const subitemsMap: Record<string, any[]> = {}
      for (const item of parsed) {
        const { data: subs } = await supabase.from("cotizacion_subitems").select("*, proveedor:proveedores(nombre)").eq("item_id", item.id).order("orden")
        if (subs && subs.length > 0) subitemsMap[item.id] = subs
      }
      setSubitems(subitemsMap)
      const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre")
      const { data: ccs } = await supabase.from("centro_costos").select("id, nombre, tipo").eq("activo", true).order("nombre")
      setCentrosCostos(ccs || [])
      setProveedores(provs || [])
      setLoading(false)
    }
    load()
  }, [cotId])

  async function abrirBiblioteca() {
    if (biblioteca.length === 0) {
      const { data } = await supabase.from("items_biblioteca").select("*").eq("activo", true).order("descripcion")
      setBiblioteca(data || [])
    }
    setShowBiblioteca(true)
  }

  function cargarDesdeLibreria(item: any) {
    const nuevoItem = calcItem({
      id: "new_" + Date.now(), cotizacion_id: cotId, orden: items.length,
      descripcion: item.descripcion, cantidad: 1, fechas: 1,
      margen_pct: item.margen_pct || 40, costo_manual: null,
      tipo: "item", familia_id: null, es_opcional: false, incluir_en_total: true,
      celda_titulo: null, numero_item: null, columna_extra_valor: "",
      costo_almacenaje: item.costo_almacenaje || 0, costo_impresion: item.costo_impresion || 0,
      costo_permisos: item.costo_permisos || 0, costo_instalacion: item.costo_instalacion || 0,
      costo_performer: item.costo_performer || 0, costo_alquiler: item.costo_alquiler || 0,
      costo_supervision: item.costo_supervision || 0, costo_movilidad: item.costo_movilidad || 0,
      costo_otros: 0, proveedor_id: item.proveedor_id || null,
      proveedor_nombre: item.proveedor_nombre || "", extras_produccion: [], extras_alquiler: [],
    })
    setItems(prev => [...prev, nuevoItem])
    setShowBiblioteca(false)
    setBusquedaBib("")
  }

  function toggleExpand(itemId: string) {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  function updateItem(itemId: string, field: string, value: any) {
    setItems(prev => prev.map(item => item.id !== itemId ? item : calcItem({ ...item, [field]: value })))
  }

  function addExtra(itemId: string, grupo: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return calcItem({ ...item, [grupo]: [...(item[grupo] || []), { label: "", monto: 0 }] })
    }))
  }

  function updateExtra(itemId: string, grupo: string, idx: number, field: string, value: any) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const extras = [...(item[grupo] || [])]
      extras[idx] = { ...extras[idx], [field]: value }
      return calcItem({ ...item, [grupo]: extras })
    }))
  }

  function removeExtra(itemId: string, grupo: string, idx: number) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return calcItem({ ...item, [grupo]: (item[grupo] || []).filter((_: any, i: number) => i !== idx) })
    }))
  }

  function removeItem(itemId: string) {
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  function moverItem(itemId: string, direccion: "arriba" | "abajo") {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === itemId)
      if (idx === -1) return prev
      const newIdx = direccion === "arriba" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr.map((item, i) => ({ ...item, orden: i }))
    })
  }

  function addSubitem(itemId: string) {
    setSubitems(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { id: "new_sub_" + Date.now(), item_id: itemId, descripcion: "", proveedor_id: null, proveedor_nombre: "", monto: 0, orden: (prev[itemId] || []).length }]
    }))
  }

  function updateSubitem(itemId: string, subId: string, field: string, value: any) {
    setSubitems(prev => {
      const updated = (prev[itemId] || []).map((s: any) => s.id === subId ? { ...s, [field]: value } : s)
      const total = updated.reduce((s: number, sb: any) => s + (Number(sb.monto) || 0), 0)
      setItems(items => items.map(i => i.id !== itemId ? i : calcItem({ ...i, costo_manual: total > 0 ? total : null })))
      return { ...prev, [itemId]: updated }
    })
  }

  function removeSubitem(itemId: string, subId: string) {
    setSubitems(prev => {
      const updated = (prev[itemId] || []).filter((s: any) => s.id !== subId)
      const total = updated.reduce((s: number, sb: any) => s + (Number(sb.monto) || 0), 0)
      setItems(items => items.map(i => i.id !== itemId ? i : calcItem({ ...i, costo_manual: total > 0 ? total : null })))
      return { ...prev, [itemId]: updated }
    })
  }
  const itemsActivos = items.filter(i => i.tipo !== "familia" && i.tipo !== "celda_extra" && i.incluir_en_total !== false)
  const totalCosto = itemsActivos.reduce((s, i) => s + (i.costo_total || 0), 0)
  const totalPrecioCliente = itemsActivos.reduce((s, i) => s + (i.precio_cliente || 0), 0)
  const feePct = feeActivo ? (cotizacion?.fee_agencia_pct ?? 10) : 0
  const igvPct = cotizacion?.igv_pct !== null && cotizacion?.igv_pct !== undefined ? cotizacion.igv_pct : 18
  const feeMonto = totalPrecioCliente * (feePct / 100)
  const subtotalConFee = totalPrecioCliente + feeMonto
  const descuentoMonto = subtotalConFee * ((descuentoPct || 0) / 100)
  const subtotalConDescuento = subtotalConFee - descuentoMonto
  const igvMonto = subtotalConDescuento * (igvPct / 100)
  const totalFinal = subtotalConDescuento + igvMonto
  const margenGlobal = subtotalConDescuento > 0 ? ((subtotalConDescuento - totalCosto) / subtotalConDescuento) * 100 : 0

  async function generarRQs(cotizacionId: string, proyectoId: string) {
    const itemsConProveedor = items.filter(i => i.proveedor_id && i.costo_total > 0)
    const { count } = await supabase.from("requerimientos_pago").select("*", { count: "exact", head: true }).eq("proyecto_id", proyectoId)
    let rqNum = (count || 0) + 1
    for (const item of itemsConProveedor) {
      const prov = proveedores.find((p: any) => p.id === item.proveedor_id)
      await supabase.from("requerimientos_pago").insert({
        proyecto_id: proyectoId,
        cotizacion_item_id: String(item.id).startsWith("new_") ? null : item.id,
        numero_rq: "RQ-" + proyectoId.slice(0,6).toUpperCase() + "-" + String(rqNum).padStart(3, "0"),
        estado: "pendiente_aprobacion",
        proveedor_id: item.proveedor_id,
        proveedor_nombre: prov?.nombre || item.proveedor_nombre || "",
        proveedor_banco: prov?.banco || "",
        proveedor_cuenta: prov?.numero_cuenta || "",
        proveedor_tipo_pago: prov?.tipo_pago || null,
        monto_solicitado: item.costo_total,
        descripcion: item.descripcion,
      })
      rqNum++
    }
    // Eliminar items borrados de BD
const { data: dbItemsActuales } = await supabase.from("cotizacion_items").select("id").eq("cotizacion_id", cotId)
const idsEnBD = (dbItemsActuales || []).map((i: any) => String(i.id))
const idsEnState = items.filter(i => !String(i.id).startsWith("new_")).map(i => String(i.id))
const idsAEliminar = idsEnBD.filter(dbId => !idsEnState.includes(dbId))
if (idsAEliminar.length > 0) {
  await supabase.from("cotizacion_items").delete().in("id", idsAEliminar)
}
    for (const item of items) {
      const subs = subitems[item.id] || []
      for (const sub of subs) {
        if (!sub.proveedor_id || !sub.monto) continue
        const prov = proveedores.find((p: any) => p.id === sub.proveedor_id)
        await supabase.from("requerimientos_pago").insert({
          proyecto_id: proyectoId,
          numero_rq: "RQ-" + proyectoId.slice(0,6).toUpperCase() + "-" + String(rqNum).padStart(3, "0"),
          estado: "pendiente_aprobacion",
          proveedor_id: sub.proveedor_id,
          proveedor_nombre: prov?.nombre || sub.proveedor_nombre || "",
          monto_solicitado: sub.monto,
          descripcion: item.descripcion + " — " + sub.descripcion,
        })
        rqNum++
      }
    }
  }

  async function guardar(nuevoEstado?: string) {
    if (!cotId || !id) return
    setSaving(true)
    const { data: dbItemsActuales } = await supabase.from("cotizacion_items").select("id").eq("cotizacion_id", cotId)
    const idsEnBD = (dbItemsActuales || []).map((i: any) => String(i.id))
    const idsEnState = items.filter(i => !String(i.id).startsWith("new_")).map(i => String(i.id))
    const idsAEliminar = idsEnBD.filter(dbId => !idsEnState.includes(dbId))
    if (idsAEliminar.length > 0) {
      await supabase.from("cotizacion_items").delete().in("id", idsAEliminar)
    }
    for (const item of items) {
      const payload = {
        cotizacion_id: cotId, orden: item.orden, descripcion: item.descripcion,
        cantidad: Number(item.cantidad) || 1, fechas: Number(item.fechas) || 1,
        margen_pct: Number(item.margen_pct) || 0,
        costo_manual: item.costo_manual !== "" && item.costo_manual !== null ? Number(item.costo_manual) : null,
        costo_almacenaje: Number(item.costo_almacenaje) || 0, costo_impresion: Number(item.costo_impresion) || 0,
        costo_permisos: Number(item.costo_permisos) || 0, costo_instalacion: Number(item.costo_instalacion) || 0,
        costo_performer: Number(item.costo_performer) || 0, costo_alquiler: Number(item.costo_alquiler) || 0,
        costo_supervision: Number(item.costo_supervision) || 0, costo_movilidad: Number(item.costo_movilidad) || 0,
        costo_otros: Number(item.costo_otros) || 0, costo_unitario: item.costo_unitario || 0,
        costo_total: item.costo_total || 0, precio_cliente: item.precio_cliente || 0,
        margen_monto: item.margen_monto || 0, proveedor_id: item.proveedor_id || null,
        proveedor_nombre: item.proveedor_nombre || null,
        centro_costo_id: item.centro_costo_id || null,
        extras_produccion: JSON.stringify(item.extras_produccion || []),
        extras_alquiler: JSON.stringify(item.extras_alquiler || []),
        tipo: item.tipo || "item",
        familia_id: item.familia_id || null,
        es_opcional: item.es_opcional || false,
        incluir_en_total: item.incluir_en_total !== false,
        celda_titulo: item.celda_titulo || null,
        numero_item: item.numero_item || null,
        columna_extra_valor: item.columna_extra_valor || null,
        precio_cliente_manual: item.precio_cliente_manual !== null && item.precio_cliente_manual !== "" ? Number(item.precio_cliente_manual) : null,
      }
      if (String(item.id).startsWith("new_")) {
        await supabase.from("cotizacion_items").insert(payload)
      } else {
        await supabase.from("cotizacion_items").update(payload).eq("id", item.id)
      }
    }
    await supabase.from("cotizaciones").update({
      subtotal_costo: totalCosto, subtotal_precio_cliente: totalPrecioCliente,
      fee_agencia_monto: feeMonto, fee_agencia_pct: feePct, fee_activo: feeActivo,
      subtotal_con_fee: subtotalConFee, igv_monto: igvMonto, igv_pct: igvPct,
      total_cliente: totalFinal, margen_pct: margenGlobal,
      condicion_pago: cotizacion?.condicion_pago, validez_dias: cotizacion?.validez_dias,
      descuento_pct: descuentoPct || 0,
      contacto_cliente_id: contactoClienteId || null,
      columna_extra_titulo: columnaExtra.activa ? columnaExtra.titulo : null,
      ...(nuevoEstado ? { estado: nuevoEstado } : {}),
    }).eq("id", cotId)
    for (const [itemId, subs] of Object.entries(subitems)) {
      const dbItemId = String(itemId).startsWith("new_") ? null : itemId
      if (!dbItemId) continue
      await supabase.from("cotizacion_subitems").delete().eq("item_id", dbItemId)
      if (subs.length > 0) {
        await supabase.from("cotizacion_subitems").insert(
          subs.map((s: any, i: number) => ({
            item_id: dbItemId, descripcion: s.descripcion,
            proveedor_id: s.proveedor_id || null, proveedor_nombre: s.proveedor_nombre || "",
            monto: Number(s.monto) || 0, orden: i,
          }))
        )
      }
    }
    setSaving(false)
    await registrarAccion({ accion: "editar", modulo: "cotizaciones", entidad_id: cotId, entidad_tipo: "cotizacion", descripcion: "Cotizacion guardada" })
    if (nuevoEstado === "aprobada_cliente") {
      await supabase.from("cotizaciones").update({ bloqueada: true, bloqueada_por: perfilActual?.id }).eq("id", cotId)
      setBloqueada(true)
      const { data: cotData } = await supabase.from("cotizaciones").select("proyecto_id").eq("id", cotId).single()
      await registrarHistorial({ cotizacion_id: cotId!, accion: "aprobada_cliente", estado_anterior: "borrador", estado_nuevo: "aprobada_cliente", descripcion: "Aprobada. Total: " + fmt(totalFinal) })
      await enviarAlerta("cotizacion_aprobada", { nombre: proyecto?.nombre, version: cotizacion?.version, total: totalFinal, proyecto_id: id })
    }
    if (nuevoEstado) {
      router.push("/proyectos/" + id)
    } else {
      alert("Guardado correctamente")
    }
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: any = { padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff", outline: "none" }
  const puedeDesbloquear = perfilActual?.perfil === "superadmin" || perfilActual?.email === "jsosa@izango.com.pe" || perfilActual?.email === "pbastianelli@izango.com.pe"

  useEffect(() => {
  if (!cotId || !id || loading) return
  autoSaveRef.current = setInterval(async () => {
    if (saving) return
    setSaving(true)
for (const item of itemsRef.current) {
  const payload = {
    cotizacion_id: cotId, orden: item.orden, descripcion: item.descripcion,
    cantidad: Number(item.cantidad)||1, fechas: Number(item.fechas)||1,
    margen_pct: Number(item.margen_pct)||0,
    costo_manual: item.costo_manual!==""&&item.costo_manual!==null ? Number(item.costo_manual) : null,
    costo_almacenaje: Number(item.costo_almacenaje)||0, costo_impresion: Number(item.costo_impresion)||0,
    costo_permisos: Number(item.costo_permisos)||0, costo_instalacion: Number(item.costo_instalacion)||0,
    costo_performer: Number(item.costo_performer)||0, costo_alquiler: Number(item.costo_alquiler)||0,
    costo_supervision: Number(item.costo_supervision)||0, costo_movilidad: Number(item.costo_movilidad)||0,
    costo_otros: Number(item.costo_otros)||0, costo_unitario: item.costo_unitario||0,
    costo_total: item.costo_total||0, precio_cliente: item.precio_cliente||0,
    margen_monto: item.margen_monto||0, proveedor_id: item.proveedor_id||null,
    proveedor_nombre: item.proveedor_nombre||null, centro_costo_id: item.centro_costo_id||null,
    extras_produccion: JSON.stringify(item.extras_produccion||[]),
    extras_alquiler: JSON.stringify(item.extras_alquiler||[]),
    tipo: item.tipo||"item", familia_id: item.familia_id||null,
    es_opcional: item.es_opcional||false, incluir_en_total: item.incluir_en_total!==false,
    celda_titulo: item.celda_titulo||null, numero_item: item.numero_item||null,
    columna_extra_valor: item.columna_extra_valor||null,
  }
  if (String(item.id).startsWith("new_")) {
    const { data: inserted } = await supabase.from("cotizacion_items").insert(payload).select().single()
    if (inserted) {
      itemsRef.current = itemsRef.current.map(i => i.id === item.id ? { ...i, id: inserted.id } : i)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, id: inserted.id } : i))
    }
  } else {
    await supabase.from("cotizacion_items").update(payload).eq("id", item.id)
  }
}
// Eliminar items borrados
const { data: dbItems } = await supabase.from("cotizacion_items").select("id").eq("cotizacion_id", cotId)
const dbIds: string[] = (dbItems || []).map((i: any) => String(i.id))
const currentIds: string[] = itemsRef.current.filter((i: any) => !String(i.id).startsWith("new_")).map((i: any) => String(i.id))
const toDelete: string[] = dbIds.filter((dbId: string) => !currentIds.includes(dbId))
if (toDelete.length > 0) {
  await supabase.from("cotizacion_items").delete().in("id", toDelete)
}
    setSaving(false)
    setLastSaved(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }))
  }, 60000)
  return () => clearInterval(autoSaveRef.current)
}, [cotId, id, loading])

const itemsRef = useRef(items)
useEffect(() => { itemsRef.current = items }, [items])
  if (!cotId) return <div style={{ color: "#dc2626", padding: 24 }}>Error: ID no encontrado.</div>
  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>

      {showBiblioteca && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Seleccionar desde biblioteca</h2>
              <button onClick={() => setShowBiblioteca(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>
            <input style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 12 }}
              placeholder="Buscar item..." value={busquedaBib} onChange={e => setBusquedaBib(e.target.value)} autoFocus />
            <div style={{ overflowY: "auto", flex: 1 }}>
              {biblioteca.filter(i => !busquedaBib || i.descripcion?.toLowerCase().includes(busquedaBib.toLowerCase())).map(item => (
                <div key={item.id} onClick={() => cargarDesdeLibreria(item)}
                  style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", borderRadius: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.descripcion}</div>
                      {item.categoria && <span style={{ fontSize: 11, color: "#6b7280" }}>{item.categoria}</span>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F6E56" }}>{fmt(item.precio_cliente || 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasBackup && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 700, color: "#92400e", fontSize: 13 }}>⚠️ Tienes cambios sin guardar</span>
            <span style={{ color: "#b45309", fontSize: 12, marginLeft: 8 }}>Se encontró una sesión anterior sin guardar.</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => {
              const backup = localStorage.getItem("cot_backup_" + cotId)
              if (backup) {
                const { items: backupItems } = JSON.parse(backup)
                setItems(backupItems)
                setHasBackup(false)
                localStorage.removeItem("cot_backup_" + cotId)
              }
            }} style={{ padding: "6px 14px", border: "none", borderRadius: 6, background: "#d97706", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              ↩ Recuperar cambios
            </button>
            <button onClick={() => {
              localStorage.removeItem("cot_backup_" + cotId)
              setHasBackup(false)
            }} style={{ padding: "6px 14px", border: "1px solid #d97706", borderRadius: 6, background: "#fff", color: "#d97706", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {bloqueada && cotizacion?.estado === "aprobada_cliente" && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 700, color: "#991b1b", fontSize: 13 }}>🔒 Cotización aprobada y bloqueada</span>
            <span style={{ color: "#dc2626", fontSize: 12, marginLeft: 8 }}>Genera una nueva versión para hacer cambios.</span>
          </div>
          {puedeDesbloquear && (
            <button onClick={async () => {
              await supabase.from("cotizaciones").update({ bloqueada: false }).eq("id", cotId)
              setBloqueada(false)
            }} style={{ padding: "6px 14px", border: "1px solid #dc2626", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              🔓 Desbloquear
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <a href="/proyectos" style={{ color: "#9ca3af", fontSize: 12 }}>Proyectos</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <a href={"/proyectos/" + id} style={{ color: "#9ca3af", fontSize: 12 }}>{proyecto?.codigo}</a>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 12, color: "#4b5563" }}>Proforma V{cotizacion?.version}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111827" }}>{proyecto?.nombre}</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {proyecto?.cliente?.razon_social} · V{cotizacion?.version} · <span style={{
              background: cotizacion?.estado === "aprobada_cliente" ? "#dcfce7" : "#fef9c3",
              color: cotizacion?.estado === "aprobada_cliente" ? "#15803d" : "#92400e",
              padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600
            }}>{cotizacion?.estado || "borrador"}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={async () => { await guardar(); window.open(`/proyectos/${id}/cotizaciones/${cotId}/preview`, `_blank`) }}
            style={{ padding: "6px 14px", border: "1px solid #1D9E75", borderRadius: 6, background: "#fff", color: "#0F6E56", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            👁 Preview
            {lastSaved && <span style={{ fontSize: 11, color: "#9ca3af" }}>✓ Auto-guardado {lastSaved}</span>}
          </button>
          {!bloqueada && <button onClick={() => guardar()} disabled={saving} className="btn-secondary" style={{ fontSize: 12 }}>
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>}
          {!bloqueada && <button onClick={() => guardar("aprobada_cliente")} disabled={saving} className="btn-primary" style={{ fontSize: 12 }}>
            Enviar al cliente
          </button>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 16, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Condición de pago</label>
            <select style={{ ...inp, width: "100%" }} value={cotizacion?.condicion_pago || ""}
              onChange={e => setCotizacion({ ...cotizacion, condicion_pago: e.target.value })}>
              <option>50% adelanto / 50% contra entrega</option>
              <option>30% adelanto / 70% contra entrega</option>
              <option>100% adelanto</option>
              <option>Crédito 30 días</option>
              <option>Crédito 60 días</option>
              <option>Crédito 90 días</option>
              <option>A tratar</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Validez (días)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.validez_dias || 10}
              onChange={e => setCotizacion({ ...cotizacion, validez_dias: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>IGV (%)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.igv_pct ?? 18}
              onChange={e => setCotizacion({ ...cotizacion, igv_pct: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Margen objetivo (%)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.margen_objetivo || 40}
              onChange={e => setCotizacion({ ...cotizacion, margen_objetivo: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Descuento (%)</label>
            <input type="number" min={0} max={100} style={{ ...inp, width: "100%" }} value={descuentoPct || 0}
              onChange={e => setDescuentoPct(Number(e.target.value))} />
          </div>
          {contactosCliente.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Dirigido a</label>
              <select style={{ ...inp, width: "100%" }} value={contactoClienteId || ""}
                onChange={e => setContactoClienteId(e.target.value || null)}>
                <option value="">— Sin contacto específico —</option>
                {contactosCliente.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.cargo ? \ — \\ : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#374151" }}>Itemizado del presupuesto</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>▶ Expande cada ítem para costos internos</span>
            {!columnaExtra.activa ? (
              <button onClick={() => setColumnaExtra({ activa: true, titulo: "Dirección" })}
                style={{ fontSize: 11, color: "#1e40af", background: "none", border: "1px dashed #93c5fd", borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>
                + Columna extra
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ padding: "3px 8px", border: "1px solid #93c5fd", borderRadius: 6, fontSize: 11, fontFamily: "inherit", width: 120, background: "#eff6ff" }}
                  value={columnaExtra.titulo} onChange={e => setColumnaExtra({ ...columnaExtra, titulo: e.target.value })} />
                <button onClick={() => setColumnaExtra({ activa: false, titulo: "Dirección" })}
                  style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>× quitar</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
           <thead>
              <tr style={{ background: "#1D2040" }}>
                <th style={{ width: 32, padding: "8px 4px" }}></th>
                <th style={{ width: 30, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Elemento</th>
                {columnaExtra.activa && <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#93c5fd", width: 160 }}>{columnaExtra.titulo}</th>}
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Cant.</th>
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Días</th>
                <th style={{ textAlign: "right", width: 100, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>P. Unit. cli.</th>
                <th style={{ textAlign: "right", width: 110, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#1D9E75" }}>P. Cli. Manual</th>
                <th style={{ textAlign: "right", width: 130, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#03E373" }}>Total cli.</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>C. Unit.</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Total S/</th>
                <th style={{ textAlign: "center", width: 95, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Margen %</th>
                <th style={{ textAlign: "center", width: 40, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>Opc.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                if (item.tipo === "familia") {
                  const familiaItems = items.filter(i => i.familia_id === item.id)
                  const subtotalFamilia = familiaItems.filter(i => i.incluir_en_total !== false).reduce((s, i) => s + (i.precio_cliente || 0), 0)
                  return (
                    <tr key={item.id} style={{ background: "#1D2040", borderBottom: "1px solid #374151" }}>
                      <td style={{ padding: "8px 6px", textAlign: "center" }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 14 }}>×</button>
                      </td>
                      <td colSpan={columnaExtra.activa ? 8 : 7} style={{ padding: "8px 12px" }}>
                        <input style={{ ...inp, background: "transparent", border: "none", color: "#03E373", fontWeight: 800, fontSize: 14, width: "100%" }}
                          value={item.descripcion} placeholder="Nombre de la familia..."
                          onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 12px", color: "#03E373", fontWeight: 700, fontSize: 13 }}>
                        {subtotalFamilia > 0 ? fmt(subtotalFamilia) : "—"}
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>
                        <button onClick={() => {
                          const thisIdx = items.indexOf(item)
                          const familiaItemsCount = items.filter(i => i.familia_id === item.id).length
                          const nuevoItem = newItem(cotId, thisIdx + familiaItemsCount + 1, item.id)
                          setItems(prev => {
                            const fi = prev.findIndex(i => i.id === item.id)
                            const nextFamIdx = prev.slice(fi + 1).findIndex(i => i.tipo === "familia")
                            const pos = nextFamIdx === -1 ? prev.length : fi + 1 + nextFamIdx
                            return [...prev.slice(0, pos), nuevoItem, ...prev.slice(pos)]
                          })
                        }} style={{ background: "none", border: "1px dashed #03E373", borderRadius: 6, color: "#03E373", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>
                          + item
                        </button>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "center" }}>
                        <button onClick={() => {
                          const idx = items.findIndex(i => i.id === item.id)
                          const familiaItems = items.filter(i => i.familia_id === item.id)
                          const bloqueSize = 1 + familiaItems.length
                          if (idx === 0) return
                          const arr = [...items]
                          const bloque = arr.splice(idx, bloqueSize)
                          arr.splice(idx - 1, 0, ...bloque)
                          setItems(arr.map((item: any, i: number) => ({ ...item, orden: i })))
                        }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 11, padding: "2px 3px" }}>{"↑"}</button>
                        <button onClick={() => {
                          const idx = items.findIndex(i => i.id === item.id)
                          const familiaItems = items.filter(i => i.familia_id === item.id)
                          const bloqueSize = 1 + familiaItems.length
                          if (idx + bloqueSize >= items.length) return
                          const arr = [...items]
                          const bloque = arr.splice(idx, bloqueSize)
                          arr.splice(idx + 1, 0, ...bloque)
                          setItems(arr.map((item: any, i: number) => ({ ...item, orden: i })))
                        }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 11, padding: "2px 3px" }}>{"↓"}</button>
                      </td>
                    </tr>
                  )
                }
                if (item.tipo === "celda_extra") {
                  return (
                    <tr key={item.id} style={{ background: "#fffbeb", borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ textAlign: "center", padding: "6px 4px" }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 14 }}>×</button>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input style={{ ...inp, width: "100%", fontWeight: 700, color: "#92400e", fontSize: 12, background: "#fff8f0", borderColor: "#f59e0b" }}
                          value={item.celda_titulo || ""} placeholder="Título..."
                          onChange={e => updateItem(item.id, "celda_titulo", e.target.value)} />
                      </td>
                      <td colSpan={columnaExtra.activa ? 9 : 8} style={{ padding: "6px 12px" }}>
                        <input style={{ ...inp, width: "100%" }} value={item.descripcion || ""}
                          placeholder="Descripción..." onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )
                }
                const numItem = items.filter(i => i.tipo !== "familia" && i.tipo !== "celda_extra").indexOf(item) + 1
                return (
                  <>
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: expandedItems[item.id] ? "none" : "1px solid #f3f4f6", opacity: item.incluir_en_total === false ? 0.7 : 1 }}>
                      <td style={{ textAlign: "center", padding: "6px 4px" }}>
                        <button onClick={() => toggleExpand(item.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1D2040", fontSize: 13, padding: "2px 6px" }}>
                          {expandedItems[item.id] ? "▼" : "▶"}
                        </button>
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 4px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{numItem}</td>
                      <td style={{ padding: "6px 12px" }}>
                        <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion} disabled={bloqueada}
                          placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>
                      {columnaExtra.activa && (
                        <td style={{ padding: "6px 8px", width: 160 }}>
                          <input style={{ ...inp, width: "100%", background: "#eff6ff" }} value={item.columna_extra_valor || ""}
                            placeholder={columnaExtra.titulo + "..."} onChange={e => updateItem(item.id, "columna_extra_valor", e.target.value)} />
                        </td>
                      )}
                      <td style={{ padding: "6px 4px" }}>
                        <input type="number" style={{ ...inp, width: "100%", textAlign: "center" }} value={item.cantidad}
                          onChange={e => updateItem(item.id, "cantidad", Number(e.target.value))} />
                      </td>
                      <td style={{ padding: "6px 4px" }}>
                        <input type="number" style={{ ...inp, width: "100%", textAlign: "center" }} value={item.fechas}
                          onChange={e => updateItem(item.id, "fechas", Number(e.target.value))} />
                      </td>
                      <td style={{ textAlign: "right", padding: "6px 12px", fontSize: 12, color: "#6b7280" }}>
                        {item.precio_cliente > 0 ? fmt(item.precio_cliente / ((item.cantidad || 1) * (item.fechas || 1))) : "—"}
                      </td>
                      <td style={{ padding: "6px 8px", width: 110 }}>
                        <input type="number" style={{ ...inp, width: "100%", textAlign: "right", borderColor: item.precio_cliente_manual !== null && item.precio_cliente_manual !== "" ? "#1D9E75" : "#e5e7eb" }}
                          value={item.precio_cliente_manual !== null && item.precio_cliente_manual !== "" ? item.precio_cliente_manual : ""}
                          placeholder="Manual..."
                          onChange={e => updateItem(item.id, "precio_cliente_manual", e.target.value === "" ? null : Number(e.target.value))} />
                      </td>
                      <td style={{ textAlign: "right", padding: "6px 12px", fontSize: 13, color: item.precio_cliente > 0 ? "#0F6E56" : "#d1d5db", fontWeight: 700 }}>
                        {item.precio_cliente > 0 ? fmt(item.precio_cliente) : "—"}
                      </td>
                      <td style={{ padding: "6px 12px" }}>
                        <input type="number"
                          style={{ ...inp, width: "100%", textAlign: "right",
                            color: item.costo_manual !== null && item.costo_manual !== "" ? "#7c3aed" : "#6b7280",
                            borderColor: item.costo_manual !== null && item.costo_manual !== "" ? "#c4b5fd" : "#e5e7eb" }}
                          value={item.costo_manual !== null && item.costo_manual !== "" ? item.costo_manual : (item.costo_total > 0 ? item.costo_unitario.toFixed(2) : "")}
                          placeholder="Auto"
                          onChange={e => updateItem(item.id, "costo_manual", e.target.value === "" ? null : Number(e.target.value))} />
                      </td>
                      <td style={{ textAlign: "right", padding: "6px 12px", fontSize: 12, fontWeight: 600, color: item.costo_total > 0 ? "#dc2626" : "#d1d5db" }}>
                        {item.costo_total > 0 ? fmt(item.costo_total) : "—"}
                      </td>
                      <td style={{ padding: "6px 4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}>
                          <input type="number" min={0} max={99} step={0.1}
                            style={{ ...inp, width: 70, textAlign: "center", fontWeight: 700,
                              color: item.margen_pct >= 35 ? "#0F6E56" : item.margen_pct >= 20 ? "#ca8a04" : "#dc2626" }}
                            value={item.margen_pct}
                            onChange={e => updateItem(item.id, "margen_pct", Number(e.target.value))} />
                          <span style={{ fontSize: 10, color: "#9ca3af" }}>%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 4px" }}>
                        <input type="checkbox" checked={item.incluir_en_total !== false} title="Incluir en total"
                          onChange={e => updateItem(item.id, "incluir_en_total", e.target.checked)}
                          style={{ cursor: "pointer", width: 14, height: 14, accentColor: "#03E373" }} />
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 4px" }}>
                        <button onClick={() => moverItem(item.id, "arriba")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 11, padding: "2px 3px" }}>{"↑"}</button>
                        <button onClick={() => moverItem(item.id, "abajo")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 11, padding: "2px 3px" }}>{"↓"}</button>
                        <button onClick={() => removeItem(item.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 16 }}>×</button>
                      </td>
                    </tr>
                    {expandedItems[item.id] && (
                      <tr key={item.id + "_exp"}>
                        <td colSpan={columnaExtra.activa ? 13 : 12} style={{ padding: 0, background: "#f8fffe", borderBottom: "2px solid #1D9E75" }}>
                          <div style={{ padding: "12px 16px 16px 48px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase" }}>Costos internos</span>
                                <button onClick={() => addSubitem(item.id)}
                                  style={{ fontSize: 11, color: "#7c3aed", background: "none", border: "1px dashed #7c3aed", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>
                                  + Sub-item / Partida
                                </button>
                                {item.costo_manual !== null && item.costo_manual !== "" && (
                                  <span style={{ fontSize: 11, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: 99 }}>
                                    ✎ Manual: {fmt(Number(item.costo_manual))}
                                    <button onClick={() => updateItem(item.id, "costo_manual", null)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", marginLeft: 4 }}>× quitar</button>
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, color: "#6b7280" }}>Familia:</span>
                                <select style={{ ...inp, minWidth: 140 }} value={item.familia_id || ""}
                                  onChange={e => updateItem(item.id, "familia_id", e.target.value || null)}>
                                  <option value="">Sin familia</option>
                                  {items.filter(i => i.tipo === "familia").map((f: any) => <option key={f.id} value={f.id}>{f.descripcion}</option>)}
                                </select>
                                <span style={{ fontSize: 11, color: "#6b7280" }}>Centro costos:</span>
                                <select style={{ ...inp, minWidth: 140 }} value={item.centro_costo_id || ""}
                                  onChange={e => updateItem(item.id, "centro_costo_id", e.target.value || null)}>
                                  <option value="">Sin centro</option>
                                  {centrosCostos.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.nombre}</option>)}
                                </select>
                                <span style={{ fontSize: 11, color: "#6b7280" }}>Proveedor:</span>
                                <select style={{ ...inp, minWidth: 160 }} value={item.proveedor_id || ""}
                                  onChange={e => {
                                    const prov = proveedores.find((p: any) => p.id === e.target.value)
                                    updateItem(item.id, "proveedor_id", e.target.value || null)
                                    updateItem(item.id, "proveedor_nombre", prov?.nombre || "")
                                  }}>
                                  <option value="">Sin proveedor</option>
                                  {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                              </div>
                            </div>
                            {(subitems[item.id] || []).length > 0 && (
                              <div style={{ marginBottom: 12, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase" }}>Sub-items / Partidas</div>
                                {(subitems[item.id] || []).map((sub: any) => (
                                  <div key={sub.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
                                    <input style={{ ...inp }} value={sub.descripcion} placeholder="Descripcion (ej: Anfitriona 1)"
                                      onChange={e => updateSubitem(item.id, sub.id, "descripcion", e.target.value)} />
                                    <select style={inp} value={sub.proveedor_id || ""} onChange={e => {
                                      const prov = proveedores.find((p: any) => p.id === e.target.value)
                                      updateSubitem(item.id, sub.id, "proveedor_id", e.target.value || null)
                                      updateSubitem(item.id, sub.id, "proveedor_nombre", prov?.nombre || "")
                                    }}>
                                      <option value="">Sin proveedor</option>
                                      {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                    <input type="number" style={{ ...inp, textAlign: "right" }} value={sub.monto || ""} placeholder="Monto"
                                      onChange={e => updateSubitem(item.id, sub.id, "monto", Number(e.target.value))} />
                                    <button onClick={() => removeSubitem(item.id, sub.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }}>×</button>
                                  </div>
                                ))}
                                <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#7c3aed", marginTop: 4 }}>
                                  Total: {fmt((subitems[item.id] || []).reduce((s: number, sb: any) => s + (Number(sb.monto) || 0), 0))}
                                </div>
                              </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                              {COSTOS_INTERNOS.map(cat => (
                                <div key={cat.key} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{cat.label}</div>
                                  <input type="number" style={{ ...inp, width: "100%", border: "none", padding: "2px 0", fontSize: 13, fontWeight: 600 }}
                                    value={item[cat.key] || ""} placeholder="0"
                                    onChange={e => updateItem(item.id, cat.key, Number(e.target.value))} />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Extras producción</span>
                                  <button onClick={() => addExtra(item.id, "extras_produccion")}
                                    style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>+ Agregar</button>
                                </div>
                                {(item.extras_produccion || []).map((extra: any, i: number) => (
                                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                                    <input style={{ ...inp, flex: 1 }} value={extra.label} placeholder="Concepto"
                                      onChange={e => updateExtra(item.id, "extras_produccion", i, "label", e.target.value)} />
                                    <input type="number" style={{ ...inp, width: 90, textAlign: "right" }} value={extra.monto || ""} placeholder="0"
                                      onChange={e => updateExtra(item.id, "extras_produccion", i, "monto", Number(e.target.value))} />
                                    <button onClick={() => removeExtra(item.id, "extras_produccion", i)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>×</button>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Extras alquiler / RRHH</span>
                                  <button onClick={() => addExtra(item.id, "extras_alquiler")}
                                    style={{ fontSize: 11, color: "#0F6E56", background: "none", border: "1px dashed #1D9E75", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>+ Agregar</button>
                                </div>
                                {(item.extras_alquiler || []).map((extra: any, i: number) => (
                                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                                    <input style={{ ...inp, flex: 1 }} value={extra.label} placeholder="Concepto"
                                      onChange={e => updateExtra(item.id, "extras_alquiler", i, "label", e.target.value)} />
                                    <input type="number" style={{ ...inp, width: 90, textAlign: "right" }} value={extra.monto || ""} placeholder="0"
                                      onChange={e => updateExtra(item.id, "extras_alquiler", i, "monto", Number(e.target.value))} />
                                    <button onClick={() => removeExtra(item.id, "extras_alquiler", i)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>×</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                <td></td>
                <td colSpan={columnaExtra.activa ? 6 : 5} style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={feeActivo} onChange={e => setFeeActivo(e.target.checked)} style={{ cursor: "pointer", width: 14, height: 14 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: feeActivo ? "#374151" : "#9ca3af" }}>Fee de agencia</span>
                    </label>
                    {feeActivo && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" min={0} max={100} style={{ ...inp, width: 60, textAlign: "center" }}
                          value={cotizacion?.fee_agencia_pct ?? 10}
                          onChange={e => setCotizacion({ ...cotizacion, fee_agencia_pct: Number(e.target.value) })} />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>% sobre precio cliente</span>
                      </div>
                    )}
                    {!feeActivo && <span style={{ fontSize: 11, color: "#9ca3af" }}>No aplica</span>}
                  </div>
                </td>
                <td></td>
                <td style={{ textAlign: "right", padding: "10px 12px", fontSize: 13, fontWeight: 700, color: feeActivo ? "#374151" : "#d1d5db" }}>
                  {feeActivo ? fmt(feeMonto) : "—"}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
          <button onClick={abrirBiblioteca}
            style={{ border: "1px dashed #1D2040", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#1D2040", cursor: "pointer" }}>
            📚 Desde biblioteca
          </button>
          <button onClick={() => setItems(prev => [...prev, newFamilia(cotId, prev.length)])}
            style={{ border: "1px dashed #03E373", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#027a45", cursor: "pointer" }}>
            + Familia / Grupo
          </button>
          <button onClick={() => {
            const ultimaFamilia = [...items].reverse().find(i => i.tipo === "familia")
            setItems(prev => [...prev, newItem(cotId, prev.length, ultimaFamilia?.id)])
          }} style={{ border: "1px dashed #d1d5db", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
            + Agregar ítem
          </button>
          <button onClick={() => setItems(prev => [...prev, newCeldaExtra(cotId, prev.length)])}
            style={{ border: "1px dashed #f59e0b", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#92400e", cursor: "pointer" }}>
            + Campo adicional
          </button>
        </div>
      </div>

      <div style={{ background: "#E1F5EE", border: "1px solid #1D9E75", borderRadius: 12, padding: "20px 24px", display: "flex", gap: 0, flexWrap: "wrap", alignItems: "stretch", marginTop: 16 }}>
        {[
          { label: "Subtotal costo", value: fmt(totalCosto), color: "#dc2626", size: 18 },
          { label: "Precio cliente", value: fmt(totalPrecioCliente), color: "#374151", size: 18 },
          ...(feeActivo ? [{ label: `Fee agencia (${feePct}%)`, value: fmt(feeMonto), color: "#374151", size: 18 }] : []),
          { label: "Subtotal c/ fee", value: fmt(subtotalConFee), color: "#374151", size: 18 },
          ...(descuentoPct > 0 ? [{ label: `Descuento (${descuentoPct}%)`, value: "- " + fmt(descuentoMonto), color: "#dc2626", size: 18 }] : []),
          { label: `IGV (${igvPct}%)`, value: fmt(igvMonto), color: "#374151", size: 18 },
          { label: "TOTAL CLIENTE", value: fmt(totalFinal), color: "#04342C", size: 24 },
          { label: "Margen global", value: margenGlobal.toFixed(1) + "%", color: margenGlobal >= 35 ? "#0F6E56" : margenGlobal >= 20 ? "#ca8a04" : "#dc2626", size: 22 },
        ].map((t, i, arr) => (
          <div key={t.label} style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 24, marginRight: 24, borderRight: i < arr.length - 1 ? "1px solid #a7f3d0" : "none" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#085041" }}>{t.label}</div>
            <div style={{ fontSize: t.size, fontWeight: 700, color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

    </div>
  )
}