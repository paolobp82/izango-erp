"use client"
"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"

const CATS = [
  { key:"costo_produccion", label:"Producción" },
  { key:"costo_almacenaje", label:"Almacenaje" },
  { key:"costo_impresion", label:"Impresión" },
  { key:"costo_permisos", label:"Permisos" },
  { key:"costo_instalacion", label:"Instalación" },
  { key:"costo_performer", label:"Performer" },
  { key:"costo_alquiler", label:"Alquiler" },
  { key:"costo_supervision", label:"Supervisión" },
  { key:"costo_movilidad", label:"Movilidad" },
]

function calcItem(item: any, margenObj: number) {
  const totalBase = (item.costo_unitario||0) * (item.cantidad||1)
  const costosCats = CATS.reduce((s,c) => s + (item[c.key]||0), 0)
  const costoTotal = totalBase + costosCats
  const precioCliente = item._precioManual ? (item.precio_cliente||0) :
    (costoTotal > 0 ? costoTotal / (1 - margenObj/100) : 0)
  const margenMonto = precioCliente - costoTotal
  const margenPct = precioCliente > 0 ? (margenMonto/precioCliente)*100 : 0
  return { ...item, costo_total: costoTotal, precio_cliente: precioCliente, margen_pct: margenPct, margen_monto: margenMonto }
}

