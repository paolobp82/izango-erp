"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { createClient } from "@/lib/supabase"
import { registrarAccion } from "@/lib/trazabilidad"
import { rowBelongsToDeletedProject } from "@/lib/projects"

const TIPOS = [
  { value: "presentacion_comercial", label: "Presentacion comercial" },
  { value: "presentacion_institucional", label: "Presentacion institucional" },
  { value: "video", label: "Video" },
  { value: "foto", label: "Foto" },
  { value: "diseno", label: "Diseno" },
  { value: "3d", label: "3D" },
  { value: "caso_exito", label: "Caso de exito" },
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
  tags: string[]
  estado: "activo" | "archivado"
  cliente?: { razon_social: string | null } | null
  proyecto?: { nombre: string | null; codigo: string | null; deleted_at?: string | null } | null
  responsable?: { nombre: string | null; apellido: string | null } | null
}

type FormState = typeof emptyForm
type ArchivoSubido = { url: string | null; path: string | null }

export default function BibliotecaMediosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [recursos, setRecursos] = useState<RecursoMedio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<RecursoMedio | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("activo")

  const load = useCallback(async () => {
    setLoading(true)
    const [recursosRes, clientesRes, proyectosRes, responsablesRes] = await Promise.all([
      supabase
        .from("biblioteca_medios")
        .select("*, cliente:clientes(razon_social), proyecto:proyectos(nombre,codigo,deleted_at), responsable:perfiles!responsable_id(nombre,apellido)")
        .order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, razon_social").order("razon_social"),
      supabase.from("proyectos").select("id, nombre, codigo, cliente_id").is("deleted_at", null).order("created_at", { ascending: false }).limit(300),
      supabase.from("perfiles").select("id, nombre, apellido, perfil").eq("activo", true).order("nombre"),
    ])
    setRecursos(((recursosRes.data || []) as RecursoMedio[]).filter((recurso) => !rowBelongsToDeletedProject(recurso)))
    setClientes(clientesRes.data || [])
    setProyectos(proyectosRes.data || [])
    setResponsables(responsablesRes.data || [])
    setLoading(false)
  }, [supabase])

  // El ERP carga datos cliente-side en las pantallas CRUD existentes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  function abrirNuevo() {
    setEditando(null)
    setForm(emptyForm)
    setArchivo(null)
    setShowForm(true)
  }

  function abrirEditar(recurso: RecursoMedio) {
    setEditando(recurso)
    setForm({
      titulo: recurso.titulo || "",
      tipo: recurso.tipo || "otro",
      categoria: recurso.categoria || "",
      cliente_id: recurso.cliente_id || "",
      proyecto_id: recurso.proyecto_id || "",
      descripcion: recurso.descripcion || "",
      link_url: recurso.link_url || "",
      archivo_url: recurso.archivo_url || "",
      fecha: recurso.fecha || "",
      responsable_id: recurso.responsable_id || "",
      tags: Array.isArray(recurso.tags) ? recurso.tags.join(", ") : "",
      estado: recurso.estado || "activo",
    })
    setArchivo(null)
    setShowForm(true)
  }

  async function subirArchivo(): Promise<ArchivoSubido> {
    if (!archivo) return { url: form.archivo_url || null, path: null }
    if (archivo.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("El archivo supera el limite permitido de 50 MB.")
    }
    if (archivo.type && !MIME_PERMITIDOS.has(archivo.type)) {
      throw new Error(`Formato no permitido: ${archivo.type}`)
    }
    const nombreSeguro = archivo.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-")
    const extension = nombreSeguro.includes(".") ? nombreSeguro.split(".").pop() : "bin"
    const nombreBase = nombreSeguro.replace(/\.[^.]+$/, "").slice(0, 80) || "archivo"
    const path = `biblioteca-medios/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${nombreBase}.${extension}`
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, archivo, {
      contentType: archivo.type || undefined,
      upsert: false,
    })
    if (error) {
      console.error("Error subiendo archivo de biblioteca de medios:", { bucket: MEDIA_BUCKET, path, error })
      throw error
    }
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, path }
  }

  async function guardar() {
    if (!form.titulo.trim()) { alert("El titulo es obligatorio"); return }
    if (!form.link_url.trim() && !form.archivo_url && !archivo) { alert("Agrega un link o un archivo"); return }
    setSaving(true)
    let archivoSubido: ArchivoSubido = { url: null, path: null }
    try {
      const { data: userData } = await supabase.auth.getUser()
      archivoSubido = await subirArchivo()
      const tags = form.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter(Boolean)

      const payload = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        categoria: form.categoria.trim() || null,
        cliente_id: form.cliente_id || null,
        proyecto_id: form.proyecto_id || null,
        descripcion: form.descripcion.trim() || null,
        link_url: form.link_url.trim() || null,
        archivo_url: archivoSubido.url,
        fecha: form.fecha || null,
        responsable_id: form.responsable_id || null,
        tags,
        estado: form.estado,
        updated_at: new Date().toISOString(),
      }

      if (editando) {
        const { error } = await supabase.from("biblioteca_medios").update(payload).eq("id", editando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("biblioteca_medios").insert({ ...payload, creado_por: userData.user?.id || null })
        if (error) throw error
      }

      await registrarAccion({
        accion: editando ? "editar" : "crear",
        modulo: "biblioteca_medios",
        entidad_tipo: "recurso",
        descripcion: (editando ? "Recurso editado: " : "Recurso creado: ") + form.titulo,
      })
      setShowForm(false)
      await load()
    } catch (error: unknown) {
      if (archivoSubido.path) {
        const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove([archivoSubido.path])
        if (removeError) console.error("No se pudo limpiar archivo huerfano de biblioteca de medios:", removeError)
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
    if (!confirm(`Eliminar permanentemente ${recurso.titulo}?`)) return
    const { error } = await supabase.from("biblioteca_medios").delete().eq("id", recurso.id)
    if (error) { alert("No se pudo eliminar el recurso: " + error.message); return }
    await load()
  }

  const tipoLabel = (tipo: string) => TIPOS.find(t => t.value === tipo)?.label || tipo
  const inputStyle: CSSProperties = { padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", width: "100%", background: "#fff" }
  const labelStyle: CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 5, textTransform: "uppercase" }

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

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando biblioteca de medios...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Biblioteca de Medios Izango</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{recursos.length} recursos registrados</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo recurso</button>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "center" }}>
          <input style={inputStyle} placeholder="Buscar por titulo, tags, cliente o proyecto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={inputStyle} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
          </select>
          <select style={inputStyle} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="archivado">Archivados</option>
          </select>
          <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>{filtrados.length} visibles</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay recursos para los filtros actuales.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 18px", fontSize: 11, color: "#6b7280" }}>RECURSO</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 11, color: "#6b7280" }}>TIPO</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 11, color: "#6b7280" }}>RELACION</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 11, color: "#6b7280" }}>RESPONSABLE</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 11, color: "#6b7280" }}>FECHA</th>
                <th style={{ textAlign: "right", padding: "10px 18px", fontSize: 11, color: "#6b7280" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((recurso, idx) => {
                const url = recurso.link_url || recurso.archivo_url
                return (
                  <tr key={recurso.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{recurso.titulo}</div>
                      {recurso.descripcion && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, maxWidth: 360 }}>{recurso.descripcion}</div>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {recurso.categoria && <span style={{ background: "#eef2ff", color: "#3730a3", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>{recurso.categoria}</span>}
                        {(recurso.tags || []).map((tag: string) => (
                          <span key={tag} style={{ background: "#f3f4f6", color: "#4b5563", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>{tag}</span>
                        ))}
                        {recurso.estado === "archivado" && <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>Archivado</span>}
                      </div>
                    </td>
                    <td style={{ padding: 10, fontSize: 13, color: "#374151", verticalAlign: "top" }}>{tipoLabel(recurso.tipo)}</td>
                    <td style={{ padding: 10, fontSize: 12, color: "#374151", verticalAlign: "top" }}>
                      <div>{recurso.cliente?.razon_social || "Sin cliente"}</div>
                      <div style={{ color: "#6b7280", marginTop: 2 }}>{recurso.proyecto ? `${recurso.proyecto.codigo || ""} ${recurso.proyecto.nombre || ""}`.trim() : "Sin proyecto"}</div>
                    </td>
                    <td style={{ padding: 10, fontSize: 12, color: "#374151", verticalAlign: "top" }}>
                      {recurso.responsable ? `${recurso.responsable.nombre || ""} ${recurso.responsable.apellido || ""}`.trim() : "Sin responsable"}
                    </td>
                    <td style={{ padding: 10, fontSize: 12, color: "#374151", verticalAlign: "top" }}>{recurso.fecha || "-"}</td>
                    <td style={{ padding: "12px 18px", textAlign: "right", verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {url && <a href={url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: 12, textDecoration: "none" }}>Abrir</a>}
                        <button onClick={() => abrirEditar(recurso)} className="btn-secondary" style={{ fontSize: 12 }}>Editar</button>
                        <button onClick={() => archivar(recurso)} className="btn-secondary" style={{ fontSize: 12 }}>{recurso.estado === "archivado" ? "Reactivar" : "Archivar"}</button>
                        <button onClick={() => eliminar(recurso)} style={{ fontSize: 12, padding: "5px 10px", border: "1px solid #fee2e2", borderRadius: 6, color: "#dc2626", background: "#fff", cursor: "pointer" }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 820, maxHeight: "92vh", overflowY: "auto", padding: 26 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editando ? "Editar recurso" : "Nuevo recurso"}</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", fontSize: 22, color: "#9ca3af", cursor: "pointer" }}>x</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Titulo *</label>
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
                  <label style={labelStyle}>Categoria</label>
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
                <label style={labelStyle}>Descripcion</label>
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
                  {form.archivo_url && <a href={form.archivo_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 5, fontSize: 12, color: "#0F6E56" }}>Ver archivo actual</a>}
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
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Separar tags con comas.</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: 13 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} className="btn-primary" style={{ fontSize: 13 }}>{saving ? "Guardando..." : editando ? "Actualizar recurso" : "Crear recurso"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
