"use client"

import type { FormAudiovisual } from "@/lib/services/audiovisual"

// Unico formulario de "Crear/editar requerimiento audiovisual": usado tanto por
// app/audiovisual/requerimientos/page.tsx (modal propio del modulo) como por el detalle
// de Proyecto (dentro de un V2Drawer). Es puramente presentacional/controlado — toda la
// data (proyectos, cotizaciones, productores), el estado (form) y el guardado
// (guardarRequerimientoAudiovisualService) viven en quien lo consume; este componente no
// hace fetch, no valida permisos, no llama a Supabase y no sincroniza tareas ni envia correos.

const PIEZAS = ["Video", "3D", "Imagenes IA", "Dinamica", "Graficas", "Adaptacion", "Otros"]
const ESTADOS: Record<string, any> = {
  pendiente: { label: "Pendiente" },
  en_progreso: { label: "En progreso" },
  en_revision: { label: "En revision" },
  completado: { label: "Completado" },
  cancelado: { label: "Cancelado" },
}

const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

export type AudiovisualFormProyecto = { id: string; codigo: string; nombre: string }
export type AudiovisualFormCotizacion = { id: string; version: number; estado: string }
export type AudiovisualFormProductor = { id: string; nombre?: string; apellido?: string }

export type AudiovisualRequestFormProps = {
  form: FormAudiovisual
  onChange: (form: FormAudiovisual) => void
  /** true = editando un requerimiento existente. */
  editando: boolean
  proyectos: AudiovisualFormProyecto[]
  cotizaciones: AudiovisualFormCotizacion[]
  productores: AudiovisualFormProductor[]
  onProyectoChange: (proyectoId: string) => void
  onUploadDocumento: (file: File) => void
  uploading: boolean
  camposPedidoDeshabilitados: boolean
  camposAvanceDeshabilitados: boolean
  puedeEditarAvanceFormulario: boolean
  /** Bloquea el select de proyecto y oculta "OTRO / SIN PROYECTO" (usado desde Proyecto). */
  proyectoBloqueado?: boolean
}

