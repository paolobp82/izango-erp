"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
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

const PROYECTO_OTRO = "__otro__"

export default function HorasExtrasPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [trabajadorPropio, setTrabajadorPropio] = useState<any>(null)
  const [filtroTrabajador, setFiltroTrabajador] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [batchItems, setBatchItems] = useState<any[]>([{ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "", proyecto_externo: "" }])
  const [form, setForm] = useState({ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "", proyecto_externo: "" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
      const { data: t } = await supabase.from("rrhh_trabajadores").select("*").eq("user_id", user.id).single()
      setTrabajadorPropio(t)
    }
    const [{ data: regs }, { data: trabs }, { data: pros }] = await Promise.all([
      supabase.from("rrhh_horas_extras").select("*, trabajador:rrhh_trabajadores(nombre,apellido,sueldo_base,area,cargo), aprobador:perfiles!aprobado_por(nombre,apellido), proyecto:proyectos(nombre,codigo,deleted_at)").order("fecha", { ascending: false }),
      supabase.from("rrhh_trabajadores").select("id,nombre,apellido").eq("activo", true).order("apellido"),
      supabase.from("proyectos").select("id,nombre,codigo").is("deleted_at", null).order("nombre"),
    ])
    setRegistros((regs || []).filter((registro: any) => !rowBelongsToDeletedProject(registro)))
    setTrabajadores(trabs || [])
    setProyectos(pros || [])
    setLoading(false)
  }

  const esAdmin = ["superadmin","gerente_general","administrador","controller"].includes(perfil?.perfil)
  // Gerente de Produccion: acceso limitado a revisar/aprobar/rechazar horas extras de su propio
  // equipo (area "Produccion"), sin las capacidades administrativas completas de esAdmin
  // (carga masiva, registrar en nombre de cualquier trabajador, filtros de toolbar).
  const AREA_EQUIPO_PRODUCCION = "Produccion"
  const esGerenteProduccion = perfil?.perfil === "gerente_produccion"
  const puedeRevisarEquipo = esAdmin || esGerenteProduccion

  async function guardar() {
    if (!form.fecha || !form.horas) { alert("Fecha y horas son obligatorios"); return }
    if (form.proyecto_id === PROYECTO_OTRO && !form.proyecto_externo) { alert("Ingresa el nombre del proyecto"); return }
    setSaving(true)
    const trabajadorId = esAdmin ? form.trabajador_id : trabajadorPropio?.id
    if (!trabajadorId) { alert("No se encontró el trabajador. Asegúrate de tener una ficha creada en RRHH."); setSaving(false); return }
    const { error } = await supabase.from("rrhh_horas_extras").insert({
      trabajador_id: trabajadorId,
      fecha: form.fecha,
      horas: parseFloat(form.horas.toString()),
      motivo: form.motivo || null,
      proyecto_id: form.proyecto_id && form.proyecto_id !== PROYECTO_OTRO ? form.proyecto_id : null,
      proyecto_externo: form.proyecto_id === PROYECTO_OTRO ? form.proyecto_externo : null,
    })
    if (error) { alert("Error al guardar: " + error.message); setSaving(false); return }
    setSaving(false)
    setShowForm(false)
    setForm({ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "", proyecto_externo: "" })
    load()
  }

  async function guardarBatch() {
    setSaving(true)
    const validos = batchItems.filter(b => b.trabajador_id && b.fecha && b.horas)
    for (const b of validos) {
      await supabase.from("rrhh_horas_extras").insert({
        trabajador_id: b.trabajador_id,
        fecha: b.fecha,
        horas: parseFloat(b.horas),
        motivo: b.motivo || null,
        proyecto_id: b.proyecto_id && b.proyecto_id !== PROYECTO_OTRO ? b.proyecto_id : null,
        proyecto_externo: b.proyecto_id === PROYECTO_OTRO ? b.proyecto_externo : null,
      })
    }
    setSaving(false)
    setShowBatch(false)
    setBatchItems([{ trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "", proyecto_externo: "" }])
    load()
  }

  async function aprobar(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_horas_extras").update({ aprobado: true, aprobado_por: user?.id }).eq("id", id)
    load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este registro?")) return
    await supabase.from("rrhh_horas_extras").delete().eq("id", id)
    load()
  }

  const registrosFiltrados = registros.filter(r => {
    const matchTrab = !filtroTrabajador || r.trabajador_id === filtroTrabajador
    const matchMes = !filtroMes || r.fecha?.startsWith(filtroMes)
    if (esAdmin) return matchTrab && matchMes
    if (esGerenteProduccion) return r.trabajador?.area === AREA_EQUIPO_PRODUCCION || r.trabajador_id === trabajadorPropio?.id
    return r.trabajador_id === trabajadorPropio?.id
  })

  const totalMonto = registrosFiltrados.filter(r => r.aprobado).reduce((s, r) => s + (r.monto_calculado || 0), 0)

  // Fila plana para exportacion: ImportExport lee row[c.key] sin soporte de rutas anidadas
  // (row.trabajador.nombre), asi que se aplanan aqui los datos de persona ya cargados por la
  // query (sin queries adicionales por fila).
  const registrosExport = registrosFiltrados.map(r => ({
    ...r,
    nombre_completo: [r.trabajador?.nombre, r.trabajador?.apellido].filter(Boolean).join(" ") || "—",
    cargo: r.trabajador?.cargo || "",
    area: r.trabajador?.area || "",
    estado: r.aprobado ? "Aprobado" : "Pendiente",
    aprobador_nombre: r.aprobado
      ? ([r.aprobador?.nombre, r.aprobador?.apellido].filter(Boolean).join(" ") || "—")
      : "",
  }))
  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando horas extras...
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    ...(puedeRevisarEquipo
      ? [
          {
            key: "trabajador",
            header: "Trabajador",
            render: (r: any) => (
              <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>
                {r.trabajador?.apellido}, {r.trabajador?.nombre}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "fecha",
      header: "Fecha",
      render: (r) => <span style={{ fontSize: 13, color: "var(--v2-text)" }}>{r.fecha}</span>,
    },
    {
      key: "horas",
      header: "Horas",
      align: "center",
      render: (r) => <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>{r.horas}h</span>,
    },
    {
      key: "motivo",
      header: "Motivo",
      render: (r) => <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>{r.motivo || "—"}</span>,
    },
    {
      key: "proyecto",
      header: "Proyecto",
      render: (r) =>
        r.proyecto ? (
          <span style={{ fontSize: 12.5, color: "var(--v2-text)" }}>{r.proyecto.codigo}</span>
        ) : r.proyecto_externo ? (
          <span style={{ color: "#92400e", background: "#fef3c7", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>
            Otro: {r.proyecto_externo}
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--v2-subtle)" }}>—</span>
        ),
    },
    {
      key: "monto_calculado",
      header: "Monto",
      align: "right",
      render: (r) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-success)" }}>
          S/ {Number(r.monto_calculado || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      align: "center",
      render: (r) =>
        r.aprobado ? (
          <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            Aprobado
          </span>
        ) : (
          <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            Pendiente
          </span>
        ),
    },
    ...(puedeRevisarEquipo
      ? [
          {
            key: "acciones",
            header: "",
            align: "right" as const,
            render: (r: any) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {!r.aprobado && (
                  <V2Button variant="ghost" size="compact" onClick={() => aprobar(r.id)}>
                    Aprobar
                  </V2Button>
                )}
                <V2Button variant="destructive" size="compact" onClick={() => eliminar(r.id)}>
                  ×
                </V2Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Recursos Humanos"
            title="Horas Extras"
            subtitle={`${registrosFiltrados.length} registros ${totalMonto > 0 ? `· Total aprobado: S/ ${totalMonto.toFixed(2)}` : ""}`}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ImportExport
                  modulo="rrhh_horas_extras"
                  campos={[
                    { key: "nombre_completo", label: "Nombre completo" },
                    { key: "cargo", label: "Cargo" },
                    { key: "area", label: "Área" },
                    { key: "fecha", label: "Fecha", requerido: true },
                    { key: "horas", label: "Horas", requerido: true },
                    { key: "motivo", label: "Motivo" },
                    { key: "monto_calculado", label: "Monto calculado" },
                    { key: "estado", label: "Estado" },
                    { key: "aprobador_nombre", label: "Aprobador" },
                    { key: "proyecto_externo", label: "Proyecto externo" },
                  ]}
                  datos={registrosExport}
                  onImportar={async (registros) => {
                    let exitosos = 0
                    const errores: string[] = []
                    for (const r of registros) {
                      const trabajadorId = esAdmin ? r.trabajador_id : trabajadorPropio?.id
                      // Insert explicito: "campos" ahora incluye columnas de exportacion
                      // (nombre_completo, cargo, area, estado, aprobador_nombre) que no
                      // existen en rrhh_horas_extras, por lo que ya no se puede insertar
                      // con un spread ciego de la fila importada.
                      const { error } = await supabase.from("rrhh_horas_extras").insert({
                        trabajador_id: trabajadorId,
                        fecha: r.fecha,
                        horas: r.horas,
                        motivo: r.motivo || null,
                        proyecto_externo: r.proyecto_externo || null,
                      })
                      if (error) errores.push(r.fecha + ": " + error.message)
                      else exitosos++
                    }
                    load()
                    return { exitosos, errores }
                  }}
                />
                {esAdmin && (
                  <V2Button variant="secondary" onClick={() => setShowBatch(true)}>
                    + Carga masiva
                  </V2Button>
                )}
                <V2Button variant="primary" onClick={() => setShowForm(true)}>
                  + Registrar HH.EE
                </V2Button>
              </div>
            }
          />
        }
        toolbar={
          esAdmin ? (
            <V2FilterBar
              searchValue=""
              onSearchChange={() => {}}
              activeFiltersCount={0}
              hideDrawerButton
              onToggleDrawer={() => {}}
              quickFilters={
                <>
                  <div style={{ width: 220 }}>
                    <V2Select
                      compact
                      value={filtroTrabajador}
                      onChange={(e) => setFiltroTrabajador(e.target.value)}
                      options={[
                        { label: "Todos los trabajadores", value: "" },
                        ...trabajadores.map((t) => ({ label: `${t.apellido}, ${t.nombre}`, value: t.id })),
                      ]}
                    />
                  </div>
                  <div style={{ width: 160 }}>
                    <input
                      type="month"
                      style={{
                        padding: "5px 8px",
                        border: "1px solid var(--v2-border)",
                        borderRadius: "var(--v2-radius-sm)",
                        fontSize: 12,
                        fontFamily: "inherit",
                        background: "var(--v2-surface)",
                        color: "var(--v2-text)",
                        width: "100%",
                      }}
                      value={filtroMes}
                      onChange={(e) => setFiltroMes(e.target.value)}
                    />
                  </div>
                </>
              }
              showClearButton={Boolean(filtroTrabajador || filtroMes)}
              onClearFilters={() => {
                setFiltroTrabajador("")
                setFiltroMes("")
              }}
            />
          ) : undefined
        }
        table={
          <V2DataTable
            columns={columns}
            rows={registrosFiltrados}
            getRowKey={(r) => r.id}
            stickyHeader
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay registros de horas extras.
              </div>
            }
          />
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 480, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Registrar horas extras</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {esAdmin && (
                <div>
                  <label style={lbl}>Trabajador *</label>
                  <select style={inp} value={form.trabajador_id} onChange={e => setForm({ ...form, trabajador_id: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Fecha *</label><input style={inp} type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
                <div><label style={lbl}>Horas *</label><input style={inp} type="number" min="0.5" step="0.5" value={form.horas} onChange={e => setForm({ ...form, horas: parseFloat(e.target.value) })} /></div>
              </div>
              <div><label style={lbl}>Motivo</label><input style={inp} value={form.motivo} placeholder="Descripción del trabajo" onChange={e => setForm({ ...form, motivo: e.target.value })} /></div>
              <div>
                <label style={lbl}>Proyecto</label>
                <select style={inp} value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value, proyecto_externo: "" })}>
                  <option value="">Sin proyecto</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                  <option value={PROYECTO_OTRO}>Otro (proyecto no registrado)</option>
                </select>
              </div>
              {form.proyecto_id === PROYECTO_OTRO && (
                <div>
                  <label style={lbl}>Nombre del proyecto *</label>
                  <input style={inp} value={form.proyecto_externo} placeholder="Ej: Activacion Honda 2025" onChange={e => setForm({ ...form, proyecto_externo: e.target.value })} />
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Registrar"}</V2Button>
            </div>
          </div>
        </div>
      )}

      {showBatch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 900, maxHeight: "92vh", overflowY: "auto", boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Carga masiva — Horas extras</h2>
              <button onClick={() => setShowBatch(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              {batchItems.map((b, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 2fr 2fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                  <div>
                    {i === 0 && <label style={lbl}>Trabajador</label>}
                    <select style={inp} value={b.trabajador_id} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, trabajador_id: e.target.value } : x))}>
                      <option value="">Seleccionar</option>
                      {trabajadores.map(t => <option key={t.id} value={t.id}>{t.apellido}, {t.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Fecha</label>}
                    <input style={inp} type="date" value={b.fecha} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, fecha: e.target.value } : x))} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Horas</label>}
                    <input style={inp} type="number" min="0.5" step="0.5" value={b.horas} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, horas: parseFloat(e.target.value) } : x))} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Motivo</label>}
                    <input style={inp} value={b.motivo} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, motivo: e.target.value } : x))} />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Proyecto</label>}
                    <select style={inp} value={b.proyecto_id} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, proyecto_id: e.target.value, proyecto_externo: "" } : x))}>
                      <option value="">Sin proyecto</option>
                      {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                      <option value={PROYECTO_OTRO}>Otro</option>
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Nombre proyecto otro</label>}
                    <input style={{ ...inp, background: b.proyecto_id !== PROYECTO_OTRO ? "var(--v2-border-soft)" : "var(--v2-surface)" }} value={b.proyecto_externo} placeholder="Solo si eliges Otro" disabled={b.proyecto_id !== PROYECTO_OTRO} onChange={e => setBatchItems(prev => prev.map((x, j) => j === i ? { ...x, proyecto_externo: e.target.value } : x))} />
                  </div>
                  <button onClick={() => setBatchItems(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--v2-danger)", fontSize: 18, paddingBottom: 4 }}>×</button>
                </div>
              ))}
            </div>
            <V2Button variant="ghost" size="compact" onClick={() => setBatchItems(prev => [...prev, { trabajador_id: "", fecha: "", horas: 1, motivo: "", proyecto_id: "", proyecto_externo: "" }])}>
              + Agregar fila
            </V2Button>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <V2Button variant="ghost" onClick={() => setShowBatch(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardarBatch} disabled={saving}>{saving ? "Guardando..." : "Guardar todo"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
