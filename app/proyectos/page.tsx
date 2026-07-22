"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, CircleDollarSign, Clock3, Copy, Eye, FolderKanban, Trash2, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { useRouter } from "next/navigation"
import { softDeleteProject } from "@/lib/projects"
import { filtrarPorAlcance, puedeEjecutarAccion, puedeVerModulo } from "@/lib/permisos"
import { getProyectoEstadosVisuales } from "@/lib/core/configuration"

import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2FormField,
  V2IconButton,
  V2Input,
  V2KpiCard,
  V2PageHeader,
  V2Pagination,
  V2Select,
  V2StatusBadge,
  V2Tooltip,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar, V2FilterDrawer } from "@/components/v2/filters"
import filterStyles from "@/components/v2/filters/V2Filters.module.css"
import styles from "./Proyectos.module.css"

const ESTADO_LABEL = Object.fromEntries(
  Object.entries(getProyectoEstadosVisuales()).map(([k, v]) => [k, v.label])
)

// Tono visual por estado real (getProyectoEstadosVisuales). No representa ni modifica
// las reglas de transicion de negocio, solo la categoria cromatica del badge.
const ESTADO_TONE: Record<string, "info" | "success" | "warning" | "danger" | "neutral"> = {
  pendiente_aprobacion: "warning",
  aprobado_produccion: "warning",
  aprobado_gerencia: "warning",
  aprobado: "info",
  aprobado_cliente: "info",
  en_curso: "success",
  terminado: "warning",
  liquidado: "info",
  cerrado_financiero: "neutral",
  rechazado: "danger",
  cancelado: "danger",
}

function estadoTone(estado?: string | null): "info" | "success" | "warning" | "danger" | "neutral" {
  return ESTADO_TONE[estado || ""] || "neutral"
}

function productorInitials(productor?: { nombre?: string | null; apellido?: string | null } | null) {
  if (!productor) return "—"
  return `${productor.nombre?.[0] || ""}${productor.apellido?.[0] || ""}`.toUpperCase() || "—"
}

