"use client"

import { rqIgvDetalle } from "@/lib/rq-igv"
import { MEDIOS_PAGO } from "../config/constants"
import type { FormRQManual } from "@/lib/services/rqp"

// Unico formulario de "Crear RQ" (manual/adicional): usado tanto por app/rq/page.tsx
// (modal propio del modulo) como por el detalle de Proyecto (dentro de un V2Drawer).
// Es puramente presentacional/controlado: toda la data (proyectos, proveedores), el
// estado (formRQ) y el guardado (crearRQManualService) viven en quien lo consume — este
// componente no hace fetch, no valida permisos y no llama a Supabase.

const inp: any = { padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, fontFamily: "inherit", width: "100%", outline: "none" }
const lbl: any = { display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4 }
const fmt = (n: number) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export type RQFormProyecto = { id: string; codigo: string; nombre: string; estado?: string }
export type RQFormProveedor = { id: string; nombre: string }

export type RQFormProps = {
  formRQ: FormRQManual
  onChange: (form: FormRQManual) => void
  proyectos: RQFormProyecto[]
  proveedoresTodos: RQFormProveedor[]
  /** Bloquea el select de proyecto (usado cuando se abre desde el propio detalle del proyecto). */
  proyectoBloqueado?: boolean
}

export function RQForm({ formRQ, onChange, proyectos, proveedoresTodos, proyectoBloqueado = false }: RQFormProps) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <label style={lbl}>PROYECTO</label>
        <select
          disabled={proyectoBloqueado}
          onChange={e => onChange({ ...formRQ, proyecto_id: e.target.value })}
          style={inp}
          value={formRQ.proyecto_id}
        >
          <option value="">Seleccionar proyecto</option>
          {proyectos.map(p => (
            <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}{p.estado && p.estado !== "en_curso" ? " (no en curso)" : ""}</option>
          ))}
        </select>
        {formRQ.proyecto_id && proyectos.find((p) => p.id === formRQ.proyecto_id)?.estado !== "en_curso" && (
          <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>Para generar RQs, el proyecto debe estar En curso.</div>
        )}
      </div>
      <div>
        <label style={lbl}>CONCEPTO</label>
        <input onChange={e => onChange({ ...formRQ, descripcion: e.target.value })} placeholder="Concepto del RQ..." style={inp} value={formRQ.descripcion} />
      </div>
      <div>
        <label style={lbl}>PROVEEDOR</label>
        <select onChange={e => onChange({ ...formRQ, proveedor_id: e.target.value })} style={inp} value={formRQ.proveedor_id}>
          <option value="">Seleccionar proveedor</option>
          {proveedoresTodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>MONTO (S/)</label>
        <input onChange={e => onChange({ ...formRQ, monto_solicitado: e.target.value })} placeholder="0.00" style={inp} type="number" value={formRQ.monto_solicitado} />
      </div>
      <div>
        <label style={lbl}>TRATAMIENTO IGV</label>
        <select onChange={e => onChange({ ...formRQ, tratamiento_igv: e.target.value })} style={inp} value={formRQ.tratamiento_igv}>
          <option value="incluye_igv">Incluye IGV</option>
          <option value="mas_igv">No incluye IGV</option>
          <option value="no_aplica">No aplica</option>
        </select>
      </div>
      {formRQ.monto_solicitado && (
        <div style={{ padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
          {(() => {
            const igv = rqIgvDetalle({ monto_solicitado: formRQ.monto_solicitado, tratamiento_igv: formRQ.tratamiento_igv })
            return <>Subtotal {fmt(igv.subtotal)} · IGV {fmt(igv.igv)} · Total {fmt(igv.total)}</>
          })()}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>CONDICIÓN COMERCIAL</label>
          <select
            onChange={e => onChange({ ...formRQ, condicion_comercial: e.target.value, tipo_pago: e.target.value, dias_credito: e.target.value === "credito" ? formRQ.dias_credito : "" })}
            style={inp}
            value={formRQ.condicion_comercial}
          >
            <option value="contado">Contado</option>
            <option value="adelanto">Adelanto</option>
            <option value="credito">Credito</option>
          </select>
        </div>
        <div>
          <label style={lbl}>MEDIO DE PAGO</label>
          <select onChange={e => onChange({ ...formRQ, medio_pago: e.target.value })} style={inp} value={formRQ.medio_pago}>
            {MEDIOS_PAGO.map((m: string) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {formRQ.condicion_comercial === "credito" && (
        <div>
          <label style={lbl}>DÍAS DE CRÉDITO</label>
          <input onChange={e => onChange({ ...formRQ, dias_credito: e.target.value })} placeholder="Ej: 30, 45, 60..." style={inp} type="number" value={formRQ.dias_credito} />
        </div>
      )}
      <div>
        <label style={lbl}>FECHA DE NECESIDAD DE PAGO</label>
        <input onChange={e => onChange({ ...formRQ, fecha_necesidad_pago: e.target.value })} style={inp} type="date" value={formRQ.fecha_necesidad_pago} />
      </div>

      <div style={{
        padding: 12,
        borderRadius: 10,
        border: formRQ.es_excepcion ? "1px solid #fecaca" : "1px solid #e5e7eb",
        background: formRQ.es_excepcion ? "#fef2f2" : "#f9fafb",
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: formRQ.es_excepcion ? "#b91c1c" : "#374151", cursor: "pointer" }}>
          <input
            checked={Boolean(formRQ.es_excepcion)}
            onChange={e => onChange({ ...formRQ, es_excepcion: e.target.checked, motivo_excepcion: e.target.checked ? formRQ.motivo_excepcion : "" })}
            type="checkbox"
          />
          🚩 Marcar como excepción de pago
        </label>

        {formRQ.es_excepcion && (
          <div style={{ marginTop: 10 }}>
            <label style={{ ...lbl, color: "#b91c1c" }}>MOTIVO DE LA EXCEPCIÓN *</label>
            <textarea
              onChange={e => onChange({ ...formRQ, motivo_excepcion: e.target.value })}
              placeholder="Explica por qué este pago requiere una excepción..."
              rows={3}
              style={{ ...inp, resize: "vertical", borderColor: "#fca5a5" }}
              value={formRQ.motivo_excepcion}
            />
          </div>
        )}
      </div>
    </div>
  )
}
