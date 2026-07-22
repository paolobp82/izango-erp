"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/exhaustive-deps, jsx-a11y/alt-text */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { sortRows, type SortState } from "@/lib/table-sort"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  V2Pagination,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

const BANCOS = ["BCP","BBVA","Interbank","Scotiabank","BanBif","Pichincha","Banco de la Nacion","Otro"]
const TIPOS_CUENTA = ["Ahorros","Corriente"]
const PENSIONES = ["AFP_Integra","AFP_Prima","AFP_Habitat","AFP_Profuturo","ONP"]
const TIPOS = ["planilla","honorarios","proyecto"]
const AREAS = ["Produccion","Comercial","Administracion","Finanzas","Logistica","Gerencia","Growth"]

export default function TrabajadoresPage() {
  const supabase = createClient()
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [vista, setVista] = useState<"activos" | "archivados">("activos")
  const [sort] = useState<SortState>({ key: "apellido", direction: "asc" })
  const POR_PAGINA = 50
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [userId, setUserId] = useState<string>("")
  const [tab, setTab] = useState("info")
  const [contratos, setContratos] = useState<any[]>([])
  const [showContrato, setShowContrato] = useState(false)
  const [contratoForm, setContratoForm] = useState({ tipo_contrato: "", fecha_inicio: "", fecha_fin: "", link_google_drive: "", notas: "" })
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<any>(null)
  const [historial, setHistorial] = useState<any>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "", email: "", telefono: "",
    fecha_ingreso: "", cargo: "", area: "", tipo: "planilla",
    modalidad_contrato: "", banco: "", tipo_cuenta: "", numero_cuenta: "",
    cci: "", sistema_pension: "AFP_Integra", sueldo_base: 0, foto_url: "",
    direccion: "", contacto_emergencia_nombre: "", contacto_emergencia_telefono: "",
    contacto_emergencia_relacion: "", cv_url: ""
  })

  useEffect(() => { load() }, [vista])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
    setPerfil(p)

    const esAdminTotal = ["superadmin","gerente_general","controller","administrador"].includes(p?.perfil)

    const activos = vista === "activos"
    if (esAdminTotal) {
      const { data } = await supabase.from("rrhh_trabajadores").select("*").eq("activo", activos).order("apellido")
      setTrabajadores(data || [])
    } else {
      const { data } = await supabase.from("rrhh_trabajadores").select("*").eq("activo", true).eq("user_id", user.id)
      setTrabajadores(data || [])
    }
    setLoading(false)
  }

  async function cargarContratos(trabajadorId: string) {
    const { data } = await supabase.from("rrhh_contratos").select("*").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false })
    setContratos(data || [])
  }

  async function cargarHistorial(trabajadorId: string) {
    setLoadingHistorial(true)
    const [vacaciones, horas, permisos, faltas] = await Promise.all([
      supabase.from("rrhh_vacaciones").select("*").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }),
      supabase.from("rrhh_horas_extras").select("*").eq("trabajador_id", trabajadorId).order("fecha", { ascending: false }),
      supabase.from("rrhh_permisos").select("*").eq("trabajador_id", trabajadorId).order("created_at", { ascending: false }),
      supabase.from("rrhh_faltas_medicas").select("*").eq("trabajador_id", trabajadorId).order("fecha_inicio", { ascending: false }),
    ])
    setHistorial({
      vacaciones: vacaciones.data || [],
      horas_extras: horas.data || [],
      permisos: permisos.data || [],
      faltas_medicas: faltas.data || [],
    })
    setLoadingHistorial(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setTab("info")
    setHistorial(null)
    setForm({ nombre: "", apellido: "", dni: "", email: "", telefono: "", fecha_ingreso: "", cargo: "", area: "", tipo: "planilla", modalidad_contrato: "", banco: "", tipo_cuenta: "", numero_cuenta: "", cci: "", sistema_pension: "AFP_Integra", sueldo_base: 0, foto_url: "", direccion: "", contacto_emergencia_nombre: "", contacto_emergencia_telefono: "", contacto_emergencia_relacion: "", cv_url: "" })
    setShowForm(true)
  }

  function abrirEditar(t: any) {
    setEditando(t)
    setTab("info")
    setHistorial(null)
    setForm({
      nombre: t.nombre, apellido: t.apellido, dni: t.dni || "", email: t.email || "",
      telefono: t.telefono || "", fecha_ingreso: t.fecha_ingreso || "", cargo: t.cargo || "",
      area: t.area || "", tipo: t.tipo || "planilla", modalidad_contrato: t.modalidad_contrato || "",
      banco: t.banco || "", tipo_cuenta: t.tipo_cuenta || "", numero_cuenta: t.numero_cuenta || "",
      cci: t.cci || "", sistema_pension: t.sistema_pension || "AFP_Integra",
      sueldo_base: t.sueldo_base || 0, foto_url: t.foto_url || "",
      direccion: t.direccion || "", contacto_emergencia_nombre: t.contacto_emergencia_nombre || "",
      contacto_emergencia_telefono: t.contacto_emergencia_telefono || "",
      contacto_emergencia_relacion: t.contacto_emergencia_relacion || "",
      cv_url: t.cv_url || ""
    })
    cargarContratos(t.id)
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nombre || !form.apellido) { alert("Nombre y apellido son obligatorios"); return }
    setSaving(true)
    const payload = {
      ...form,
      tipo: form.tipo || "planilla",
      sueldo_base: parseFloat(form.sueldo_base.toString()) || 0,
      updated_at: new Date().toISOString()
    }
    if (editando) {
      await supabase.from("rrhh_trabajadores").update(payload).eq("id", editando.id)
    } else {
      await supabase.from("rrhh_trabajadores").insert({
        ...payload,
        activo: true,
        ficha_aprobada: false,
        ficha_bloqueada: false,
        user_id: userId
      })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function aprobarFicha(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_trabajadores").update({ ficha_aprobada: true, ficha_bloqueada: true, aprobada_por: user?.id }).eq("id", id)
    load()
  }

  async function desbloquearFicha(id: string) {
    await supabase.from("rrhh_trabajadores").update({ ficha_bloqueada: false }).eq("id", id)
    load()
  }

  async function guardarContrato() {
    if (!trabajadorSeleccionado) return
    await supabase.from("rrhh_contratos").insert({ ...contratoForm, trabajador_id: trabajadorSeleccionado })
    setShowContrato(false)
    setContratoForm({ tipo_contrato: "", fecha_inicio: "", fecha_fin: "", link_google_drive: "", notas: "" })
    cargarContratos(trabajadorSeleccionado)
  }

  async function eliminar(id: string) {
    if (!confirm("¿Desactivar este trabajador?")) return
    const trabajador = trabajadores.find(t => t.id === id)
    const { error } = await supabase.from("rrhh_trabajadores").update({ activo: false }).eq("id", id)
    if (error) { alert(error.message); return }
    if (trabajador?.user_id) {
      const { error: perfilError } = await supabase.from("perfiles").update({ activo: false }).eq("id", trabajador.user_id)
      if (perfilError) console.error("No se pudo desactivar perfil del trabajador:", perfilError)
    }
    load()
  }

  async function restaurar(t: any) {
    if (!confirm(`¿Restaurar a ${t.nombre} ${t.apellido} como trabajador activo?`)) return
    const { error } = await supabase.from("rrhh_trabajadores").update({ activo: true }).eq("id", t.id)
    if (error) { alert(error.message); return }
    if (t.user_id) {
      const { error: perfilError } = await supabase.from("perfiles").update({ activo: true }).eq("id", t.user_id)
      if (perfilError) console.error("No se pudo reactivar perfil del trabajador:", perfilError)
    }
    load()
  }

  const esAdminTotal = ["superadmin","gerente_general","controller","administrador"].includes(perfil?.perfil)
  const esAdminRRHH = ["superadmin","gerente_general","administrador","controller"].includes(perfil?.perfil)
  const puedeVerSueldo = ["superadmin","gerente_general","administrador","controller"].includes(perfil?.perfil)

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }
  const tabStyle = (active: boolean) => ({ padding: "6px 16px", borderRadius: "var(--v2-radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: active ? "var(--v2-primary)" : "var(--v2-surface-subtle)", color: active ? "#fff" : "var(--v2-muted)" })

  const trabajadoresOrdenados = sortRows(trabajadores, sort, (t, key) => key === "trabajador" ? `${t.apellido || ""} ${t.nombre || ""}` : t[key])
  const trabajadoresPaginados = trabajadoresOrdenados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const totalPaginas = Math.max(1, Math.ceil(trabajadoresOrdenados.length / POR_PAGINA))

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando trabajadores...
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    {
      key: "trabajador",
      header: "TRABAJADOR",
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {t.foto_url ? (
            <img src={t.foto_url} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#04342C" }}>
              {t.nombre[0]}{t.apellido[0]}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>{t.nombre} {t.apellido}</div>
            <div style={{ fontSize: 11.5, color: "var(--v2-muted)" }}>{t.email || t.dni}</div>
          </div>
        </div>
      ),
    },
    {
      key: "cargo",
      header: "CARGO / ÁREA",
      render: (t) => (
        <div>
          <div style={{ fontSize: 13, color: "var(--v2-text)" }}>{t.cargo || "—"}</div>
          <div style={{ fontSize: 11.5, color: "var(--v2-muted)" }}>{t.area || ""}</div>
        </div>
      ),
    },
    {
      key: "tipo",
      header: "TIPO",
      render: (t) => (
        <span style={{
          background: t.tipo === "planilla" ? "#dbeafe" : t.tipo === "honorarios" ? "#fef3c7" : "#f0fdf4",
          color: t.tipo === "planilla" ? "#1e40af" : t.tipo === "honorarios" ? "#92400e" : "#15803d",
          padding: "2px 8px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {t.tipo || "planilla"}
        </span>
      ),
    },
    ...(puedeVerSueldo
      ? [
          {
            key: "sueldo_base",
            header: "SUELDO BASE",
            align: "right" as const,
            render: (t: any) => (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)" }}>
                S/ {Number(t.sueldo_base || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "ficha_aprobada",
      header: "FICHA",
      align: "center",
      render: (t) => (
        <span style={{
          background: t.ficha_aprobada ? "#d1fae5" : "#fef3c7",
          color: t.ficha_aprobada ? "#065f46" : "#92400e",
          padding: "2px 8px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {t.ficha_aprobada ? "Aprobada" : "Pendiente"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (t) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <V2Button variant="ghost" size="compact" onClick={() => window.location.href = "/rrhh/trabajadores/" + t.id}>
            Ver ficha
          </V2Button>
          <V2Button variant="ghost" size="compact" onClick={() => abrirEditar(t)}>
            Editar
          </V2Button>
          <V2Button variant="secondary" size="compact" onClick={() => { setTrabajadorSeleccionado(t.id); cargarHistorial(t.id); setShowContrato(true); cargarContratos(t.id) }}>
            Historial
          </V2Button>
          {esAdminRRHH && (
            <>
              {!t.ficha_aprobada && (
                <V2Button variant="ghost" size="compact" onClick={() => aprobarFicha(t.id)}>
                  Aprobar
                </V2Button>
              )}
              {t.ficha_aprobada && t.ficha_bloqueada && (
                <V2Button variant="ghost" size="compact" onClick={() => desbloquearFicha(t.id)}>
                  Desbloquear
                </V2Button>
              )}
              {vista === "activos" ? (
                <V2Button variant="destructive" size="compact" onClick={() => eliminar(t.id)}>
                  Archivar
                </V2Button>
              ) : (
                <V2Button variant="ghost" size="compact" onClick={() => restaurar(t)}>
                  Restaurar
                </V2Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Recursos Humanos"
            title="Trabajadores"
            subtitle={esAdminTotal ? `${trabajadores.length} trabajadores ${vista === "activos" ? "activos" : "archivados"}` : "Mi ficha de trabajador"}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {esAdminTotal && (
                  <ImportExport
                    modulo="rrhh_trabajadores"
                    campos={[
                      { key: "nombre", label: "Nombre", requerido: true },
                      { key: "apellido", label: "Apellido", requerido: true },
                      { key: "dni", label: "DNI" },
                      { key: "email", label: "Email" },
                      { key: "telefono", label: "Teléfono" },
                      { key: "fecha_ingreso", label: "Fecha ingreso" },
                      { key: "cargo", label: "Cargo" },
                      { key: "area", label: "Área" },
                      { key: "tipo", label: "Tipo" },
                      { key: "sueldo_base", label: "Sueldo base" },
                      { key: "banco", label: "Banco" },
                      { key: "numero_cuenta", label: "N° cuenta" },
                      { key: "cci", label: "CCI" },
                      { key: "sistema_pension", label: "Sistema pensión" },
                    ]}
                    datos={trabajadores}
                    onImportar={async (registros) => {
                      let exitosos = 0
                      const errores: string[] = []
                      for (const r of registros) {
                        const { error } = await supabase.from("rrhh_trabajadores").insert({ ...r, activo: true, tipo: r.tipo || "planilla", ficha_aprobada: false, ficha_bloqueada: false })
                        if (error) errores.push(r.nombre + ": " + error.message)
                        else exitosos++
                      }
                      load()
                      return { exitosos, errores }
                    }}
                  />
                )}
                {!esAdminTotal && trabajadores.length === 0 && (
                  <V2Button variant="primary" onClick={abrirNuevo}>
                    + Crear mi ficha
                  </V2Button>
                )}
                {esAdminTotal && (
                  <V2Button variant="primary" onClick={abrirNuevo}>
                    + Nuevo trabajador
                  </V2Button>
                )}
              </div>
            }
          />
        }
        toolbar={
          esAdminTotal ? (
            <V2FilterBar
              searchValue=""
              onSearchChange={() => {}}
              activeFiltersCount={0}
              hideDrawerButton
              onToggleDrawer={() => {}}
              quickFilters={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <V2Button
                    variant={vista === "activos" ? "primary" : "secondary"}
                    size="compact"
                    onClick={() => {
                      setVista("activos")
                      setPagina(1)
                    }}
                  >
                    Activos
                  </V2Button>
                  <V2Button
                    variant={vista === "archivados" ? "primary" : "secondary"}
                    size="compact"
                    onClick={() => {
                      setVista("archivados")
                      setPagina(1)
                    }}
                  >
                    Archivados
                  </V2Button>
                  <span style={{ fontSize: 12, color: "var(--v2-muted)", marginLeft: 8 }}>
                    Los archivados conservan historial, pero no aparecen para nuevas asignaciones.
                  </span>
                </div>
              }
            />
          ) : undefined
        }
        table={
          <>
            <V2DataTable
              columns={columns}
              rows={trabajadoresPaginados}
              getRowKey={(t) => t.id}
              empty={
                <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    {esAdminTotal ? "No hay trabajadores registrados." : "Aún no tienes una ficha de trabajador."}
                  </div>
                  {!esAdminTotal && (
                    <V2Button variant="primary" onClick={abrirNuevo}>
                      + Crear mi ficha
                    </V2Button>
                  )}
                </div>
              }
            />
            {trabajadoresOrdenados.length > 0 && (
              <V2Pagination
                page={pagina}
                pageCount={totalPaginas}
                onPageChange={(p) => setPagina(p)}
                summary={`Mostrando ${((pagina - 1) * POR_PAGINA) + 1}-${Math.min(pagina * POR_PAGINA, trabajadoresOrdenados.length)} de ${trabajadoresOrdenados.length}`}
              />
            )}
          </>
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>{editando ? "Editar ficha" : "Nueva ficha de trabajador"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["info","contacto","laboral","banco","docs"].map(t => (
                <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
                  {t === "info" ? "Información" : t === "contacto" ? "Contacto" : t === "laboral" ? "Laboral" : t === "banco" ? "Banco" : "Docs"}
                </button>
              ))}
            </div>

            {tab === "info" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Nombre *</label><input style={inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                  <div><label style={lbl}>Apellido *</label><input style={inp} value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>DNI</label><input style={inp} value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} /></div>
                  <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div><label style={lbl}>Teléfono</label><input style={inp} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                </div>
                <div><label style={lbl}>Dirección actual</label><input style={inp} value={form.direccion} placeholder="Av. / Calle, distrito, ciudad" onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
                <div><label style={lbl}>URL Foto</label><input style={inp} value={form.foto_url} placeholder="https://..." onChange={e => setForm({ ...form, foto_url: e.target.value })} /></div>
              </div>
            )}

            {tab === "contacto" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)", paddingBottom: 8, borderBottom: "1px solid var(--v2-border)" }}>Contacto de emergencia</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Nombre</label><input style={inp} value={form.contacto_emergencia_nombre} placeholder="Nombre completo" onChange={e => setForm({ ...form, contacto_emergencia_nombre: e.target.value })} /></div>
                  <div><label style={lbl}>Teléfono</label><input style={inp} value={form.contacto_emergencia_telefono} placeholder="9xxxxxxxx" onChange={e => setForm({ ...form, contacto_emergencia_telefono: e.target.value })} /></div>
                  <div><label style={lbl}>Relación</label><input style={inp} value={form.contacto_emergencia_relacion} placeholder="Padre, madre, esposo/a..." onChange={e => setForm({ ...form, contacto_emergencia_relacion: e.target.value })} /></div>
                </div>
              </div>
            )}

            {tab === "laboral" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Cargo</label><input style={inp} value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
                  <div><label style={lbl}>Área</label><select style={inp} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}><option value="">Seleccionar</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Tipo</label><select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={lbl}>Modalidad contrato</label><input style={inp} value={form.modalidad_contrato} placeholder="Plazo fijo, indefinido..." onChange={e => setForm({ ...form, modalidad_contrato: e.target.value })} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Fecha ingreso</label><input style={inp} type="date" value={form.fecha_ingreso} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} /></div>
                  <div><label style={lbl}>Sistema pensión</label><select style={inp} value={form.sistema_pension} onChange={e => setForm({ ...form, sistema_pension: e.target.value })}>{PENSIONES.map(p => <option key={p}>{p}</option>)}</select></div>
                </div>
                {puedeVerSueldo && <div><label style={lbl}>Sueldo base</label><input style={inp} type="number" value={form.sueldo_base} onChange={e => setForm({ ...form, sueldo_base: parseFloat(e.target.value) || 0 })} /></div>}
              </div>
            )}

            {tab === "banco" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Banco</label><select style={inp} value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}><option value="">Sin banco</option>{BANCOS.map(b => <option key={b}>{b}</option>)}</select></div>
                  <div><label style={lbl}>Tipo cuenta</label><select style={inp} value={form.tipo_cuenta} onChange={e => setForm({ ...form, tipo_cuenta: e.target.value })}><option value="">Seleccionar</option>{TIPOS_CUENTA.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>N° cuenta</label><input style={inp} value={form.numero_cuenta} onChange={e => setForm({ ...form, numero_cuenta: e.target.value })} /></div>
                  <div><label style={lbl}>CCI</label><input style={inp} value={form.cci} onChange={e => setForm({ ...form, cci: e.target.value })} /></div>
                </div>
              </div>
            )}

            {tab === "docs" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)", paddingBottom: 8, borderBottom: "1px solid var(--v2-border)" }}>Documentos</div>
                <div>
                  <label style={lbl}>Link CV (Google Drive)</label>
                  <input style={inp} value={form.cv_url} placeholder="https://drive.google.com/..." onChange={e => setForm({ ...form, cv_url: e.target.value })} />
                  {form.cv_url && <a href={form.cv_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1e40af", display: "inline-block", marginTop: 4 }}>Ver CV →</a>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-text)", paddingBottom: 8, borderBottom: "1px solid var(--v2-border)", marginTop: 8 }}>Contratos</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={lbl}>Tipo contrato</label><input style={inp} value={contratoForm.tipo_contrato} placeholder="Plazo fijo, indefinido..." onChange={e => setContratoForm({ ...contratoForm, tipo_contrato: e.target.value })} /></div>
                    <div><label style={lbl}>Fecha inicio</label><input style={inp} type="date" value={contratoForm.fecha_inicio} onChange={e => setContratoForm({ ...contratoForm, fecha_inicio: e.target.value })} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={lbl}>Fecha fin</label><input style={inp} type="date" value={contratoForm.fecha_fin} onChange={e => setContratoForm({ ...contratoForm, fecha_fin: e.target.value })} /></div>
                    <div><label style={lbl}>Link Google Drive</label><input style={inp} value={contratoForm.link_google_drive} placeholder="https://drive.google.com/..." onChange={e => setContratoForm({ ...contratoForm, link_google_drive: e.target.value })} /></div>
                  </div>
                  <div><label style={lbl}>Notas</label><input style={inp} value={contratoForm.notas} onChange={e => setContratoForm({ ...contratoForm, notas: e.target.value })} /></div>
                  {editando && <V2Button variant="primary" size="compact" onClick={() => { setTrabajadorSeleccionado(editando.id); guardarContrato() }}>Agregar contrato</V2Button>}
                </div>
                {contratos.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 8 }}>CONTRATOS REGISTRADOS</div>
                    {contratos.map(c => (
                      <div key={c.id} style={{ background: "var(--v2-surface-subtle)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--v2-text)" }}>{c.tipo_contrato || "Sin tipo"}</div>
                        <div style={{ fontSize: 12, color: "var(--v2-muted)" }}>{c.fecha_inicio} → {c.fecha_fin || "Indefinido"}</div>
                        {c.link_google_drive && <a href={c.link_google_drive} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1e40af" }}>Ver contrato →</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear"}</V2Button>
            </div>
          </div>
        </div>
      )}

      {showContrato && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Historial del trabajador</h2>
              <button onClick={() => setShowContrato(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            {loadingHistorial ? (
              <div style={{ color: "var(--v2-muted)", padding: 20 }}>Cargando historial...</div>
            ) : historial && (
              <div style={{ display: "grid", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Vacaciones</span>
                    <span style={{ fontSize: 12, color: "var(--v2-muted)" }}>Total días: {historial.vacaciones.reduce((s: number, v: any) => s + (v.dias || 0), 0)}</span>
                  </div>
                  {historial.vacaciones.length === 0 ? <div style={{ fontSize: 12, color: "var(--v2-subtle)" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "var(--v2-surface-subtle)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Inicio</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Fin</th>
                        <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--v2-muted)" }}>Días</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.vacaciones.map((v: any) => (
                        <tr key={v.id} style={{ borderTop: "1px solid var(--v2-border)" }}>
                          <td style={{ padding: "6px 8px" }}>{v.fecha_inicio}</td>
                          <td style={{ padding: "6px 8px" }}>{v.fecha_fin}</td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>{v.dias}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: v.estado === "aprobado" ? "#dcfce7" : "#fef9c3", color: v.estado === "aprobado" ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{v.estado}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Horas extras</span>
                    <span style={{ fontSize: 12, color: "var(--v2-muted)" }}>Total: {historial.horas_extras.reduce((s: number, h: any) => s + (h.horas || 0), 0)}h</span>
                  </div>
                  {historial.horas_extras.length === 0 ? <div style={{ fontSize: 12, color: "var(--v2-subtle)" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "var(--v2-surface-subtle)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Fecha</th>
                        <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--v2-muted)" }}>Horas</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--v2-muted)" }}>Monto</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.horas_extras.map((h: any) => (
                        <tr key={h.id} style={{ borderTop: "1px solid var(--v2-border)" }}>
                          <td style={{ padding: "6px 8px" }}>{h.fecha}</td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>{h.horas}h</td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>S/ {Number(h.monto_calculado || 0).toFixed(2)}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: h.aprobado ? "#dcfce7" : "#fef9c3", color: h.aprobado ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{h.aprobado ? "aprobado" : "pendiente"}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Permisos</span>
                    <span style={{ fontSize: 12, color: "var(--v2-muted)" }}>Total: {historial.permisos.length}</span>
                  </div>
                  {historial.permisos.length === 0 ? <div style={{ fontSize: 12, color: "var(--v2-subtle)" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "var(--v2-surface-subtle)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Fecha</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Tipo</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Motivo</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.permisos.map((p: any) => (
                        <tr key={p.id} style={{ borderTop: "1px solid var(--v2-border)" }}>
                          <td style={{ padding: "6px 8px" }}>{p.fecha_inicio || p.fecha}</td>
                          <td style={{ padding: "6px 8px" }}>{p.tipo_permiso || p.tipo || "—"}</td>
                          <td style={{ padding: "6px 8px", color: "var(--v2-muted)" }}>{p.motivo || "—"}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: p.estado === "aprobado" ? "#dcfce7" : "#fef9c3", color: p.estado === "aprobado" ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{p.estado || "pendiente"}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-text)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>Faltas médicas</span>
                    <span style={{ fontSize: 12, color: "var(--v2-muted)" }}>Total: {historial.faltas_medicas.length}</span>
                  </div>
                  {historial.faltas_medicas.length === 0 ? <div style={{ fontSize: 12, color: "var(--v2-subtle)" }}>Sin registros</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr style={{ background: "var(--v2-surface-subtle)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Inicio</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Fin</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Diagnóstico</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--v2-muted)" }}>Estado</th>
                      </tr></thead>
                      <tbody>{historial.faltas_medicas.map((f: any) => (
                        <tr key={f.id} style={{ borderTop: "1px solid var(--v2-border)" }}>
                          <td style={{ padding: "6px 8px" }}>{f.fecha_inicio}</td>
                          <td style={{ padding: "6px 8px" }}>{f.fecha_fin || "—"}</td>
                          <td style={{ padding: "6px 8px", color: "var(--v2-muted)" }}>{f.diagnostico || f.motivo || "—"}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ background: f.estado === "aprobado" ? "#dcfce7" : "#fef9c3", color: f.estado === "aprobado" ? "#15803d" : "#92400e", padding: "1px 6px", borderRadius: 99, fontSize: 11 }}>{f.estado || "pendiente"}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
