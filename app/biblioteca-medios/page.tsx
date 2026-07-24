"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import { rowBelongsToDeletedProject } from "@/lib/projects"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

const TIPOS = [
  { value: "presentacion_comercial", label: "Presentación comercial" },
  { value: "presentacion_institucional", label: "Presentación institucional" },
  { value: "video", label: "Video" },
  { value: "foto", label: "Foto" },
  { value: "diseno", label: "Diseño" },
  { value: "3d", label: "3D" },
  { value: "caso_exito", label: "Caso de éxito" },
  { value: "otro", label: "Otro" },
]

const MEDIA_BUCKET = "assets"
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
const MIME_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
])

const emptyForm = {
  titulo: "",
  tipo: "presentacion_comercial",
  categoria: "",
  cliente_id: "",
  proyecto_id: "",
  descripcion: "",
  link_url: "",
  archivo_url: "",
  fecha: new Date().toISOString().slice(0, 10),
  responsable_id: "",
  tags: "",
  estado: "activo",
}

type Cliente = { id: string; razon_social: string | null }
type Proyecto = { id: string; nombre: string | null; codigo: string | null; cliente_id?: string | null; deleted_at?: string | null }
type Responsable = { id: string; nombre: string | null; apellido: string | null; perfil?: string | null }
type RecursoMedio = {
  id: string
  titulo: string
  tipo: string
  categoria: string | null
  cliente_id: string | null
  proyecto_id: string | null
  descripcion: string | null
  link_url: string | null
  archivo_url: string | null
  fecha: string | null
  responsable_id: string | null
  tags: string[] | null
  estado: string
  created_at: string
  cliente?: Cliente | null
  proyecto?: Proyecto | null
  responsable?: Responsable | null
}

