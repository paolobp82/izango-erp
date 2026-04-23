"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const MODULO_COLOR: Record<string, any> = {
  proyectos:    { bg: "#dbeafe", color: "#1e40af" },
  cotizaciones: { bg: "#f5f3ff", color: "#6d28d9" },
  rq:           { bg: "#fef9c3", color: "#92400e" },
  liquidaciones:{ bg: "#fed7aa", color: "#9a3412" },
  facturacion:  { bg: "#dcfce7", color: "#15803d" },
  clientes:     { bg: "#f0fdf4", color: "#166534" },
  proveedores:  { bg: "#fce7f3", color: "#9d174d" },
  crm:          { bg: "#e0f2fe", color: "#0369a1" },
  biblioteca:   { bg: "#fef3c7", color: "#d97706" },
  auth:         { bg: "#f3f4f6", color: "#6b7280" },
}

const ACCION_ICON: Record<string, string> = {
  crear: "✚",
  editar: "✎",
  eliminar: "✕",
  aprobar: "✓",
  rechazar: "✗",
  cambiar_estado: "⟳",
  login: "→",
  logout: "←",
  enviar: "↗",
  pagar: "💳",
}

export default function TrazabilidadPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroModulo, setFiltroModulo] = useState("")
  const [filtroUsuario, setFiltroUsuario] = useState("")
  const [filtroAccion, setFiltroAccion] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [selected, setSelected] = useState<any>(null)
  const [usuarios, setUsuarios] = useState<string[]>([])
  const [modulos, setModulos] = useState<string[]>([])
  const [pagina, setPagina] = useState(0)
  const POR_PAGINA = 50

  useEffect(() => { load() }, [pagina])

  async function load() {
    const { data } = await supabase
      .from("trazabilidad")
      .select("*")
      .order("created_at", { ascending: false })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)
    setRegistros(data || [])
    const us = [...new Set((data || []).map((r: any) => r.usuario_nombre).filter(Boolean))]
    const ms = [...new Set((data || []).map((r: any) => r.modulo).filter(Boolean))]
    setUsuarios(us as string[])
    setModulos(ms as string[])
    setLoading(false)
  }

  const filtrados = registros.filter(r => {
    if (filtroModulo && r.modulo !== filtroModulo) return false
    if (filtroUsuario && r.usuario_nombre !== filtroUsuario) return false
    if (filtroAccion && r.accion !== filtroAccion) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!r.descripcion?.toLowerCase().includes(q) && !r.usuario_nombre?.toLowerCase().includes(q) && !r.modulo?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", outline: "none" }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Trazabilidad</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Registro de acciones de usuarios en el sistema</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ borderLeft: "4px solid #0F6E56" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Total registros</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F6E56" }}>{registros.length}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Usuarios activos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#2563eb" }}>{usuarios.length}</div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #d97706" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Modulos registrados</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#d97706" }}>{modulos.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: "10px 14px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, width: 220 }} placeholder="Buscar en registros..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select style={{ ...inp, width: "auto" }} value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)}>
            <option value="">Todos los modulos</option>
            {modulos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {[...new Set(registros.map(r => r.accion))].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {(filtroModulo || filtroUsuario || filtroAccion || busqueda) && (
            <button onClick={() => { setFiltroModulo(""); setFiltroUsuario(""); setFiltroAccion(""); setBusqueda("") }}
              style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>Limpiar</button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtrados.length} registros</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtrados.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              No hay registros de trazabilidad aún. Las acciones se irán registrando automáticamente.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>FECHA / HORA</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>USUARIO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ACCION</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>MODULO</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>DESCRIPCION</th>
                  <th style={{ padding: "10px 20px", width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, idx) => {
                  const mc = MODULO_COLOR[r.modulo] || { bg: "#f3f4f6", color: "#6b7280" }
                  const icon = ACCION_ICON[r.accion] || "•"
                  const fecha = new Date(r.created_at)
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6", background: selected?.id === r.id ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                      onClick={() => setSelected(r)}>
                      <td style={{ padding: "10px 20px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{fecha.toLocaleDateString("es-PE")}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151", fontWeight: 600 }}>{r.usuario_nombre || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{icon} {r.accion}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: mc.bg, color: mc.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{r.modulo}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.descripcion || "—"}
                      </td>
                      <td style={{ padding: "10px 20px", textAlign: "right" }}>
                        <button onClick={e => { e.stopPropagation(); setSelected(r) }}
                          style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", cursor: "pointer", color: "#6b7280" }}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {registros.length >= POR_PAGINA && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
              <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)} className="btn-secondary" style={{ fontSize: 12 }}>← Anterior</button>
              <span style={{ fontSize: 12, color: "#6b7280", padding: "4px 8px" }}>Página {pagina + 1}</span>
              <button onClick={() => setPagina(p => p + 1)} className="btn-secondary" style={{ fontSize: 12 }}>Siguiente →</button>
            </div>
          )}
        </div>

        {selected && (
          <div className="card" style={{ alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#111827" }}>Detalle del registro</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Fecha y hora</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{new Date(selected.created_at).toLocaleString("es-PE")}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Usuario</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selected.usuario_nombre || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Accion</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{ACCION_ICON[selected.accion] || "•"} {selected.accion}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Modulo</div>
                <div style={{ fontSize: 13, color: "#374151", textTransform: "capitalize" }}>{selected.modulo}</div>
              </div>
              {selected.entidad_tipo && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Entidad</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{selected.entidad_tipo}</div>
                  {selected.entidad_id && <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{selected.entidad_id}</div>}
                </div>
              )}
              {selected.descripcion && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Descripcion</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{selected.descripcion}</div>
                </div>
              )}
              {selected.datos_nuevos && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Datos nuevos</div>
                  <pre style={{ fontSize: 11, color: "#374151", background: "#f9fafb", borderRadius: 6, padding: "8px 10px", overflow: "auto", maxHeight: 150, margin: 0 }}>
                    {JSON.stringify(JSON.parse(selected.datos_nuevos || "{}"), null, 2)}
                  </pre>
                </div>
              )}
              {selected.datos_anteriores && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>Datos anteriores</div>
                  <pre style={{ fontSize: 11, color: "#374151", background: "#fef9c3", borderRadius: 6, padding: "8px 10px", overflow: "auto", maxHeight: 150, margin: 0 }}>
                    {JSON.stringify(JSON.parse(selected.datos_anteriores || "{}"), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}