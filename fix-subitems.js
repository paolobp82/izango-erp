const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// 1. Agregar estado subitems
c = c.replace(
  "  const [descuentoPct, setDescuentoPct] = useState(0)",
  "  const [descuentoPct, setDescuentoPct] = useState(0)\n  const [subitems, setSubitems] = useState<Record<string, any[]>>({})"
);

// 2. Cargar subitems al cargar items
c = c.replace(
  "      setItems(parsed)\n      const { data: provs }",
  `      setItems(parsed)
      // Cargar subitems
      const subitemsMap: Record<string, any[]> = {}
      for (const item of parsed) {
        const { data: subs } = await supabase.from("cotizacion_subitems").select("*, proveedor:proveedores(nombre)").eq("item_id", item.id).order("orden")
        if (subs && subs.length > 0) subitemsMap[item.id] = subs
      }
      setSubitems(subitemsMap)
      const { data: provs }`
);

// 3. Funciones para manejar subitems
c = c.replace(
  "  function removeItem(itemId: string) {",
  `  function addSubitem(itemId: string) {
    setSubitems(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { id: "new_sub_" + Date.now(), item_id: itemId, descripcion: "", proveedor_id: null, proveedor_nombre: "", monto: 0, orden: (prev[itemId] || []).length }]
    }))
    // Recalcular costo del item padre desde subitems
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i
      const subs = subitems[itemId] || []
      const total = subs.reduce((s: number, sb: any) => s + (Number(sb.monto) || 0), 0)
      return calcItem({ ...i, costo_manual: total || null })
    }))
  }

  function updateSubitem(itemId: string, subId: string, field: string, value: any) {
    setSubitems(prev => {
      const updated = (prev[itemId] || []).map(s => s.id === subId ? { ...s, [field]: value } : s)
      // Recalcular costo del item padre
      const total = updated.reduce((s: number, sb: any) => s + (Number(sb.monto) || 0), 0)
      setItems(items => items.map(i => i.id !== itemId ? i : calcItem({ ...i, costo_manual: total > 0 ? total : null })))
      return { ...prev, [itemId]: updated }
    })
  }

  function removeSubitem(itemId: string, subId: string) {
    setSubitems(prev => {
      const updated = (prev[itemId] || []).filter(s => s.id !== subId)
      const total = updated.reduce((s: number, sb: any) => s + (Number(sb.monto) || 0), 0)
      setItems(items => items.map(i => i.id !== itemId ? i : calcItem({ ...i, costo_manual: total > 0 ? total : null })))
      return { ...prev, [itemId]: updated }
    })
  }

  function removeItem(itemId: string) {`
);

// 4. Guardar subitems al guardar cotizacion
c = c.replace(
  "    setSaving(false)\n    await registrarAccion({ accion: \"enviar\"",
  `    // Guardar subitems
    for (const [itemId, subs] of Object.entries(subitems)) {
      const dbItemId = String(itemId).startsWith("new_") ? null : itemId
      if (!dbItemId) continue
      await supabase.from("cotizacion_subitems").delete().eq("item_id", dbItemId)
      if (subs.length > 0) {
        await supabase.from("cotizacion_subitems").insert(
          subs.map((s, i) => ({
            item_id: dbItemId,
            descripcion: s.descripcion,
            proveedor_id: s.proveedor_id || null,
            proveedor_nombre: s.proveedor_nombre || "",
            monto: Number(s.monto) || 0,
            orden: i,
          }))
        )
      }
    }
    setSaving(false)
    await registrarAccion({ accion: "enviar"`
);

// 5. Mostrar subitems en la fila expandida
c = c.replace(
  `                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.06em" }}>Costos internos</span>`,
  `                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.06em" }}>Costos internos</span>
                              <button onClick={() => addSubitem(item.id)}
                                style={{ fontSize: 11, color: "#7c3aed", background: "none", border: "1px dashed #7c3aed", borderRadius: 4, padding: "2px 10px", cursor: "pointer" }}>
                                + Sub-item / Partida
                              </button>`
);

// 6. Mostrar lista de subitems despues del header de costos internos
c = c.replace(
  `                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>`,
  `                          {(subitems[item.id] || []).length > 0 && (
                            <div style={{ marginBottom: 12, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase" }}>Sub-items / Partidas</div>
                              {(subitems[item.id] || []).map((sub: any) => (
                                <div key={sub.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
                                  <input style={{ ...inp }} value={sub.descripcion} placeholder="Descripcion (ej: Anfitriona 1)"
                                    onChange={e => updateSubitem(item.id, sub.id, "descripcion", e.target.value)} />
                                  <select style={inp} value={sub.proveedor_id || ""} onChange={e => {
                                    const prov = proveedores.find((p: any) => p.id === e.target.value)
                                    updateSubitem(item.id, sub.id, "proveedor_id", e.target.value || null)
                                    updateSubitem(item.id, sub.id, "proveedor_nombre", prov?.nombre || "")
                                  }}>
                                    <option value="">Sin proveedor</option>
                                    {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                  </select>
                                  <input type="number" style={{ ...inp, textAlign: "right" }} value={sub.monto || ""} placeholder="Monto"
                                    onChange={e => updateSubitem(item.id, sub.id, "monto", Number(e.target.value))} />
                                  <button onClick={() => removeSubitem(item.id, sub.id)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }}>×</button>
                                </div>
                              ))}
                              <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#7c3aed", marginTop: 4 }}>
                                Total partidas: {fmt((subitems[item.id] || []).reduce((s: number, sb: any) => s + (Number(sb.monto) || 0), 0))}
                              </div>
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>`
);

// 7. Generar RQs por subitem al aprobar
c = c.replace(
  "  async function generarRQs(cotizacionId: string, proyectoId: string) {\n    const itemsConProveedor = items.filter(i => i.proveedor_id && i.costo_total > 0)",
  `  async function generarRQs(cotizacionId: string, proyectoId: string) {
    const itemsConProveedor = items.filter(i => i.proveedor_id && i.costo_total > 0)`
);

// Agregar generacion de RQs por subitems
c = c.replace(
  "      rqNum++\n    }\n  }",
  `      rqNum++
    }
    // Generar RQs por subitems
    for (const item of items) {
      const subs = subitems[item.id] || []
      for (const sub of subs) {
        if (!sub.proveedor_id || !sub.monto) continue
        const prov = proveedores.find((p: any) => p.id === sub.proveedor_id)
        await supabase.from("requerimientos_pago").insert({
          proyecto_id: proyectoId,
          numero_rq: "RQ-" + proyectoId.slice(0,6).toUpperCase() + "-" + String(rqNum).padStart(3, "0"),
          estado: "pendiente_aprobacion",
          proveedor_id: sub.proveedor_id,
          proveedor_nombre: prov?.nombre || sub.proveedor_nombre || "",
          proveedor_banco: prov?.banco || "",
          proveedor_cuenta: prov?.numero_cuenta || "",
          monto_solicitado: sub.monto,
          descripcion: item.descripcion + " — " + sub.descripcion,
        })
        rqNum++
      }
    }
  }`
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("OK - " + c.length);