export default function BibliotecaMediosPage() {
  const supabase = createClient()
  const [recursos, setRecursos] = useState<RecursoMedio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<RecursoMedio | null>(null)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [archivo, setArchivo] = useState<File | null>(null)

  const load = useCallback(async () => {
    try {
      const [{ data: recs }, { data: cls }, { data: pros }, { data: resps }] = await Promise.all([
        supabase
          .from("biblioteca_medios")
          .select("*, cliente:clientes(id, razon_social), proyecto:proyectos(id, nombre, codigo, deleted_at), responsable:perfiles!responsable_id(id, nombre, apellido, perfil)")
          .order("created_at", { ascending: false }),
        supabase.from("clientes").select("id, razon_social").order("razon_social"),
        supabase.from("proyectos").select("id, nombre, codigo, cliente_id, deleted_at").is("deleted_at", null).order("nombre"),
        supabase.from("perfiles").select("id, nombre, apellido, perfil").eq("activo", true).order("nombre"),
      ])

      const recursosValidos = (recs || []).filter((recurso: RecursoMedio) => !rowBelongsToDeletedProject(recurso))
      setRecursos(recursosValidos)
      setClientes(cls || [])
      setProyectos(pros || [])
      setResponsables(resps || [])
    } catch (error) {
      console.error("Error cargando biblioteca de medios:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function abrirNuevo() {
    setEditando(null)
    setArchivo(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function abrirEditar(recurso: RecursoMedio) {
    setEditando(recurso)
    setArchivo(null)
    setForm({
      titulo: recurso.titulo,
      tipo: recurso.tipo || "presentacion_comercial",
      categoria: recurso.categoria || "",
      cliente_id: recurso.cliente_id || "",
      proyecto_id: recurso.proyecto_id || "",
      descripcion: recurso.descripcion || "",
      link_url: recurso.link_url || "",
      archivo_url: recurso.archivo_url || "",
      fecha: recurso.fecha || new Date().toISOString().slice(0, 10),
      responsable_id: recurso.responsable_id || "",
      tags: Array.isArray(recurso.tags) ? recurso.tags.join(", ") : "",
      estado: recurso.estado || "activo",
    })
    setShowForm(true)
  }

  async function subirArchivoAlBucket(file: File) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`)
    }
    if (file.type && !MIME_PERMITIDOS.has(file.type)) {
      throw new Error("Tipo de archivo no permitido. Tipos válidos: PDF, JPG, PNG, WEBP, MP4, MOV.")
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
    const path = `medios/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: true })
    if (uploadError) {
      throw new Error(`Error al subir el archivo: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
    return { path, publicUrl: publicUrlData.publicUrl }
  }

  async function guardar() {
    if (!form.titulo.trim()) {
      alert("El título es obligatorio.")
      return
    }

    setSaving(true)
    let archivoSubido: { path?: string; publicUrl?: string } = {}

    try {
      if (archivo) {
        archivoSubido = await subirArchivoAlBucket(archivo)
      }

      const tagsArray = form.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)

      const payload = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        categoria: form.categoria.trim() || null,
        cliente_id: form.cliente_id || null,
        proyecto_id: form.proyecto_id || null,
        descripcion: form.descripcion.trim() || null,
        link_url: form.link_url.trim() || null,
        archivo_url: archivoSubido.publicUrl || form.archivo_url || null,
        fecha: form.fecha || null,
        responsable_id: form.responsable_id || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        estado: form.estado || "activo",
        updated_at: new Date().toISOString(),
      }

      if (editando) {
        const { error } = await supabase.from("biblioteca_medios").update(payload).eq("id", editando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("biblioteca_medios").insert(payload)
        if (error) throw error
      }

      await registrarAccion({
        modulo: "biblioteca_medios",
        accion: editando ? "editar" : "crear",
        entidad_tipo: "recurso",
        descripcion: (editando ? "Recurso editado: " : "Recurso creado: ") + form.titulo,
      })
      setShowForm(false)
      await load()
    } catch (error: unknown) {
      if (archivoSubido.path) {
        const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove([archivoSubido.path])
        if (removeError) console.error("No se pudo limpiar archivo huérfano de biblioteca de medios:", removeError)
      }
      console.error("No se pudo guardar biblioteca de medios:", error)
      alert("No se pudo guardar el recurso: " + (error instanceof Error ? error.message : "Error desconocido"))
    } finally {
      setSaving(false)
    }
  }

  async function archivar(recurso: RecursoMedio) {
    const nuevoEstado = recurso.estado === "archivado" ? "activo" : "archivado"
    if (!confirm(`${nuevoEstado === "archivado" ? "Archivar" : "Reactivar"} ${recurso.titulo}?`)) return
    const { error } = await supabase.from("biblioteca_medios").update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq("id", recurso.id)
    if (error) { alert("No se pudo actualizar el recurso: " + error.message); return }
    await load()
  }

  async function eliminar(recurso: RecursoMedio) {
    if (!confirm(`¿Eliminar permanentemente ${recurso.titulo}?`)) return
    const { error } = await supabase.from("biblioteca_medios").delete().eq("id", recurso.id)
    if (error) { alert("No se pudo eliminar el recurso: " + error.message); return }
    await load()
  }

  const tipoLabel = (tipo: string) => TIPOS.find(t => t.value === tipo)?.label || tipo
  const inputStyle: CSSProperties = { padding: "8px 10px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius-sm)", fontSize: 13, fontFamily: "inherit", width: "100%", background: "var(--v2-surface)" }
  const labelStyle: CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--v2-muted)", marginBottom: 5, textTransform: "uppercase" }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return recursos.filter(recurso => {
      if (filtroEstado && recurso.estado !== filtroEstado) return false
      if (filtroTipo && recurso.tipo !== filtroTipo) return false
      if (!texto) return true
      const campos = [
        recurso.titulo,
        recurso.categoria,
        recurso.descripcion,
        recurso.cliente?.razon_social,
        recurso.proyecto?.nombre,
        recurso.proyecto?.codigo,
        ...(Array.isArray(recurso.tags) ? recurso.tags : []),
      ]
      return campos.some(campo => String(campo || "").toLowerCase().includes(texto))
    })
  }, [recursos, busqueda, filtroTipo, filtroEstado])

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando biblioteca de medios...
      </div>
    )
  }

  const columns: V2TableColumn<RecursoMedio>[] = [
    {
      key: "recurso",
      header: "Recurso",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>{r.titulo}</div>
          {r.descripcion && <div style={{ fontSize: 12, color: "var(--v2-muted)", marginTop: 3, maxWidth: 360 }}>{r.descripcion}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {r.categoria && <span style={{ background: "#eef2ff", color: "#3730a3", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>{r.categoria}</span>}
            {(r.tags || []).map((tag: string) => (
              <span key={tag} style={{ background: "var(--v2-surface-subtle)", color: "var(--v2-muted)", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>{tag}</span>
            ))}
            {r.estado === "archivado" && <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>Archivado</span>}
          </div>
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (r) => <span style={{ fontSize: 13, color: "var(--v2-text)" }}>{tipoLabel(r.tipo)}</span>,
    },
    {
      key: "relacion",
      header: "Relación",
      render: (r) => (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{r.cliente?.razon_social || "Sin cliente"}</div>
          <div style={{ fontSize: 11.5, color: "var(--v2-muted)", marginTop: 2 }}>{r.proyecto ? `${r.proyecto.codigo || ""} ${r.proyecto.nombre || ""}`.trim() : "Sin proyecto"}</div>
        </div>
      ),
    },
    {
      key: "responsable",
      header: "Responsable",
      render: (r) => (
        <span style={{ fontSize: 12.5, color: "var(--v2-text)" }}>
          {r.responsable ? `${r.responsable.nombre || ""} ${r.responsable.apellido || ""}`.trim() : "Sin responsable"}
        </span>
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (r) => <span style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{r.fecha || "-"}</span>,
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (r) => {
        const url = r.link_url || r.archivo_url
        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {url && (
              <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <V2Button variant="secondary" size="compact">Abrir</V2Button>
              </a>
            )}
            <V2Button variant="ghost" size="compact" onClick={() => abrirEditar(r)}>
              Editar
            </V2Button>
            <V2Button variant="ghost" size="compact" onClick={() => archivar(r)}>
              {r.estado === "archivado" ? "Reactivar" : "Archivar"}
            </V2Button>
            <V2Button variant="destructive" size="compact" onClick={() => eliminar(r)}>
              ×
            </V2Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Comercial"
            title="Biblioteca de Medios"
            subtitle={`${filtrados.length} de ${recursos.length} recursos disponibles`}
            actions={
              <V2Button variant="primary" onClick={abrirNuevo}>
                + Nuevo recurso
              </V2Button>
            }
          />
        }
        toolbar={
          <V2FilterBar
            searchValue={busqueda}
            onSearchChange={setBusqueda}
            activeFiltersCount={(filtroTipo ? 1 : 0) + (filtroEstado ? 1 : 0)}
            hideDrawerButton
            onToggleDrawer={() => {}}
            quickFilters={
              <>
                <div style={{ width: 200 }}>
                  <V2Select
                    compact
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    options={[
                      { label: "Todos los tipos", value: "" },
                      ...TIPOS.map((t) => ({ label: t.label, value: t.value })),
                    ]}
                  />
                </div>
                <div style={{ width: 160 }}>
                  <V2Select
                    compact
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    options={[
                      { label: "Todos los estados", value: "" },
                      { label: "Activos", value: "activo" },
                      { label: "Archivados", value: "archivado" },
                    ]}
                  />
                </div>
              </>
            }
            showClearButton={Boolean(filtroTipo || filtroEstado || busqueda)}
            onClearFilters={() => {
              setBusqueda("")
              setFiltroTipo("")
              setFiltroEstado("")
            }}
          />
        }
        table={
          <V2DataTable
            columns={columns}
            rows={filtrados}
            getRowKey={(r) => r.id}
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay recursos para los filtros actuales.
              </div>
            }
          />
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto", padding: 28, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>{editando ? "Editar recurso" : "Nuevo recurso"}</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", fontSize: 22, color: "var(--v2-subtle)", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Título *</label>
                  <input style={inputStyle} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Nombre del recurso" />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select style={inputStyle} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Categoría</label>
                  <input style={inputStyle} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="BTL, retail, institucional..." />
                </div>
                <div>
                  <label style={labelStyle}>Cliente relacionado</label>
                  <select style={inputStyle} value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                    <option value="">Sin cliente</option>
                    {clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.razon_social}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Proyecto relacionado</label>
                  <select style={inputStyle} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                    <option value="">Sin proyecto</option>
                    {proyectos.map(proyecto => <option key={proyecto.id} value={proyecto.id}>{proyecto.codigo ? `${proyecto.codigo} - ` : ""}{proyecto.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Contexto, uso sugerido, detalles del material..." />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Link o documento</label>
                  <input style={inputStyle} value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label style={labelStyle}>Adjuntar archivo</label>
                  <input type="file" style={inputStyle} onChange={e => setArchivo(e.target.files?.[0] || null)} />
                  {form.archivo_url && <a href={form.archivo_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 5, fontSize: 12, color: "var(--v2-brand)" }}>Ver archivo actual</a>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Responsable</label>
                  <select style={inputStyle} value={form.responsable_id} onChange={e => setForm({ ...form, responsable_id: e.target.value })}>
                    <option value="">Sin responsable</option>
                    {responsables.map(responsable => (
                      <option key={responsable.id} value={responsable.id}>{responsable.nombre} {responsable.apellido}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select style={inputStyle} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    <option value="activo">Activo</option>
                    <option value="archivado">Archivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tags</label>
                <input style={inputStyle} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="video, retail, demo, institucional" />
                <div style={{ fontSize: 11, color: "var(--v2-subtle)", marginTop: 4 }}>Separar tags con comas.</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Actualizar recurso" : "Crear recurso"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
