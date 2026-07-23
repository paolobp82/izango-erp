"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2KpiCard,
  V2PageHeader,
  V2Pagination,
  V2StatusBadge,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"
import styles from "./Clientes.module.css"

const POR_PAGINA = 50

type Cliente = {
  id: string
  razon_social?: string
  ruc?: string
  nombre_contacto?: string
  email_contacto?: string
  telefono_contacto?: string
  activo?: boolean
  es_proveedor?: boolean
}

export default function ClientesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [eliminando, setEliminando] = useState<string | null>(null)

  // Filters state
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroProveedor, setFiltroProveedor] = useState("todos")

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    const { data } = await supabase.from("clientes").select("*").order("razon_social")
    setClientes(data || [])
    setLoading(false)
  }

  const CAMPOS = [
    { key: "razon_social", label: "Razon social", requerido: true },
    { key: "ruc", label: "RUC" },
    { key: "direccion", label: "Direccion" },
    { key: "nombre_contacto", label: "Nombre contacto" },
    { key: "email_contacto", label: "Email contacto" },
    { key: "telefono_contacto", label: "Telefono contacto" },
    { key: "nombre_contacto_admin", label: "Nombre admin" },
    { key: "email_contacto_admin", label: "Email admin" },
    { key: "telefono_contacto_admin", label: "Telefono admin" },
    { key: "banco_1", label: "Banco 1" },
    { key: "numero_cuenta_1", label: "N cuenta 1" },
    { key: "cci_1", label: "CCI 1" },
  ]

  async function importarClientes(registros: Array<Record<string, unknown>>) {
    let exitosos = 0
    const errores: string[] = []
    for (const r of registros) {
      try {
        const { error } = await supabase.from("clientes").insert({ ...r, entidad: "peru" })
        if (error) errores.push(r.razon_social + ": " + error.message)
        else exitosos++
      } catch (e: unknown) {
        errores.push(String(r.razon_social || "Cliente") + ": " + (e instanceof Error ? e.message : "Error desconocido"))
      }
    }
    load()
    return { exitosos, errores }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm("¿Eliminar cliente " + nombre + "? Esta acción no se puede deshacer.")) return
    setEliminando(id)
    const { error } = await supabase.from("clientes").delete().eq("id", id)
    if (error) {
      alert("No se puede eliminar este cliente porque tiene proyectos u otros registros asociados.")
    } else {
      load()
    }
    setEliminando(null)
  }

  // Filtered clients logic
  const filtrados = useMemo(() => {
    return clientes.filter((cliente) => {
      // 1. Search text
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchRazon = (cliente.razon_social || "").toLowerCase().includes(query)
        const matchRuc = (cliente.ruc || "").toLowerCase().includes(query)
        const matchContacto = (cliente.nombre_contacto || "").toLowerCase().includes(query)
        if (!matchRazon && !matchRuc && !matchContacto) return false
      }

      // 2. Estado filter
      if (filtroEstado === "activos") {
        if (cliente.activo === false) return false
      } else if (filtroEstado === "inactivos") {
        if (cliente.activo !== false) return false
      }

      // 3. Proveedor filter
      if (filtroProveedor === "proveedores") {
        if (!cliente.es_proveedor) return false
      } else if (filtroProveedor === "clientes") {
        if (cliente.es_proveedor) return false
      }

      return true
    })
  }, [clientes, search, filtroEstado, filtroProveedor])

  // Pagination calculations
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  // KPIs calculations
  const activos = clientes.filter((c) => c.activo !== false).length
  const inactivos = clientes.length - activos

  const columns: V2TableColumn<Cliente>[] = [
    {
      key: "razon_social",
      header: "Razón social",
      render: (cliente) => <strong style={{ color: "var(--v2-text)", fontWeight: 800 }}>{cliente.razon_social || "—"}</strong>,
    },
    { key: "ruc", header: "RUC", render: (cliente) => <span className="iz-mono" style={{ color: "var(--v2-muted)" }}>{cliente.ruc || "—"}</span> },
    { key: "nombre_contacto", header: "Contacto Comercial", render: (cliente) => cliente.nombre_contacto || "—" },
    { key: "telefono_contacto", header: "Teléfono", render: (cliente) => cliente.telefono_contacto || "—" },
    {
      key: "activo",
      header: "Estado",
      render: (cliente) => (
        <V2StatusBadge tone={cliente.activo !== false ? "success" : "neutral"}>
          {cliente.activo !== false ? "Activo" : "Inactivo"}
        </V2StatusBadge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      render: (cliente) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
          <V2Button
            type="button"
            size="compact"
            variant="secondary"
            onClick={() => router.push(`/clientes/${cliente.id}`)}
          >
            Editar
          </V2Button>
          <V2Button
            type="button"
            size="compact"
            variant="secondary"
            onClick={() => router.push(`/proyectos?cliente_id=${cliente.id}`)}
          >
            Proyectos
          </V2Button>

          {/* Más acciones select dropdown */}
          <select
            value=""
            disabled={eliminando === cliente.id}
            onChange={(e) => {
              const val = e.target.value
              if (val === "nuevo_proyecto") {
                router.push(`/proyectos/nuevo?cliente_id=${cliente.id}`)
              } else if (val === "eliminar") {
                eliminar(cliente.id, cliente.razon_social || "cliente")
              }
              e.target.value = ""
            }}
            style={{
              padding: "0 8px",
              border: "1px solid var(--v2-border)",
              borderRadius: "var(--v2-radius-sm)",
              background: "var(--v2-surface)",
              color: "var(--v2-muted)",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              height: "28px",
              boxSizing: "border-box",
              outline: "none",
            }}
          >
            <option value="" disabled>
              {eliminando === cliente.id ? "..." : "Más"}
            </option>
            <option value="nuevo_proyecto">Crear proyecto</option>
            <option value="eliminar">Eliminar</option>
          </select>
        </div>
      ),
    },
  ]

  return (
    <V2ListPageTemplate
        header={
          <V2PageHeader
            title="Clientes"
            subtitle={`${clientes.length} clientes registrados`}
            actions={
              <V2Button onClick={() => router.push("/clientes/nuevo")} size="compact">
                + Nuevo cliente
              </V2Button>
            }
          />
        }
        summary={
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            <V2KpiCard label="Total clientes" value={String(clientes.length)} density="compact" />
            <V2KpiCard label="Clientes Activos" value={String(activos)} density="compact" />
            <V2KpiCard label="Clientes Inactivos" value={String(inactivos)} density="compact" />
          </div>
        }
        toolbar={
          <V2FilterBar
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val)
              setPagina(1)
            }}
            activeFiltersCount={(filtroEstado !== "todos" ? 1 : 0) + (filtroProveedor !== "todos" ? 1 : 0)}
            onToggleDrawer={() => {}} // No drawer required in this module
            quickFilters={
              <>
                <div style={{ width: "120px", flexShrink: 0 }}>
                  <V2Select
                    options={[
                      { label: "Todos los estados", value: "todos" },
                      { label: "Activos", value: "activos" },
                      { label: "Inactivos", value: "inactivos" },
                    ]}
                    value={filtroEstado}
                    onChange={(e) => {
                      setFiltroEstado(e.target.value)
                      setPagina(1)
                    }}
                    compact
                  />
                </div>
                <div style={{ width: "150px", flexShrink: 0 }}>
                  <V2Select
                    options={[
                      { label: "Todos (tipo)", value: "todos" },
                      { label: "Solo proveedores", value: "proveedores" },
                      { label: "Solo clientes", value: "clientes" },
                    ]}
                    value={filtroProveedor}
                    onChange={(e) => {
                      setFiltroProveedor(e.target.value)
                      setPagina(1)
                    }}
                    compact
                  />
                </div>
              </>
            }
            showClearButton={filtroEstado !== "todos" || filtroProveedor !== "todos" || search !== ""}
            onClearFilters={() => {
              setSearch("")
              setFiltroEstado("todos")
              setFiltroProveedor("todos")
              setPagina(1)
            }}
          />
        }
        table={
          loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
              Cargando clientes...
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.tableContainer}>
                <V2DataTable
                  columns={columns}
                  rows={paginados}
                  getRowKey={(c) => c.id}
                  stickyHeader
                  empty={
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                      No hay clientes. <Link href="/clientes/nuevo" style={{ color: "var(--v2-brand-primary)", fontWeight: "bold" }}>Agrega el primero</Link>
                    </div>
                  }
                />
              </div>

              {/* Mobile Card View */}
              <div className={styles.cardsContainer}>
                {paginados.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)" }}>
                    No hay clientes. <Link href="/clientes/nuevo" style={{ color: "var(--v2-brand-primary)", fontWeight: "bold" }}>Agrega el primero</Link>
                  </div>
                ) : (
                  paginados.map((cliente) => (
                    <div key={cliente.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h4 className={styles.cardTitle}>{cliente.razon_social}</h4>
                        <V2StatusBadge tone={cliente.activo !== false ? "success" : "neutral"}>
                          {cliente.activo !== false ? "Activo" : "Inactivo"}
                        </V2StatusBadge>
                      </div>

                      <div className={styles.cardContent}>
                        <div>
                          <span className={styles.cardLabel}>RUC:</span>
                          {cliente.ruc || "—"}
                        </div>
                        <div>
                          <span className={styles.cardLabel}>Contacto:</span>
                          {cliente.nombre_contacto || "—"}
                        </div>
                        <div>
                          <span className={styles.cardLabel}>Teléfono:</span>
                          {cliente.telefono_contacto || "—"}
                        </div>
                      </div>

                      <div className={styles.cardActions}>
                        <V2Button
                          type="button"
                          size="compact"
                          variant="secondary"
                          onClick={() => router.push(`/clientes/${cliente.id}`)}
                        >
                          Editar
                        </V2Button>
                        <V2Button
                          type="button"
                          size="compact"
                          variant="secondary"
                          onClick={() => router.push(`/proyectos?cliente_id=${cliente.id}`)}
                        >
                          Proyectos
                        </V2Button>

                        <select
                          value=""
                          disabled={eliminando === cliente.id}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "nuevo_proyecto") {
                              router.push(`/proyectos/nuevo?cliente_id=${cliente.id}`)
                            } else if (val === "eliminar") {
                              eliminar(cliente.id, cliente.razon_social || "cliente")
                            }
                            e.target.value = ""
                          }}
                          style={{
                            padding: "0 8px",
                            border: "1px solid var(--v2-border)",
                            borderRadius: "var(--v2-radius-sm)",
                            background: "var(--v2-surface)",
                            color: "var(--v2-muted)",
                            fontSize: "11px",
                            fontWeight: 800,
                            cursor: "pointer",
                            height: "28px",
                            boxSizing: "border-box",
                            outline: "none",
                          }}
                        >
                          <option value="" disabled>
                            {eliminando === cliente.id ? "..." : "Más"}
                          </option>
                          <option value="nuevo_proyecto">Crear proyecto</option>
                          <option value="eliminar">Eliminar</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Toolbar with ImportExport */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                <ImportExport
                  modulo="clientes"
                  campos={CAMPOS}
                  datos={clientes}
                  onImportar={importarClientes}
                  variant="v2"
                />

                {totalPaginas > 1 && (
                  <V2Pagination
                    page={pagina}
                    pageCount={totalPaginas}
                    onPageChange={setPagina}
                    summary={`${filtrados.length} clientes · Pág. ${pagina}/${totalPaginas}`}
                  />
                )}
              </div>
            </>
          )
        }
      />
  )
}
