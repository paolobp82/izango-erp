"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

const ESTADO_COLOR: Record<string, any> = {
  aprobado:            { bg: "#dbeafe", color: "#1e40af", label: "Aprobado" },
  aprobado_produccion: { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Prod." },
  en_curso:            { bg: "#dcfce7", color: "#15803d", label: "En curso" },
  terminado:           { bg: "#f3f4f6", color: "#6b7280", label: "Terminado" },
  facturado:           { bg: "#f5f3ff", color: "#6d28d9", label: "Facturado" },
}

export default function CalendarioPage() {
  const supabase = createClient()
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)")
      .in("estado", ["aprobado", "aprobado_produccion", "en_curso", "terminado", "facturado"])
      .not("fecha_inicio", "is", null)
      .order("fecha_inicio")
    setProyectos(data || [])
    setLoading(false)
  }

  function getDiasDelMes() {
    const primero = new Date(anio, mes, 1)
    const ultimo = new Date(anio, mes + 1, 0)
    const dias: (Date | null)[] = []
    for (let i = 0; i < primero.getDay(); i++) dias.push(null)
    for (let i = 1; i <= ultimo.getDate(); i++) dias.push(new Date(anio, mes, i))
    return dias
  }

  function proyectosDelDia(dia: Date) {
    return proyectos.filter(p => {
      if (!p.fecha_inicio) return false
      const f = new Date(p.fecha_inicio + "T00:00:00")
      return f.getDate() === dia.getDate() && f.getMonth() === dia.getMonth() && f.getFullYear() === dia.getFullYear()
    })
  }

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }

  function mesSiguiente() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  const dias = getDiasDelMes()
  const hoy = new Date()
  const proyectosMes = proyectos.filter(p => {
    if (!p.fecha_inicio) return false
    const f = new Date(p.fecha_inicio + "T00:00:00")
    return f.getMonth() === mes && f.getFullYear() === anio
  })

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Calendario</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Proyectos aprobados por fecha de ejecución</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={mesAnterior} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 16 }}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827", minWidth: 160, textAlign: "center" }}>{MESES[mes]} {anio}</span>
          <button onClick={mesSiguiente} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 16 }}>›</button>
          <button onClick={() => { setMes(new Date().getMonth()); setAnio(new Date().getFullYear()) }}
            style={{ padding: "6px 14px", border: "1px solid #1D9E75", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 13, color: "#0F6E56", fontWeight: 600 }}>
            Hoy
          </button>
        </div>
      </div>

      {/* Resumen del mes */}
      {proyectosMes.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {proyectosMes.map(p => {
            const ec = ESTADO_COLOR[p.estado] || { bg: "#f3f4f6", color: "#6b7280", label: p.estado }
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{ background: ec.bg, border: "1px solid " + ec.color + "40", borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: ec.color }}>{p.codigo}</span>
                <span style={{ fontSize: 12, color: "#374151" }}>{p.nombre}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{p.fecha_inicio}</span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Header días */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#1D9E75" }}>
            {DIAS.map(d => (
              <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{d}</div>
            ))}
          </div>

          {/* Días */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
            {dias.map((dia, idx) => {
              if (!dia) return <div key={idx} style={{ minHeight: 100, background: "#fafafa", borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }} />
              const proysDia = proyectosDelDia(dia)
              const esHoy = dia.getDate() === hoy.getDate() && dia.getMonth() === hoy.getMonth() && dia.getFullYear() === hoy.getFullYear()
              return (
                <div key={idx} style={{ minHeight: 100, padding: "6px 8px", borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", background: "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: esHoy ? 800 : 400, color: esHoy ? "#fff" : "#374151",
                    background: esHoy ? "#0F6E56" : "transparent", width: 26, height: 26, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                    {dia.getDate()}
                  </div>
                  {proysDia.map(p => {
                    const ec = ESTADO_COLOR[p.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                    return (
                      <div key={p.id} onClick={() => setSelected(p)}
                        style={{ background: ec.bg, color: ec.color, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.codigo} {p.nombre}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel detalle */}
        {selected && (
          <div className="card" style={{ alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4 }}>{selected.codigo}</div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>{selected.nombre}</h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "Cliente", value: selected.cliente?.razon_social },
                { label: "Productor", value: selected.productor ? selected.productor.nombre + " " + selected.productor.apellido : "—" },
                { label: "Estado", value: ESTADO_COLOR[selected.estado]?.label || selected.estado },
                { label: "Fecha ejecución", value: selected.fecha_inicio || "—" },
                { label: "Fecha fin estimada", value: selected.fecha_fin_estimada || "—" },
                { label: "Presupuesto", value: selected.presupuesto_referencial ? "S/ " + Number(selected.presupuesto_referencial).toLocaleString("es-PE") : "—" },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{item.value || "—"}</div>
                </div>
              ))}
            </div>
            <a href={"/proyectos/" + selected.id}
              style={{ display: "block", marginTop: 16, padding: "8px 16px", background: "#0F6E56", color: "#fff", borderRadius: 8, textAlign: "center", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              Ver proyecto →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}