function EstadoMultiSelect({
  selected,
  onChange,
  compact = false,
}: {
  selected: string[]
  onChange: (selected: string[]) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const allKeys = Object.keys(ESTADO_LABEL)

  const toggleAll = () => {
    if (selected.length === allKeys.length) {
      onChange([])
    } else {
      onChange(allKeys)
    }
  }

  const toggleItem = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key))
    } else {
      onChange([...selected, key])
    }
  }

  const buttonLabel =
    selected.length === 0
      ? "Todos los estados"
      : selected.length === 1
      ? ESTADO_LABEL[selected[0]] || selected[0]
      : `${selected.length} estados sel.`

  return (
    <div className={styles.multiSelectWrapper} ref={containerRef}>
      <button
        type="button"
        className={`${styles.multiSelectTrigger} ${compact ? styles.multiSelectTriggerCompact : ""}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{buttonLabel}</span>
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
      </button>

      {open && (
        <div className={styles.multiSelectDropdown} onClick={(e) => e.stopPropagation()}>
          <div className={styles.multiSelectHeader}>
            <button type="button" className={styles.multiSelectActionBtn} onClick={toggleAll}>
              {selected.length === allKeys.length ? "Desmarcar todos" : "Seleccionar todos"}
            </button>
            {selected.length > 0 && (
              <button type="button" className={styles.multiSelectActionBtn} onClick={() => onChange([])}>
                Limpiar ({selected.length})
              </button>
            )}
          </div>
          <div className={styles.multiSelectList}>
            {Object.entries(ESTADO_LABEL).map(([key, label]) => {
              const checked = selected.includes(key)
              return (
                <label key={key} className={styles.multiSelectItem}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(key)}
                  />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const POR_PAGINA = 50

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [eliminados, setEliminados] = useState<any[]>([])
  const [mostrarEliminados, setMostrarEliminados] = useState(false)
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)

  // Filtros rapidos (aplican en vivo, igual que antes)
  const [filtrosEstado, setFiltrosEstado] = useState<string[]>([])
  const [filtroCliente, setFiltroCliente] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [pagina, setPagina] = useState(1)

  // Filtros por columna de tabla
  const [filtroCodigo, setFiltroCodigo] = useState("")
  const [filtroProyecto, setFiltroProyecto] = useState("")
  const [filtroSubtotal, setFiltroSubtotal] = useState("")
  const [filtroFecha, setFiltroFecha] = useState("")

  // Filtros avanzados (se editan en el drawer y se aplican al confirmar)
  const [filtroProductor, setFiltroProductor] = useState("")
  const [filtroEntidad, setFiltroEntidad] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tempCodigo, setTempCodigo] = useState("")
  const [tempProyecto, setTempProyecto] = useState("")
  const [tempCliente, setTempCliente] = useState("")
  const [tempProductor, setTempProductor] = useState("")
  const [tempEntidad, setTempEntidad] = useState("")
  const [tempSubtotal, setTempSubtotal] = useState("")
  const [tempFecha, setTempFecha] = useState("")
  const [tempEstados, setTempEstados] = useState<string[]>([])

  const [perfil, setPerfil] = useState<any>(null)
  const [accesoRestringido, setAccesoRestringido] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const load = useCallback(async () => {
    await Promise.resolve()
    const clienteIdParam = new URLSearchParams(window.location.search).get("cliente_id") || ""
    setFiltroCliente(clienteIdParam)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfilActual } = user
      ? await supabase.from("perfiles").select("*").eq("id", user.id).single()
      : { data: null }
    setPerfil(perfilActual)

    if (!puedeVerModulo(perfilActual, "proyectos")) {
      setAccesoRestringido(true)
      setProyectos([])
      setEliminados([])
      setLoading(false)
      return
    }

    setAccesoRestringido(false)
    const { data } = await supabase
      .from("proyectos")
      .select(
        "*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre, apellido), cotizacion_aprobada:cotizaciones!cotizacion_aprobada_id(version, total_cliente)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    const proyectosData = filtrarPorAlcance(data || [], perfilActual, "proyectos", { usuarioId: user?.id })
    setProyectos(proyectosData)

    const hace2dias = new Date()
    hace2dias.setDate(hace2dias.getDate() - 2)
    const { data: elim } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social)")
      .not("deleted_at", "is", null)
      .gte("deleted_at", hace2dias.toISOString())
      .order("deleted_at", { ascending: false })

    setEliminados(filtrarPorAlcance(elim || [], perfilActual, "proyectos", { usuarioId: user?.id }))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) {
        load()
      }
    })
    return () => {
      active = false
    }
  }, [load])

  async function eliminar(id: string, nombre: string) {
    const proyecto = proyectos.find((p: any) => p.id === id) || eliminados.find((p: any) => p.id === id)
    if (!puedeEjecutarAccion(perfil, "proyectos", "eliminar", { usuarioId: perfil?.id, registro: proyecto })) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    if (!confirm("¿Eliminar el proyecto " + nombre + "? Podrás recuperarlo en los próximos 2 días.")) return
    setEliminando(id)
    const { error } = await softDeleteProject(supabase, id)
    if (error) alert("No se pudo eliminar el proyecto: " + error.message)
    setEliminando(null)
    load()
  }

  async function copiarProyecto(p: any) {
    if (!puedeEjecutarAccion(perfil, "proyectos", "duplicar", { usuarioId: perfil?.id, registro: p })) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    if (!confirm(`¿Copiar proyecto "${p.nombre}"?`)) return
    const { data: todosProj } = await supabase.from("proyectos").select("codigo")
    const maxNum = (todosProj || []).reduce((max: number, pr: any) => {
      const num = parseInt((pr.codigo || "").replace("IZ-", "")) || 0
      return num > max ? num : max
    }, 26000)
    const nuevoCodigo = `IZ-${maxNum + 1}`

    const { data: nuevo } = await supabase.from("proyectos").insert({
      codigo: nuevoCodigo,
      nombre: p.nombre + " (copia)",
      cliente_id: p.cliente_id || null,
      productor_id: p.productor_id || null,
      entidad: p.entidad || "peru",
      fecha_inicio: p.fecha_inicio || null,
      fecha_fin_estimada: p.fecha_fin_estimada || null,
      presupuesto_referencial: p.presupuesto_referencial || null,
      estado: "pendiente_aprobacion",
    }).select().single()

    if (!nuevo) return

    const { data: cots } = await supabase.from("cotizaciones").select("*").eq("proyecto_id", p.id).is("deleted_at", null)
    for (const cot of (cots || [])) {
      const { data: nuevaCot } = await supabase.from("cotizaciones").insert({
        proyecto_id: nuevo.id, version: cot.version, estado: "borrador",
        condicion_pago: cot.condicion_pago, validez_dias: cot.validez_dias,
        fee_agencia_pct: cot.fee_agencia_pct, fee_activo: cot.fee_activo,
        igv_pct: cot.igv_pct, descuento_pct: cot.descuento_pct || 0,
      }).select().single()

      if (!nuevaCot) continue
      const { data: items } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cot.id)
      if (items && items.length > 0) {
        await supabase.from("cotizacion_items").insert(
          items.map((item: any) => {
            const newItem = { ...item }
            delete newItem.id
            delete newItem.cotizacion_id
            newItem.cotizacion_id = nuevaCot.id
            return newItem
          })
        )
      }
    }
    load()
    router.push("/proyectos/" + nuevo.id)
  }

  async function recuperar(id: string) {
    const proyecto = eliminados.find((p: any) => p.id === id)
    if (!puedeEjecutarAccion(perfil, "proyectos", "reabrir", { usuarioId: perfil?.id, registro: proyecto })) {
      alert("No tienes permiso para realizar esta acción.")
      return
    }
    await supabase.from("proyectos").update({ deleted_at: null }).eq("id", id)
    load()
  }

  const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Helper para calcular horas restantes (fuera de render para evitar impure function)
  const getHorasRestantes = (deletedAt: string): number => {
    const eliminadoMs = new Date(deletedAt).getTime()
    const ahora = new Date().getTime()
    const horasTranscurridas = Math.floor((ahora - eliminadoMs) / (1000 * 60 * 60))
    return 48 - horasTranscurridas
  }

  // Proyectos eliminados con horas restantes precalculadas
  const eliminadosConHoras = useMemo(
    () =>
      eliminados.map((p) => ({
        ...p,
        horasRestantes: getHorasRestantes(p.deleted_at),
      })),
    [eliminados]
  )

  // Filters logic - combinacion simultanea de todos los filtros por columna y globales (AND)
  const filtrados = proyectos.filter((p) => {
    if (filtroCodigo && !p.codigo?.toLowerCase().includes(filtroCodigo.toLowerCase())) return false
    if (filtroProyecto) {
      const pr = filtroProyecto.toLowerCase()
      const matchName = p.nombre?.toLowerCase().includes(pr)
      const matchEntidad = (p.entidad === "selva" ? "selva" : "peru").includes(pr)
      if (!matchName && !matchEntidad) return false
    }
    if (filtroCliente) {
      const cl = filtroCliente.toLowerCase()
      const matchId = p.cliente_id === filtroCliente
      const matchName = p.cliente?.razon_social?.toLowerCase().includes(cl)
      if (!matchId && !matchName) return false
    }
    if (filtroProductor) {
      const prod = filtroProductor.toLowerCase()
      const matchId = p.productor_id === filtroProductor
      const fullName = `${p.productor?.nombre || ""} ${p.productor?.apellido || ""}`.toLowerCase()
      if (!matchId && !fullName.includes(prod)) return false
    }
    if (filtroEntidad && p.entidad !== filtroEntidad) return false
    if (filtrosEstado.length > 0 && !filtrosEstado.includes(p.estado)) return false
    if (filtroSubtotal) {
      const sub = filtroSubtotal.toLowerCase()
      const rawTotal = p.cotizacion_aprobada?.total_cliente != null ? String(p.cotizacion_aprobada.total_cliente) : ""
      const fmtTotal = p.cotizacion_aprobada?.total_cliente != null ? fmt(p.cotizacion_aprobada.total_cliente).toLowerCase() : ""
      if (!rawTotal.includes(sub) && !fmtTotal.includes(sub)) return false
    }
    if (filtroFecha) {
      const f = filtroFecha.toLowerCase()
      const fechaFormatted = p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE").toLowerCase() : ""
      const rawFecha = p.fecha_inicio?.toLowerCase() || ""
      if (!fechaFormatted.includes(f) && !rawFecha.includes(f)) return false
    }
    if (busqueda) {
      const b = busqueda.toLowerCase()
      const match =
        p.codigo?.toLowerCase().includes(b) ||
        p.nombre?.toLowerCase().includes(b) ||
        p.cliente?.razon_social?.toLowerCase().includes(b) ||
        `${p.productor?.nombre || ""} ${p.productor?.apellido || ""}`.toLowerCase().includes(b)
      if (!match) return false
    }
    return true
  })

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const puedeCrearProyecto = puedeEjecutarAccion(perfil, "proyectos", "crear", { usuarioId: perfil?.id, registro: { productor_id: perfil?.id, created_by: perfil?.id } })
  const puedeExportarProyectos = puedeEjecutarAccion(perfil, "proyectos", "exportar", { usuarioId: perfil?.id, registro: { productor_id: perfil?.id, created_by: perfil?.id } })

  // KPIs universales sobre el alcance visible del usuario
  const kpis = {
    enCurso: proyectos.filter(p => p.estado === "en_curso").length,
    pndLiquidacion: proyectos.filter(p => p.estado === "terminado").length,
  }

  const montoAprobadoTotal = proyectos.reduce((sum, p: any) => sum + Number(p?.cotizacion_aprobada?.total_cliente || 0), 0)

  // Unique clients and producers for filter dropdowns
  const clientesUnicos = Array.from(
    new Map(proyectos.filter((p: any) => p.cliente).map((p: any) => [p.cliente_id, p.cliente])).values()
  )
  const productoresUnicos = Array.from(
    new Map(proyectos.filter((p: any) => p.productor).map((p: any) => [p.productor_id, p.productor])).values()
  )

  function abrirFiltrosAvanzados() {
    setTempCodigo(filtroCodigo)
    setTempProyecto(filtroProyecto)
    setTempCliente(filtroCliente)
    setTempProductor(filtroProductor)
    setTempEntidad(filtroEntidad)
    setTempSubtotal(filtroSubtotal)
    setTempFecha(filtroFecha)
    setTempEstados(filtrosEstado)
    setDrawerOpen(true)
  }

  function aplicarFiltrosAvanzados() {
    setFiltroCodigo(tempCodigo)
    setFiltroProyecto(tempProyecto)
    setFiltroCliente(tempCliente)
    setFiltroProductor(tempProductor)
    setFiltroEntidad(tempEntidad)
    setFiltroSubtotal(tempSubtotal)
    setFiltroFecha(tempFecha)
    setFiltrosEstado(tempEstados)
    setPagina(1)
    setDrawerOpen(false)
  }

  function limpiarFiltrosAvanzados() {
    setFiltroCodigo("")
    setFiltroProyecto("")
    setFiltroCliente("")
    setFiltroProductor("")
    setFiltroEntidad("")
    setFiltroSubtotal("")
    setFiltroFecha("")
    setFiltrosEstado([])
    setTempCodigo("")
    setTempProyecto("")
    setTempCliente("")
    setTempProductor("")
    setTempEntidad("")
    setTempSubtotal("")
    setTempFecha("")
    setTempEstados([])
    setPagina(1)
    setDrawerOpen(false)
  }

  function quitarFiltroAvanzado(chipId: string) {
    if (chipId === "codigo") setFiltroCodigo("")
    else if (chipId === "proyecto") setFiltroProyecto("")
    else if (chipId === "cliente") setFiltroCliente("")
    else if (chipId === "productor") setFiltroProductor("")
    else if (chipId === "entidad") setFiltroEntidad("")
    else if (chipId === "subtotal") setFiltroSubtotal("")
    else if (chipId === "fecha") setFiltroFecha("")
    else if (chipId.startsWith("estado:")) {
      const estado = chipId.slice("estado:".length)
      setFiltrosEstado((prev) => prev.filter((e) => e !== estado))
    }
    setPagina(1)
  }

  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; valueLabel: string }[] = []
    if (filtroCodigo) {
      chips.push({ id: "codigo", label: "Código", valueLabel: filtroCodigo })
    }
    if (filtroProyecto) {
      chips.push({ id: "proyecto", label: "Proyecto", valueLabel: filtroProyecto })
    }
    if (filtroCliente) {
      const cl = clientesUnicos.find((c: any) => c.id === filtroCliente) as any
      chips.push({ id: "cliente", label: "Cliente", valueLabel: cl ? cl.razon_social : "Seleccionado" })
    }
    if (filtroProductor) {
      const prod = productoresUnicos.find((p: any) => p.id === filtroProductor) as any
      chips.push({ id: "productor", label: "Productor", valueLabel: prod ? `${prod.nombre} ${prod.apellido}` : "Asignado" })
    }
    if (filtroEntidad) {
      chips.push({ id: "entidad", label: "Entidad", valueLabel: filtroEntidad === "selva" ? "Izango Selva" : "Izango Perú" })
    }
    filtrosEstado.forEach((estado) => {
      chips.push({ id: `estado:${estado}`, label: "Estado", valueLabel: ESTADO_LABEL[estado] || estado })
    })
    if (filtroSubtotal) {
      chips.push({ id: "subtotal", label: "Subtotal", valueLabel: filtroSubtotal })
    }
    if (filtroFecha) {
      chips.push({ id: "fecha", label: "Fecha", valueLabel: filtroFecha })
    }
    return chips
  }, [filtroCodigo, filtroProyecto, filtroCliente, filtroProductor, filtroEntidad, filtrosEstado, filtroSubtotal, filtroFecha, clientesUnicos, productoresUnicos])

  const totalFiltrosActivos =
    activeChips.length + (busqueda ? 1 : 0)

  // V2 Table columns definition - Fila única de encabezados limpios
  const tableColumns: V2TableColumn<any>[] = [
    {
      key: "codigo",
      header: "CÓDIGO",
      render: (p) => <span style={{ fontWeight: 800, color: "var(--v2-accent)", fontSize: "12px" }}>{p.codigo}</span>,
    },
    {
      key: "proyecto",
      header: "PROYECTO",
      minWidth: 220,
      render: (p) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontWeight: 800, color: "var(--v2-text)", fontSize: "13.5px" }}>{p.nombre}</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <span
              style={{
                fontSize: "10px",
                background: p.entidad === "selva" ? "rgba(245, 158, 11, 0.08)" : "rgba(59, 130, 246, 0.08)",
                color: p.entidad === "selva" ? "rgb(245, 158, 11)" : "rgb(59, 130, 246)",
                padding: "1px 6px",
                borderRadius: "99px",
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              {p.entidad === "selva" ? "Selva" : "Perú"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "cliente",
      header: "CLIENTE",
      render: (p) => p.cliente?.razon_social || "—",
    },
    {
      key: "productor",
      header: "PRODUCTOR",
      render: (p) =>
        p.productor ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                width: "24px",
                height: "24px",
                flexShrink: 0,
                borderRadius: "999px",
                background: "var(--v2-surface-muted)",
                color: "var(--v2-text)",
                fontSize: "10px",
                fontWeight: 900,
              }}
            >
              {productorInitials(p.productor)}
            </span>
            <span>{p.productor.nombre} {p.productor.apellido}</span>
          </div>
        ) : (
          <span style={{ color: "var(--v2-muted)" }}>—</span>
        ),
    },
    {
      key: "estado",
      header: "ESTADO",
      render: (p) => <V2StatusBadge tone={estadoTone(p.estado)}>{ESTADO_LABEL[p.estado] || p.estado || "—"}</V2StatusBadge>,
    },
    {
      key: "subtotal",
      header: "SUBTOTAL",
      align: "right",
      render: (p) =>
        p.cotizacion_aprobada ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                color: "var(--v2-brand-primary)",
                background: "var(--v2-brand-primary-light)",
                padding: "1px 6px",
                borderRadius: "99px",
                width: "fit-content",
              }}
            >
              V{p.cotizacion_aprobada.version}
            </span>
            <span style={{ fontWeight: 800, color: "var(--v2-text)", fontSize: "13px", marginTop: "2px" }}>
              {fmt(p.cotizacion_aprobada.total_cliente)}
            </span>
          </div>
        ) : (
          <span style={{ color: "var(--v2-muted)" }}>—</span>
        ),
    },
    {
      key: "fecha",
      header: "FECHA",
      render: (p) => (p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"),
    },
    {
      key: "acciones",
      header: "ACCIONES",
      align: "right",
      render: (p) => (
        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
          <V2Tooltip content="Ver detalle">
            <V2IconButton label="Ver detalle" size="sm" onClick={() => router.push("/proyectos/" + p.id)}>
              <Eye size={14} />
            </V2IconButton>
          </V2Tooltip>
          {puedeEjecutarAccion(perfil, "proyectos", "duplicar", { usuarioId: perfil?.id, registro: p }) && (
            <V2Tooltip content="Copiar proyecto">
              <V2IconButton label="Copiar proyecto" size="sm" onClick={() => copiarProyecto(p)}>
                <Copy size={14} />
              </V2IconButton>
            </V2Tooltip>
          )}
          {puedeEjecutarAccion(perfil, "proyectos", "eliminar", { usuarioId: perfil?.id, registro: p }) && (
            <V2Tooltip content="Eliminar proyecto">
              <V2IconButton
                label="Eliminar proyecto"
                size="sm"
                variant="danger"
                disabled={eliminando === p.id}
                onClick={() => eliminar(p.id, p.nombre)}
              >
                <Trash2 size={14} />
              </V2IconButton>
            </V2Tooltip>
          )}
        </div>
      ),
    },
  ]

  if (loading) return <div style={{ padding: 24, color: "var(--v2-muted)" }}>Cargando proyectos...</div>
  if (accesoRestringido) return <div style={{ padding: 24, color: "var(--v2-muted)" }}>Acceso restringido</div>

  const rangoInicio = filtrados.length === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const rangoFin = Math.min(pagina * POR_PAGINA, filtrados.length)

  const kpiSection = (
    <div className={styles.kpiGrid}>
      <V2KpiCard
        icon={<FolderKanban size={16} />}
        label="Total Proyectos"
        value={String(proyectos.length)}
        description="En el alcance de tu perfil"
      />
      <V2KpiCard
        icon={<Zap size={16} />}
        label="En Ejecución"
        value={String(kpis.enCurso)}
        description="Proyectos en curso"
      />
      <V2KpiCard
        icon={<Clock3 size={16} />}
        label="Liq. Pendientes"
        value={String(kpis.pndLiquidacion)}
        description="Proyectos terminados sin liquidar"
      />
      <V2KpiCard
        icon={<CircleDollarSign size={16} />}
        label="Monto Aprobado"
        value={fmt(montoAprobadoTotal)}
        description="Suma de cotizaciones aprobadas"
      />
    </div>
  )

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            title="Gestión de Proyectos"
            subtitle="Supervisión integral de operaciones y control financiero de la organización."
            actions={
              puedeCrearProyecto ? (
                <V2Button icon={<FolderKanban size={14} />} onClick={() => router.push("/proyectos/nuevo")}>
                  Nuevo Proyecto
                </V2Button>
              ) : undefined
            }
          />
        }
        summary={kpiSection}
        toolbar={
          <V2FilterBar
            searchValue={busqueda}
            onSearchChange={(val) => {
              setBusqueda(val)
              setPagina(1)
            }}
            activeFiltersCount={totalFiltrosActivos}
            onToggleDrawer={abrirFiltrosAvanzados}
            quickFilters={
              <>
                <div className={filterStyles.clienteWrapper}>
                  <V2Select
                    options={[
                      { label: "Todos los clientes", value: "" },
                      ...clientesUnicos.map((c: any) => ({
                        label: c.razon_social,
                        value: c.id || "",
                      })),
                    ]}
                    value={filtroCliente}
                    onChange={(e) => {
                      setFiltroCliente(e.target.value)
                      setPagina(1)
                    }}
                    compact
                  />
                </div>

                <div className={filterStyles.estadoWrapper} style={{ minWidth: 160 }}>
                  <EstadoMultiSelect
                    compact
                    onChange={(est) => {
                      setFiltrosEstado(est)
                      setPagina(1)
                    }}
                    selected={filtrosEstado}
                  />
                </div>

                {(puedeExportarProyectos || puedeCrearProyecto) && (
                  <ImportExport
                    variant="v2"
                    modulo="proyectos"
                    campos={[
                      { key: "nombre", label: "Nombre", requerido: true },
                      { key: "descripcion_requerimiento", label: "Descripcion" },
                      { key: "presupuesto_referencial", label: "Presupuesto" },
                      { key: "fecha_inicio", label: "Fecha ejecucion" },
                      { key: "fecha_fin_estimada", label: "Fecha fin estimada" },
                    ]}
                    datos={proyectos}
                    onImportar={async (registros) => {
                      if (!puedeCrearProyecto)
                        return { exitosos: 0, errores: ["No tienes permiso para realizar esta acción."] }
                      let exitosos = 0
                      const errores: string[] = []
                      for (const r of registros) {
                        const { error } = await supabase.from("proyectos").insert({
                          ...r,
                          entidad: "peru",
                          estado: "pendiente_aprobacion",
                        })
                        if (error) errores.push(r.nombre + ": " + error.message)
                        else exitosos++
                      }
                      load()
                      return { exitosos, errores }
                    }}
                  />
                )}
              </>
            }
            showClearButton={!!(busqueda || filtroCodigo || filtroProyecto || filtroCliente || filtroProductor || filtroEntidad || filtroSubtotal || filtroFecha || filtrosEstado.length)}
            onClearFilters={() => {
              setBusqueda("")
              setFiltroCodigo("")
              setFiltroProyecto("")
              setFiltroCliente("")
              setFiltroProductor("")
              setFiltroEntidad("")
              setFiltroSubtotal("")
              setFiltroFecha("")
              setFiltrosEstado([])
              setTempProductor("")
              setTempEntidad("")
              setTempEstados([])
              setPagina(1)
              router.push("/proyectos")
            }}
          />
        }
        table={
          <>
            {/* Contador de eliminados recuperables: visible pero con menor protagonismo visual */}
            {eliminados.length > 0 && (
              <div className={styles.eliminadosToggleRow}>
                <V2Button
                  variant="ghost"
                  size="compact"
                  onClick={() => setMostrarEliminados((v) => !v)}
                >
                  🗑 {eliminados.length} eliminado{eliminados.length > 1 ? "s" : ""} recuperable{eliminados.length > 1 ? "s" : ""}
                  {mostrarEliminados ? " · ocultar" : " · ver"}
                </V2Button>
              </div>
            )}

            {mostrarEliminados && eliminados.length > 0 && (
              <div className={styles.eliminadosPanel}>
                {eliminadosConHoras.map((p: any) => (
                  <div key={p.id} className={styles.eliminadosRow}>
                    <div>
                      <span className={styles.eliminadosNombre}>{p.nombre}</span>
                      <span className={styles.eliminadosMeta}>{p.cliente?.razon_social}</span>
                      <span className={styles.eliminadosExpira}>Expira en {p.horasRestantes}h</span>
                    </div>
                    <V2Button variant="secondary" size="compact" onClick={() => recuperar(p.id)}>
                      Recuperar
                    </V2Button>
                  </div>
                ))}
              </div>
            )}

            {/* Active/Filtered projects section */}
            {proyectos.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                No hay proyectos{" "}
                {puedeCrearProyecto && (
                  <Link href="/proyectos/nuevo" style={{ color: "var(--v2-brand-primary)", fontWeight: "bold" }}>
                    Agrega el primero
                  </Link>
                )}
              </div>
            ) : filtrados.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                No hay proyectos que coincidan con los filtros.{" "}
                <button
                  onClick={() => {
                    setBusqueda("")
                    setFiltroCliente("")
                    setFiltroProductor("")
                    setFiltroEntidad("")
                    setFiltrosEstado([])
                    setPagina(1)
                    router.push("/proyectos")
                  }}
                  style={{
                    color: "var(--v2-brand-primary)",
                    fontWeight: "bold",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className={styles.tableContainer}>
                  <V2DataTable columns={tableColumns} rows={paginados} getRowKey={(p) => p.id} />
                </div>

                {/* Mobile Card View */}
                <div className={styles.cardsContainer}>
                  {paginados.map((p) => (
                    <div key={p.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div>
                          <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--v2-muted)", textTransform: "uppercase" }}>
                            {p.codigo}
                          </span>
                          <h4 className={styles.cardTitle}>{p.nombre}</h4>
                        </div>
                        <V2StatusBadge tone={estadoTone(p.estado)}>{ESTADO_LABEL[p.estado] || p.estado || "—"}</V2StatusBadge>
                      </div>

                      <div className={styles.cardContent}>
                        <div>
                          <span className={styles.cardLabel}>Cliente:</span>
                          {p.cliente?.razon_social || "—"}
                        </div>
                        <div>
                          <span className={styles.cardLabel}>Productor:</span>
                          {p.productor ? `${p.productor.nombre} ${p.productor.apellido}` : "—"}
                        </div>
                        <div>
                          <span className={styles.cardLabel}>Fecha:</span>
                          {p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-PE") : "—"}
                        </div>
                        <div>
                          <span className={styles.cardLabel}>Subtotal:</span>
                          {p.cotizacion_aprobada ? `${fmt(p.cotizacion_aprobada.total_cliente)} (V${p.cotizacion_aprobada.version})` : "—"}
                        </div>
                      </div>

                      <div className={styles.cardActions}>
                        {puedeEjecutarAccion(perfil, "proyectos", "duplicar", { usuarioId: perfil?.id, registro: p }) && (
                          <V2Button variant="secondary" size="compact" onClick={() => copiarProyecto(p)}>
                            Copiar
                          </V2Button>
                        )}
                        <V2Button variant="primary" size="compact" onClick={() => router.push("/proyectos/" + p.id)}>
                          Ver Detalle
                        </V2Button>
                        {puedeEjecutarAccion(perfil, "proyectos", "eliminar", { usuarioId: perfil?.id, registro: p }) && (
                          <V2Button
                            variant="destructive"
                            size="compact"
                            onClick={() => eliminar(p.id, p.nombre)}
                            disabled={eliminando === p.id}
                          >
                            {eliminando === p.id ? "..." : "Eliminar"}
                          </V2Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPaginas > 1 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                    <V2Pagination
                      page={pagina}
                      pageCount={totalPaginas}
                      onPageChange={setPagina}
                      summary={`Mostrando ${rangoInicio}-${rangoFin} de ${filtrados.length} proyectos registrados`}
                    />
                  </div>
                )}
              </>
            )}
          </>
        }
      />

      <V2FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeChips={activeChips}
        onRemoveChip={quitarFiltroAvanzado}
        onApply={aplicarFiltrosAvanzados}
        onClearAll={limpiarFiltrosAvanzados}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <V2FormField label="Código">
            <V2Input
              placeholder="Ej: IZ-26001..."
              value={tempCodigo}
              onChange={(e) => setTempCodigo(e.target.value)}
            />
          </V2FormField>

          <V2FormField label="Proyecto">
            <V2Input
              placeholder="Nombre del proyecto..."
              value={tempProyecto}
              onChange={(e) => setTempProyecto(e.target.value)}
            />
          </V2FormField>

          <V2FormField label="Cliente">
            <V2Select
              options={[
                { label: "Todos los clientes", value: "" },
                ...clientesUnicos.map((c: any) => ({
                  label: c.razon_social,
                  value: c.id || "",
                })),
              ]}
              value={tempCliente}
              onChange={(e) => setTempCliente(e.target.value)}
            />
          </V2FormField>

          <V2FormField label="Productor">
            <V2Select
              options={[
                { label: "Todos los responsables", value: "" },
                ...productoresUnicos.map((p: any) => ({
                  label: `${p.nombre} ${p.apellido}`,
                  value: p.id || "",
                })),
              ]}
              value={tempProductor}
              onChange={(e) => setTempProductor(e.target.value)}
            />
          </V2FormField>

          <V2FormField label="Entidad">
            <V2Select
              options={[
                { label: "Todas las entidades", value: "" },
                { label: "Izango Perú", value: "peru" },
                { label: "Izango Selva", value: "selva" },
              ]}
              value={tempEntidad}
              onChange={(e) => setTempEntidad(e.target.value)}
            />
          </V2FormField>

          <V2FormField label="Subtotal">
            <V2Input
              placeholder="Ej: 5000..."
              value={tempSubtotal}
              onChange={(e) => setTempSubtotal(e.target.value)}
            />
          </V2FormField>

          <V2FormField label="Fecha">
            <V2Input
              placeholder="Ej: 2026-05..."
              value={tempFecha}
              onChange={(e) => setTempFecha(e.target.value)}
            />
          </V2FormField>

          <V2FormField
            label={`Estado (${tempEstados.length > 0 ? `${tempEstados.length} seleccionados` : "Todos"})`}
            help="Selección múltiple de estados"
          >
            <div className={styles.estadoChecklist}>
              <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--v2-accent)", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0 }}
                  onClick={() => {
                    const allKeys = Object.keys(ESTADO_LABEL)
                    setTempEstados(tempEstados.length === allKeys.length ? [] : allKeys)
                  }}
                >
                  {tempEstados.length === Object.keys(ESTADO_LABEL).length ? "Desmarcar todos" : "Seleccionar todos"}
                </button>
                {tempEstados.length > 0 && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--v2-accent)", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0 }}
                    onClick={() => setTempEstados([])}
                  >
                    Limpiar ({tempEstados.length})
                  </button>
                )}
              </div>
              {Object.entries(ESTADO_LABEL).map(([value, label]) => (
                <label className={styles.estadoCheckboxRow} key={value}>
                  <input
                    checked={tempEstados.includes(value)}
                    onChange={(e) =>
                      setTempEstados((prev) => (e.target.checked ? [...prev, value] : prev.filter((v) => v !== value)))
                    }
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          </V2FormField>
        </div>
      </V2FilterDrawer>
    </>
  )
}
