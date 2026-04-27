const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Fix 1: Multiplicacion cantidad x dias en calcItem
c = c.replace(
  `  const costoBase = COSTOS_INTERNOS.reduce((s, c) => s + (Number(item[c.key]) || 0), 0)
    + (item.extras_produccion || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
    + (item.extras_alquiler || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
  const costoTotal = item.costo_manual !== null && item.costo_manual !== undefined && item.costo_manual !== ""
    ? Number(item.costo_manual) : costoBase
  const cantidad = Number(item.cantidad) || 1
  const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0`,
  `  const costoBase = COSTOS_INTERNOS.reduce((s, c) => s + (Number(item[c.key]) || 0), 0)
    + (item.extras_produccion || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
    + (item.extras_alquiler || []).reduce((s: number, e: any) => s + (Number(e.monto) || 0), 0)
  const cantidad = Number(item.cantidad) || 1
  const fechas = Number(item.fechas) || 1
  const costoUnitario = item.costo_manual !== null && item.costo_manual !== undefined && item.costo_manual !== ""
    ? Number(item.costo_manual) : costoBase
  const costoTotal = costoUnitario * cantidad * fechas`
);

// Fix 2: Agregar estado bloqueada al cargar cotizacion
c = c.replace(
  `  const [showBiblioteca, setShowBiblioteca] = useState(false)`,
  `  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [bloqueada, setBloqueada] = useState(false)
  const [perfilActual, setPerfilActual] = useState<any>(null)`
);

// Fix 3: Cargar estado bloqueada y perfil en el useEffect
c = c.replace(
  `      setCotizacion(cot)
      setProyecto(cot?.proyecto)
      if (cot?.fee_activo === false) setFeeActivo(false)`,
  `      setCotizacion(cot)
      setProyecto(cot?.proyecto)
      if (cot?.fee_activo === false) setFeeActivo(false)
      setBloqueada(cot?.bloqueada || false)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
        setPerfilActual(p)
      }`
);

// Fix 4: Bloquear edicion si cotizacion bloqueada
c = c.replace(
  `  if (!cotId) return <div style={{ color: "#dc2626", padding: 24 }}>Error: ID de cotización no encontrado.</div>
  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>`,
  `  const puedeDesbloquear = perfilActual?.perfil === "superadmin" || perfilActual?.email === "jsosa@izango.com.pe" || perfilActual?.email === "pbastianelli@izango.com.pe"

  if (!cotId) return <div style={{ color: "#dc2626", padding: 24 }}>Error: ID de cotización no encontrado.</div>
  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>`
);

// Fix 5: Mostrar banner bloqueada y boton desbloquear
c = c.replace(
  `      {/* Header */}`,
  `      {/* Banner bloqueada */}
      {bloqueada && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 700, color: "#991b1b", fontSize: 13 }}>🔒 Cotización aprobada y bloqueada</span>
            <span style={{ color: "#dc2626", fontSize: 12, marginLeft: 8 }}>No se puede editar. Genera una nueva versión para hacer cambios.</span>
          </div>
          {puedeDesbloquear && (
            <button onClick={async () => {
              await supabase.from("cotizaciones").update({ bloqueada: false }).eq("id", cotId)
              setBloqueada(false)
            }} style={{ padding: "6px 14px", border: "1px solid #dc2626", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              🔓 Desbloquear
            </button>
          )}
        </div>
      )}

      {/* Header */}`
);

// Fix 6: Bloquear al aprobar
c = c.replace(
  `    if (nuevoEstado === "aprobada_cliente") {
      const { data: cotData } = await supabase.from("cotizaciones").select("proyecto_id").eq("id", cotId).single()
      await registrarHistorial({ cotizacion_id: cotId!, accion: "aprobada_cliente", estado_anterior: "borrador", estado_nuevo: "aprobada_cliente", descripcion: "Cotizacion \r\nenviada y aprobada por cliente. Total: " + fmt(totalFinal) + " Margen: " + margenGlobal.toFixed(1) + "%" })
    await generarRQs(cotId, cotData?.proyecto_id || id)
    }`,
  `    if (nuevoEstado === "aprobada_cliente") {
      await supabase.from("cotizaciones").update({ bloqueada: true, bloqueada_por: perfilActual?.id }).eq("id", cotId)
      setBloqueada(true)
      const { data: cotData } = await supabase.from("cotizaciones").select("proyecto_id").eq("id", cotId).single()
      await registrarHistorial({ cotizacion_id: cotId!, accion: "aprobada_cliente", estado_anterior: "borrador", estado_nuevo: "aprobada_cliente", descripcion: "Cotizacion enviada y aprobada por cliente. Total: " + fmt(totalFinal) + " Margen: " + margenGlobal.toFixed(1) + "%" })
      await generarRQs(cotId, cotData?.proyecto_id || id)
    }`
);

// Fix 7: Deshabilitar inputs si bloqueada
c = c.replace(
  `          <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion}
                        placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />`,
  `          <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion} disabled={bloqueada}
                        placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />`
);

// Fix 8: Deshabilitar botones guardar/enviar si bloqueada
c = c.replace(
  `          <button onClick={() => guardar()} disabled={saving} className="btn-secondary" style={{ fontSize: 12 }}>
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button onClick={() => guardar("aprobada_cliente")} disabled={saving} className="btn-primary" style={{ fontSize: 12 }}>
            Enviar al cliente
          </button>`,
  `          {!bloqueada && <button onClick={() => guardar()} disabled={saving} className="btn-secondary" style={{ fontSize: 12 }}>
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>}
          {!bloqueada && <button onClick={() => guardar("aprobada_cliente")} disabled={saving} className="btn-primary" style={{ fontSize: 12 }}>
            Enviar al cliente
          </button>}`
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("OK - " + c.length);