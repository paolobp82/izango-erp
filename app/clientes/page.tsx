"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import {
  Badge,
  Button,
  DataTable,
  ListPageTemplate,
  ModuleLoadingState,
  ModuleToolbar,
  PageHeader,
  SummaryStrip,
  type DataTableColumn,
} from "@/components/design-system"

const POR_PAGINA = 50

type Cliente = {
  id: string
  razon_social?: string
  ruc?: string
  nombre_contacto?: string
  email_contacto?: string
  activo?: boolean
}

export default function ClientesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [eliminando, setEliminando] = useState<string | null>(null)

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

  const totalPaginas = Math.ceil(clientes.length / POR_PAGINA)
  const paginados = clientes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const activos = clientes.filter((cliente) => cliente.activo !== false).length
  const inactivos = clientes.length - activos

  const columns: DataTableColumn<Cliente>[] = [
    {
      key: "razon_social",
      header: "Razón social",
      render: (cliente) => <strong>{cliente.razon_social || "—"}</strong>,
    },
    { key: "ruc", header: "RUC", render: (cliente) => <span className="iz-mono">{cliente.ruc || "—"}</span> },
    { key: "nombre_contacto", header: "Contacto", render: (cliente) => cliente.nombre_contacto || "—" },
    { key: "email_contacto", header: "Email", render: (cliente) => cliente.email_contacto || "—" },
    {
      key: "activo",
      header: "Estado",
      render: (cliente) => <Badge tone={cliente.activo !== false ? "success" : "neutral"}>{cliente.activo !== false ? "Activo" : "Inactivo"}</Badge>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      width: 360,
      render: (cliente) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button type="button" size="sm" variant="secondary" onClick={() => router.push(`/clientes/${cliente.id}`)}>Ver / Editar</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => router.push(`/proyectos?cliente_id=${cliente.id}`)}>Proyectos</Button>
          <Button type="button" size="sm" onClick={() => router.push(`/proyectos/nuevo?cliente_id=${cliente.id}`)}>+ Proyecto</Button>
          <Button type="button" size="sm" variant="danger" onClick={() => eliminar(cliente.id, cliente.razon_social || "cliente")} disabled={eliminando === cliente.id}>
            {eliminando === cliente.id ? "..." : "Eliminar"}
          </Button>
        </div>
      ),
    },
  ]

  if (loading) return <ModuleLoadingState label="Cargando clientes..." />

  return (
    <ListPageTemplate
      header={
        <PageHeader title="Clientes" description={`${clientes.length} clientes registrados`} actions={[{ label: "+ Nuevo cliente", href: "/clientes/nuevo" }]} />
      }
      summary={<SummaryStrip metrics={[{ label: "Total clientes", value: clientes.length }, { label: "Activos", value: activos }, { label: "Inactivos", value: inactivos }]} />}
      toolbar={<ModuleToolbar actions={<ImportExport modulo="clientes" campos={CAMPOS} datos={clientes} onImportar={importarClientes} />} />}
      table={
        <>
          <DataTable columns={columns} rows={paginados} rowKey="id" empty={<span>No hay clientes. <Link href="/clientes/nuevo" style={{ color: "var(--iz-color-brand-700)" }}>Agrega el primero</Link></span>} />
          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "16px 20px", color: "var(--iz-color-text-muted)" }}>
              <Button type="button" size="sm" variant="secondary" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>Anterior</Button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <Button key={n} type="button" size="sm" variant={n === pagina ? "primary" : "secondary"} onClick={() => setPagina(n)}>{n}</Button>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>Siguiente</Button>
              <span className="iz-caption">{clientes.length} clientes · Pág. {pagina}/{totalPaginas}</span>
            </div>
          )}
        </>
      }
    />
  )
}