export function AudiovisualRequestForm({
  camposAvanceDeshabilitados,
  camposPedidoDeshabilitados,
  cotizaciones,
  editando,
  form,
  onChange,
  onProyectoChange,
  onUploadDocumento,
  productores,
  proyectoBloqueado = false,
  proyectos,
  puedeEditarAvanceFormulario,
  uploading,
}: AudiovisualRequestFormProps) {
  function togglePieza(pieza: string) {
    onChange({
      ...form,
      piezas: form.piezas.includes(pieza) ? form.piezas.filter((p) => p !== pieza) : [...form.piezas, pieza],
      pieza_otros_descripcion: pieza === "Otros" && form.piezas.includes(pieza) ? "" : form.pieza_otros_descripcion,
    })
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>PROYECTO *</label>
          <select disabled={camposPedidoDeshabilitados || proyectoBloqueado} onChange={(e) => onProyectoChange(e.target.value)} style={inp} value={form.proyecto_id}>
            <option value="">Seleccionar proyecto</option>
            {!proyectoBloqueado && <option value="__OTRO__">OTRO / SIN PROYECTO</option>}
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>COTIZACIÓN</label>
          <select disabled={camposPedidoDeshabilitados || form.proyecto_id === "__OTRO__"} onChange={(e) => onChange({ ...form, cotizacion_id: e.target.value })} style={inp} value={form.cotizacion_id}>
            <option value="">Sin cotización específica</option>
            {cotizaciones.map((c) => <option key={c.id} value={c.id}>V{c.version} - {c.estado}</option>)}
          </select>
        </div>
      </div>

      {form.proyecto_id === "__OTRO__" && (
        <div>
          <label style={lbl}>DETALLE DEL PROYECTO O SOLICITUD *</label>
          <input
            onChange={(e) => onChange({ ...form, detalle_otro_proyecto: e.target.value })}
            placeholder="Ej: Video institucional, RRHH, redes sociales, propuesta comercial..."
            style={inp}
            value={form.detalle_otro_proyecto}
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>UBICACION DEL PROYECTO</label>
          <input disabled={camposPedidoDeshabilitados} onChange={(e) => onChange({ ...form, ubicacion: e.target.value })} placeholder="Sede, ciudad, venue o referencia" style={inp} value={form.ubicacion} />
        </div>
        <div>
          <label style={lbl}>PRODUCTOR A CARGO</label>
          <select disabled={camposPedidoDeshabilitados} onChange={(e) => onChange({ ...form, productor_id: e.target.value })} style={inp} value={form.productor_id}>
            <option value="">Sin productor</option>
            {productores.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={lbl}>RESPONSABLE AUDIOVISUAL</label>
        <select
          disabled={editando ? camposAvanceDeshabilitados : camposPedidoDeshabilitados}
          onChange={(e) => onChange({ ...form, responsable_audiovisual_id: e.target.value })}
          style={inp}
          value={form.responsable_audiovisual_id}
        >
          <option value="">Sin responsable asignado</option>
          {productores.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
        </select>
      </div>

      <div>
        <label style={lbl}>FECHA DE ENTREGA SOLICITADA *</label>
        <input disabled={camposPedidoDeshabilitados} onChange={(e) => onChange({ ...form, fecha_entrega_solicitada: e.target.value })} style={inp} type="date" value={form.fecha_entrega_solicitada} />
      </div>

      <div>
        <label style={lbl}>PIEZAS NECESARIAS *</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PIEZAS.map((pieza) => (
            <button
              disabled={camposPedidoDeshabilitados}
              key={pieza}
              onClick={() => togglePieza(pieza)}
              style={{
                padding: "6px 10px",
                borderRadius: 99,
                border: form.piezas.includes(pieza) ? "2px solid #0F6E56" : "1px solid #e5e7eb",
                background: form.piezas.includes(pieza) ? "#dcfce7" : "#fff",
                color: form.piezas.includes(pieza) ? "#15803d" : "#374151",
                fontSize: 12,
                fontWeight: form.piezas.includes(pieza) ? 700 : 500,
                cursor: camposPedidoDeshabilitados ? "not-allowed" : "pointer",
                opacity: camposPedidoDeshabilitados ? 0.7 : 1,
              }}
              type="button"
            >
              {pieza}
            </button>
          ))}
        </div>
      </div>

      {form.piezas.includes("Otros") && (
        <div>
          <label style={lbl}>DESCRIBE LA PIEZA REQUERIDA *</label>
          <input
            disabled={camposPedidoDeshabilitados}
            onChange={(e) => onChange({ ...form, pieza_otros_descripcion: e.target.value })}
            placeholder="Ej. animacion especial, formato no estandar, pieza experimental..."
            style={inp}
            value={form.pieza_otros_descripcion}
          />
        </div>
      )}

      <div>
        <label style={lbl}>INDICACIONES / BRIEF DEL REQUERIMIENTO</label>
        <textarea
          disabled={camposPedidoDeshabilitados}
          onChange={(e) => onChange({ ...form, brief: e.target.value })}
          placeholder="Detalle dinamica, estilo, referencias, formatos, restricciones, duracion, entregables o cualquier indicacion relevante."
          style={{ ...inp, minHeight: 110, resize: "vertical" }}
          value={form.brief}
        />
      </div>

      {puedeEditarAvanceFormulario && (
        <div style={{ padding: 12, border: "1px solid #bfdbfe", borderRadius: 8, background: "#eff6ff" }}>
          <label style={{ ...lbl, color: "#1e40af" }}>FECHA DE DEVOLUCION AUDIOVISUAL</label>
          <input onChange={(e) => onChange({ ...form, fecha_devolucion_audiovisual: e.target.value })} style={inp} type="date" value={form.fecha_devolucion_audiovisual} />
          <div style={{ fontSize: 11, color: "#1e40af", marginTop: 6 }}>
            Este campo solo aparece al editar un requerimiento asumido por audiovisual o roles autorizados.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: puedeEditarAvanceFormulario ? "1fr 1fr 1fr" : "1fr", gap: 12 }}>
        <div>
          <label style={lbl}>PRIORIDAD</label>
          <select disabled={camposPedidoDeshabilitados} onChange={(e) => onChange({ ...form, prioridad: e.target.value })} style={inp} value={form.prioridad}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        {puedeEditarAvanceFormulario && (
          <>
            <div>
              <label style={lbl}>AVANCE AUDIOVISUAL</label>
              <select onChange={(e) => onChange({ ...form, avance: e.target.value })} style={inp} value={form.avance}>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => <option key={n} value={n}>{n}%</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>ESTADO</label>
              <select onChange={(e) => onChange({ ...form, estado: e.target.value })} style={inp} value={form.estado}>
                {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {form.proyecto_id === "__OTRO__" && (
        <div>
          <label style={lbl}>DETALLE DEL PROYECTO O SOLICITUD *</label>
          <input
            onChange={(e) => onChange({ ...form, detalle_otro_proyecto: e.target.value })}
            placeholder="Ej: Video institucional, RRHH, redes sociales, propuesta comercial..."
            style={inp}
            value={form.detalle_otro_proyecto}
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>REFERENCIAS / DOCUMENTOS (LINK)</label>
          <input disabled={camposPedidoDeshabilitados} onChange={(e) => onChange({ ...form, referencia_url: e.target.value })} placeholder="https://..." style={inp} value={form.referencia_url} />
        </div>
        <div>
          <label style={lbl}>ARTES RELACIONADOS</label>
          <input
            disabled={editando ? camposAvanceDeshabilitados : camposPedidoDeshabilitados}
            onChange={(e) => onChange({ ...form, artes_url: e.target.value })}
            placeholder="https://..."
            style={inp}
            value={form.artes_url}
          />
        </div>
      </div>

      <div>
        <label style={lbl}>ADJUNTAR ARCHIVO</label>
        <input disabled={camposPedidoDeshabilitados} onChange={(e) => e.target.files?.[0] && onUploadDocumento(e.target.files[0])} style={inp} type="file" />
        {uploading && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Subiendo archivo...</div>}
        {form.documento_url && <a href={form.documento_url} style={{ display: "inline-block", marginTop: 6, fontSize: 12, color: "#0F6E56" }} target="_blank">Archivo adjunto cargado</a>}
      </div>
    </div>
  )
}