export default function CotizacionEditorPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [proyecto, setProyecto] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [margenObj, setMargenObj] = useState(40)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: cot } = await supabase
        .from("cotizaciones")
        .select("*, proyecto:proyectos(id,nombre,codigo,cliente:clientes(razon_social))")
        .eq("id", params.cotId as string)
        .single()
      setCotizacion(cot)
      setProyecto(cot?.proyecto)
      const { data: its } = await supabase
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", params.cotId as string)
        .order("orden")
      setItems((its||[]).map(i => ({...i, _precioManual: true})))
      setLoading(false)
    }
    load()
  }, [params.cotId])

  function addItem() {
    const newItem = {
      id: "new_"+Date.now(),
      cotizacion_id: params.cotId,
      orden: items.length,
      descripcion: "",
      cantidad: 1,
      fechas: 1,
      costo_unitario: 0,
      costo_produccion:0, costo_almacenaje:0, costo_impresion:0,
      costo_permisos:0, costo_instalacion:0, costo_performer:0,
      costo_alquiler:0, costo_supervision:0, costo_movilidad:0,
      costo_otros:0, _precioManual: false,
    }
    setItems(prev => [...prev, calcItem(newItem, margenObj)])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id: string, field: string, value: any) {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = {...item, [field]: value}
      if (field === "precio_cliente") updated._precioManual = true
      return calcItem(updated, margenObj)
    }))
  }

  function recalcAll(newMargen: number) {
    setMargenObj(newMargen)
    setItems(prev => prev.map(i => i._precioManual ? i : calcItem({...i}, newMargen)))
  }

  const totales = items.reduce((acc, item) => ({
    costo: acc.costo + (item.costo_total||0),
    precio: acc.precio + (item.precio_cliente||0),
  }), { costo: 0, precio: 0 })

  const feePct = cotizacion?.fee_agencia_pct || 10
  const igvPct = cotizacion?.igv_pct || 18
  const feeMonto = totales.costo * (feePct/100)
  const subtotalConFee = totales.precio + feeMonto
  const igvMonto = subtotalConFee * (igvPct/100)
  const totalFinal = subtotalConFee + igvMonto
  const margenReal = totalFinal > 0 ? ((totalFinal - totales.costo)/totalFinal)*100 : 0

  async function guardar(nuevoEstado?: string) {
    setSaving(true)
    for (const item of items) {
      const payload = {
        cotizacion_id: params.cotId as string,
        orden: item.orden,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        fechas: item.fechas,
        costo_unitario: item.costo_unitario||0,
        costo_produccion: item.costo_produccion||0,
        costo_almacenaje: item.costo_almacenaje||0,
        costo_impresion: item.costo_impresion||0,
        costo_permisos: item.costo_permisos||0,
        costo_instalacion: item.costo_instalacion||0,
        costo_performer: item.costo_performer||0,
        costo_alquiler: item.costo_alquiler||0,
        costo_supervision: item.costo_supervision||0,
        costo_movilidad: item.costo_movilidad||0,
        costo_otros: item.costo_otros||0,
        costo_total: item.costo_total||0,
        precio_cliente: item.precio_cliente||0,
        margen_pct: item.margen_pct||0,
        margen_monto: item.margen_monto||0,
      }
      if (String(item.id).startsWith("new_")) {
        await supabase.from("cotizacion_items").insert(payload)
      } else {
        await supabase.from("cotizacion_items").update(payload).eq("id", item.id)
      }
    }
    const updates: any = {
      subtotal_costo: totales.costo,
      subtotal_precio_cliente: totales.precio,
      fee_agencia_monto: feeMonto,
      subtotal_con_fee: subtotalConFee,
      igv_monto: igvMonto,
      total_cliente: totalFinal,
      margen_pct: margenReal,
      condicion_pago: cotizacion?.condicion_pago,
      validez_dias: cotizacion?.validez_dias,
      fee_agencia_pct: cotizacion?.fee_agencia_pct,
      igv_pct: cotizacion?.igv_pct,
    }
    if (nuevoEstado) updates.estado = nuevoEstado
    await supabase.from("cotizaciones").update(updates).eq("id", params.cotId as string)
    setSaving(false)
    if (nuevoEstado) router.push("/proyectos/"+params.id)
    else alert("Guardado correctamente")
  }

  const fmt = (n: number) => "S/ "+n.toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2})
  const inp: any = {padding:"3px 6px",border:"1px solid #e5e7eb",borderRadius:6,fontSize:12,fontFamily:"inherit",background:"#fff",width:"100%"}

  if (loading) return <div style={{color:"#6b7280",fontSize:13,padding:24}}>Cargando...</div>

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <a href="/proyectos" style={{color:"#9ca3af",fontSize:12}}>Proyectos</a>
            <span style={{color:"#d1d5db"}}>/</span>
            <a href={"/proyectos/"+params.id} style={{color:"#9ca3af",fontSize:12}}>{proyecto?.codigo}</a>
            <span style={{color:"#d1d5db"}}>/</span>
            <span style={{fontSize:12,color:"#4b5563"}}>Proforma V{cotizacion?.version}</span>
          </div>
          <h1 style={{fontSize:18,fontWeight:600,margin:0}}>{proyecto?.nombre}</h1>
          <p style={{fontSize:12,color:"#6b7280",marginTop:4}}>
            {proyecto?.cliente?.razon_social} · V{cotizacion?.version} · {cotizacion?.estado}
          </p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#6b7280"}}>
            <span>Margen obj:</span>
            <input type="number" value={margenObj}
              onChange={e=>recalcAll(Number(e.target.value))}
              style={{width:50,padding:"4px 6px",border:"1px solid #e5e7eb",borderRadius:6,fontSize:12}} />
            <span>%</span>
          </div>
          <button onClick={()=>guardar()} disabled={saving} className="btn-secondary" style={{fontSize:12}}>
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button onClick={()=>guardar("enviada_cliente")} disabled={saving} className="btn-primary" style={{fontSize:12}}>
            Enviar al cliente
          </button>
        </div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          <div>
            <label style={{display:"block",fontSize:11,color:"#6b7280",marginBottom:4}}>Condición de pago</label>
            <select style={{...inp}} value={cotizacion?.condicion_pago||""}
              onChange={e=>setCotizacion({...cotizacion,condicion_pago:e.target.value})}>
              <option>50% adelanto / 50% contra entrega</option>
              <option>30% adelanto / 70% contra entrega</option>
              <option>100% adelanto</option>
              <option>Crédito 30 días</option>
              <option>Crédito 60 días</option>
              <option>Crédito 90 días</option>
              <option>A tratar</option>
            </select>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,color:"#6b7280",marginBottom:4}}>Validez (días)</label>
            <input type="number" style={inp} value={cotizacion?.validez_dias||10}
              onChange={e=>setCotizacion({...cotizacion,validez_dias:Number(e.target.value)})} />
          </div>
          <div>
            <label style={{display:"block",fontSize:11,color:"#6b7280",marginBottom:4}}>Fee agencia (%)</label>
            <input type="number" style={inp} value={cotizacion?.fee_agencia_pct||10}
              onChange={e=>setCotizacion({...cotizacion,fee_agencia_pct:Number(e.target.value)})} />
          </div>
          <div>
            <label style={{display:"block",fontSize:11,color:"#6b7280",marginBottom:4}}>IGV (%)</label>
            <input type="number" style={inp} value={cotizacion?.igv_pct||18}
              onChange={e=>setCotizacion({...cotizacion,igv_pct:Number(e.target.value)})} />
          </div>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:16}}>
        <div style={{overflowX:"auto"}}>
          <table style={{minWidth:1400}}>
            <thead>
              <tr style={{background:"#1D9E75"}}>
                <th style={{color:"#fff",textAlign:"left",padding:"8px 10px",fontSize:11,width:200}}>Elemento</th>
                <th style={{color:"#fff",textAlign:"center",padding:"8px 6px",fontSize:11,width:55}}>Cant.</th>
                <th style={{color:"#fff",textAlign:"center",padding:"8px 6px",fontSize:11,width:55}}>Días</th>
                <th style={{color:"#fff",textAlign:"right",padding:"8px 6px",fontSize:11,width:85}}>C.Unit.</th>
                <th style={{color:"#fff",textAlign:"right",padding:"8px 6px",fontSize:11,width:85}}>Total S/</th>
                {CATS.map(c => (
                  <th key={c.key} style={{color:"#fff",textAlign:"right",padding:"8px 6px",fontSize:10,width:80}}>{c.label}</th>
                ))}
                <th style={{color:"#fff",textAlign:"right",padding:"8px 8px",fontSize:11,width:90,background:"#085041"}}>Costo total</th>
                <th style={{color:"#fff",textAlign:"right",padding:"8px 8px",fontSize:11,width:90,background:"#085041"}}>Precio cli.</th>
                <th style={{color:"#fff",textAlign:"right",padding:"8px 6px",fontSize:11,width:65,background:"#085041"}}>Margen%</th>
                <th style={{color:"#fff",padding:"8px 6px",fontSize:11,width:30,background:"#085041"}}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item,idx) => {
                const totalBase = (item.costo_unitario||0)*(item.cantidad||1)
                const mp = item.margen_pct||0
                const mcolor = mp>=35?"#16a34a":mp>=20?"#ca8a04":"#dc2626"
                return (
                  <tr key={item.id} style={{background:idx%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"4px 6px"}}>
                      <input style={inp} value={item.descripcion} placeholder="Descripción"
                        onChange={e=>updateItem(item.id,"descripcion",e.target.value)} />
                    </td>
                    <td style={{padding:"4px 4px"}}>
                      <input type="number" style={{...inp,textAlign:"center"}} value={item.cantidad}
                        onChange={e=>updateItem(item.id,"cantidad",Number(e.target.value))} />
                    </td>
                    <td style={{padding:"4px 4px"}}>
                      <input type="number" style={{...inp,textAlign:"center"}} value={item.fechas}
                        onChange={e=>updateItem(item.id,"fechas",Number(e.target.value))} />
                    </td>
                    <td style={{padding:"4px 4px"}}>
                      <input type="number" style={{...inp,textAlign:"right"}} value={item.costo_unitario||""}
                        placeholder="0" onChange={e=>updateItem(item.id,"costo_unitario",Number(e.target.value))} />
                    </td>
                    <td style={{padding:"4px 6px",textAlign:"right",fontSize:12,color:"#6b7280"}}>
                      {totalBase > 0 ? fmt(totalBase) : "—"}
                    </td>
                    {CATS.map(c => (
                      <td key={c.key} style={{padding:"4px 3px"}}>
                        <input type="number" style={{...inp,textAlign:"right"}} value={item[c.key]||""}
                          placeholder="0" onChange={e=>updateItem(item.id,c.key,Number(e.target.value))} />
                      </td>
                    ))}
                    <td style={{padding:"4px 8px",textAlign:"right",fontWeight:500,fontSize:12,background:"#fef2f2",color:"#dc2626"}}>
                      {item.costo_total > 0 ? fmt(item.costo_total) : "—"}
                    </td>
                    <td style={{padding:"4px 4px",background:"#f0fdf4"}}>
                      <input type="number" style={{...inp,textAlign:"right",fontWeight:500}}
                        value={item.precio_cliente > 0 ? Math.round(item.precio_cliente) : ""}
                        placeholder="auto" onChange={e=>updateItem(item.id,"precio_cliente",Number(e.target.value))} />
                    </td>
                    <td style={{padding:"4px 6px",textAlign:"right",fontWeight:600,fontSize:12,color:mcolor,background:"#f0fdf4"}}>
                      {mp > 0 ? mp.toFixed(0)+"%" : "—"}
                    </td>
                    <td style={{padding:"4px 4px",textAlign:"center",background:"#f0fdf4"}}>
                      <button onClick={()=>removeItem(item.id)}
                        style={{width:20,height:20,borderRadius:"50%",border:"1px solid #e5e7eb",background:"none",cursor:"pointer",fontSize:14,color:"#9ca3af"}}>
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"12px 16px"}}>
          <button onClick={addItem}
            style={{border:"1px dashed #d1d5db",borderRadius:8,background:"none",padding:"6px 16px",fontSize:12,color:"#6b7280",cursor:"pointer"}}>
            + Agregar ítem
          </button>
        </div>
      </div>

      <div style={{background:"#E1F5EE",border:"1px solid #1D9E75",borderRadius:12,padding:"16px 20px",display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
        {[
          { label:"Subtotal costo", value:fmt(totales.costo), color:"#dc2626" },
          { label:"Fee agencia ("+feePct+"%)", value:fmt(feeMonto), color:"#374151" },
          { label:"Subtotal cliente", value:fmt(subtotalConFee), color:"#374151" },
          { label:"IGV ("+igvPct+"%)", value:fmt(igvMonto), color:"#374151" },
          { label:"TOTAL CLIENTE", value:fmt(totalFinal), color:"#04342C" },
          { label:"Margen neto", value:margenReal.toFixed(1)+"%", color:margenReal>=margenObj?"#0F6E56":margenReal>=margenObj*0.75?"#ca8a04":"#dc2626" },
        ].map((t,i) => (
          <div key={t.label} style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:10,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.06em",color:"#085041"}}>{t.label}</div>
            <div style={{fontSize:i===4?22:18,fontWeight:600,color:t.color}}>{t.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}