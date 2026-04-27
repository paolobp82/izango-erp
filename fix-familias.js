const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// 1. Agregar funcion newFamilia y newCeldaExtra despues de newItem
const oldNewItem = `function newItem(cotizacionId: any, orden: number) {
  return calcItem({
    id: "new_" + Date.now(), cotizacion_id: cotizacionId, orden,
    descripcion: "", cantidad: 1, fechas: 1, margen_pct: 40, costo_manual: null,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
  })
}`;

const newNewItem = `function newItem(cotizacionId: any, orden: number, familiaId?: string) {
  return calcItem({
    id: "new_" + Date.now(), cotizacion_id: cotizacionId, orden,
    descripcion: "", cantidad: 1, fechas: 1, margen_pct: 40, costo_manual: null,
    tipo: "item", familia_id: familiaId || null, es_opcional: false, incluir_en_total: true,
    celda_titulo: null, numero_item: null,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
  })
}

function newFamilia(cotizacionId: any, orden: number) {
  return {
    id: "new_fam_" + Date.now(), cotizacion_id: cotizacionId, orden,
    tipo: "familia", descripcion: "Nueva familia", familia_id: null,
    es_opcional: false, incluir_en_total: true, celda_titulo: null, numero_item: null,
    cantidad: 1, fechas: 1, margen_pct: 0, costo_manual: null,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
    costo_total: 0, precio_cliente: 0, margen_monto: 0, costo_base_calculado: 0, costo_unitario: 0,
  }
}

function newCeldaExtra(cotizacionId: any, orden: number) {
  return {
    id: "new_cel_" + Date.now(), cotizacion_id: cotizacionId, orden,
    tipo: "celda_extra", descripcion: "", familia_id: null,
    es_opcional: false, incluir_en_total: false, celda_titulo: "Campo adicional", numero_item: null,
    cantidad: 1, fechas: 1, margen_pct: 0, costo_manual: null,
    costo_almacenaje: 0, costo_impresion: 0, costo_permisos: 0, costo_instalacion: 0,
    costo_performer: 0, costo_alquiler: 0, costo_supervision: 0, costo_movilidad: 0,
    costo_otros: 0, proveedor_id: null, proveedor_nombre: "", extras_produccion: [], extras_alquiler: [],
    costo_total: 0, precio_cliente: 0, margen_monto: 0, costo_base_calculado: 0, costo_unitario: 0,
  }
}`;

if (c.includes(oldNewItem)) {
  c = c.replace(oldNewItem, newNewItem);
  console.log("newItem OK");
} else {
  console.log("newItem NO ENCONTRADO");
}

// 2. Agregar descuento al estado
c = c.replace(
  '  const [showBiblioteca, setShowBiblioteca] = useState(false)\n  const [bloqueada, setBloqueada] = useState(false)\n  const [perfilActual, setPerfilActual] = useState<any>(null)',
  '  const [showBiblioteca, setShowBiblioteca] = useState(false)\n  const [bloqueada, setBloqueada] = useState(false)\n  const [perfilActual, setPerfilActual] = useState<any>(null)\n  const [descuentoPct, setDescuentoPct] = useState(0)'
);

// 3. Cargar descuento desde BD
c = c.replace(
  '      setBloqueada(cot?.bloqueada || false)',
  '      setBloqueada(cot?.bloqueada || false)\n      setDescuentoPct(cot?.descuento_pct || 0)'
);

// 4. Fix calculos totales para incluir descuento y excluir opcionales
c = c.replace(
  '  const totalCosto = items.reduce((s, i) => s + (i.costo_total || 0), 0)\n  const totalPrecioCliente = items.reduce((s, i) => s + (i.precio_cliente || 0), 0)\n  const feePct = feeActivo ? (cotizacion?.fee_agencia_pct ?? 10) : 0\n  const igvPct = cotizacion?.igv_pct ?? 18\n  const feeMonto = totalPrecioCliente * (feePct / 100)\n  const subtotalConFee = totalPrecioCliente + feeMonto\n  const igvMonto = subtotalConFee * (igvPct / 100)\n  const totalFinal = subtotalConFee + igvMonto\n  const margenGlobal = totalFinal > 0 ? ((totalFinal - totalCosto) / totalFinal) * 100 : 0',
  `  const itemsActivos = items.filter(i => i.tipo !== "familia" && i.tipo !== "celda_extra" && i.incluir_en_total !== false)
  const itemsOpcionales = items.filter(i => i.es_opcional || i.incluir_en_total === false)
  const totalCosto = itemsActivos.reduce((s, i) => s + (i.costo_total || 0), 0)
  const totalPrecioCliente = itemsActivos.reduce((s, i) => s + (i.precio_cliente || 0), 0)
  const feePct = feeActivo ? (cotizacion?.fee_agencia_pct ?? 10) : 0
  const igvPct = cotizacion?.igv_pct ?? 18
  const feeMonto = totalPrecioCliente * (feePct / 100)
  const subtotalConFee = totalPrecioCliente + feeMonto
  const descuentoMonto = subtotalConFee * ((descuentoPct || 0) / 100)
  const subtotalConDescuento = subtotalConFee - descuentoMonto
  const igvMonto = subtotalConDescuento * (igvPct / 100)
  const totalFinal = subtotalConDescuento + igvMonto
  const margenGlobal = totalFinal > 0 ? ((totalFinal - totalCosto) / totalFinal) * 100 : 0`
);

// 5. Guardar descuento en BD
c = c.replace(
  '      fee_agencia_monto: feeMonto, fee_agencia_pct: feePct, fee_activo: feeActivo,\n      subtotal_con_fee: subtotalConFee, igv_monto: igvMonto, igv_pct: igvPct,',
  '      fee_agencia_monto: feeMonto, fee_agencia_pct: feePct, fee_activo: feeActivo,\n      subtotal_con_fee: subtotalConFee, igv_monto: igvMonto, igv_pct: igvPct,\n      descuento_pct: descuentoPct || 0,'
);

// 6. Guardar tipo, familia_id, es_opcional, incluir_en_total, celda_titulo en payload
c = c.replace(
  '        extras_produccion: JSON.stringify(item.extras_produccion || []),\n        extras_alquiler: JSON.stringify(item.extras_alquiler || []),',
  `        extras_produccion: JSON.stringify(item.extras_produccion || []),
        extras_alquiler: JSON.stringify(item.extras_alquiler || []),
        tipo: item.tipo || "item",
        familia_id: item.familia_id || null,
        es_opcional: item.es_opcional || false,
        incluir_en_total: item.incluir_en_total !== false,
        celda_titulo: item.celda_titulo || null,
        numero_item: item.numero_item || null,`
);

// 7. Agregar descuento en condiciones comerciales
c = c.replace(
  '          <div>\n            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Margen objetivo (%)</label>\n            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.margen_objetivo || 40}\n              onChange={e => setCotizacion({ ...cotizacion, margen_objetivo: Number(e.target.value) })} />\n          </div>',
  `          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Margen objetivo (%)</label>
            <input type="number" style={{ ...inp, width: "100%" }} value={cotizacion?.margen_objetivo || 40}
              onChange={e => setCotizacion({ ...cotizacion, margen_objetivo: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Descuento (%)</label>
            <input type="number" min={0} max={100} style={{ ...inp, width: "100%" }} value={descuentoPct || 0}
              onChange={e => setDescuentoPct(Number(e.target.value))} />
          </div>`
);

// 8. Reemplazar tabla de items para soportar familias
const oldTablaHeader = `            <thead>
              <tr style={{ background: "#1D9E75" }}>
                <th style={{ width: 32, padding: "8px 4px" }}></th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Elemento</th>
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Cant.</th>
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Días</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>C. Unit.</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Total S/</th>
                <th style={{ textAlign: "center", width: 95, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Margen %</th>
                <th style={{ textAlign: "right", width: 130, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#d1fae5" }}>Precio cli.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>`;

const newTablaHeader = `            <thead>
              <tr style={{ background: "#1D2040" }}>
                <th style={{ width: 32, padding: "8px 4px" }}></th>
                <th style={{ width: 30, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Elemento</th>
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Cant.</th>
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Días</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>C. Unit.</th>
                <th style={{ textAlign: "right", width: 120, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Total S/</th>
                <th style={{ textAlign: "center", width: 95, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Margen %</th>
                <th style={{ textAlign: "right", width: 130, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#03E373" }}>Precio cli.</th>
                <th style={{ textAlign: "center", width: 60, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>Opc.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>`;

if (c.includes(oldTablaHeader)) {
  c = c.replace(oldTablaHeader, newTablaHeader);
  console.log("tabla header OK");
} else {
  console.log("tabla header NO ENCONTRADO");
}

// 9. Reemplazar filas de items para soportar familias, opcionales y celdas extra
const oldItemRow = `              {items.map((item, idx) => (
                <>
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: expandedItems[item.id] ? "none" : "1px solid #f3f4f6" }}>
                    <td style={{ textAlign: "center", padding: "6px 4px" }}>
                      <button onClick={() => toggleExpand(item.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#1D9E75", fontSize: 13, padding: "2px 6px" }}>
                        {expandedItems[item.id] ? "▼" : "▶"}
                      </button>
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion} disabled={bloqueada}
                        placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                    </td>`;

const newItemRow = `              {items.map((item, idx) => {
                if (item.tipo === "familia") {
                  const familiaItems = items.filter(i => i.familia_id === item.id && i.tipo !== "familia")
                  const subtotalFamilia = familiaItems.filter(i => i.incluir_en_total !== false).reduce((s, i) => s + (i.precio_cliente || 0), 0)
                  const numFamilia = items.filter(i => i.tipo === "familia").indexOf(item) + 1
                  return (
                    <tr key={item.id} style={{ background: "#1D2040", borderBottom: "1px solid #374151" }}>
                      <td colSpan={2} style={{ padding: "8px 12px", textAlign: "center" }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 14 }}>×</button>
                      </td>
                      <td colSpan={6} style={{ padding: "8px 12px" }}>
                        <input style={{ ...inp, background: "transparent", border: "none", color: "#03E373", fontWeight: 800, fontSize: 14, width: "100%" }}
                          value={item.descripcion} placeholder="Nombre de la familia..."
                          onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 12px", color: "#03E373", fontWeight: 700, fontSize: 13 }}>
                        {subtotalFamilia > 0 ? fmt(subtotalFamilia) : "—"}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )
                }
                if (item.tipo === "celda_extra") {
                  return (
                    <tr key={item.id} style={{ background: "#fffbeb", borderBottom: "1px solid #f3f4f6" }}>
                      <td colSpan={2} style={{ padding: "6px 12px", textAlign: "center" }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 14 }}>×</button>
                      </td>
                      <td colSpan={9} style={{ padding: "6px 12px" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input style={{ ...inp, width: 160, fontWeight: 700, color: "#92400e" }} value={item.celda_titulo || ""}
                            placeholder="Título del campo..." onChange={e => updateItem(item.id, "celda_titulo", e.target.value)} />
                          <span style={{ color: "#d1d5db" }}>:</span>
                          <input style={{ ...inp, flex: 1 }} value={item.descripcion || ""}
                            placeholder="Descripción..." onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                        </div>
                      </td>
                    </tr>
                  )
                }
                const numItem = items.filter(i => i.tipo !== "familia" && i.tipo !== "celda_extra").indexOf(item) + 1
                return (
                <>
                  <tr key={item.id} style={{ background: item.es_opcional ? "#f0f9ff" : idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: expandedItems[item.id] ? "none" : "1px solid #f3f4f6", opacity: item.incluir_en_total === false ? 0.7 : 1 }}>
                    <td style={{ textAlign: "center", padding: "6px 4px" }}>
                      <button onClick={() => toggleExpand(item.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#1D2040", fontSize: 13, padding: "2px 6px" }}>
                        {expandedItems[item.id] ? "▼" : "▶"}
                      </button>
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 4px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{numItem}</td>
                    <td style={{ padding: "6px 12px" }}>
                      <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion} disabled={bloqueada}
                        placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                    </td>`;

if (c.includes(oldItemRow)) {
  c = c.replace(oldItemRow, newItemRow);
  console.log("item rows OK");
} else {
  console.log("item rows NO ENCONTRADO");
}

// 10. Agregar columna opcional y cerrar el map correctamente
const oldRowEnd = `                    <td style={{ textAlign: "center", padding: "6px 4px" }}>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 16 }}>×</button>
                    </td>
                  </tr>

                  {expandedItems[item.id] && (`;

const newRowEnd = `                    <td style={{ textAlign: "center", padding: "6px 4px" }}>
                      <input type="checkbox" checked={item.incluir_en_total !== false} title="Incluir en total"
                        onChange={e => updateItem(item.id, "incluir_en_total", e.target.checked)}
                        style={{ cursor: "pointer", width: 14, height: 14, accentColor: "#03E373" }} />
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 4px" }}>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 16 }}>×</button>
                    </td>
                  </tr>

                  {expandedItems[item.id] && (`;

if (c.includes(oldRowEnd)) {
  c = c.replace(oldRowEnd, newRowEnd);
  console.log("row end OK");
} else {
  console.log("row end NO ENCONTRADO");
}

// 11. Cerrar el map de items correctamente (agregar }) al final del map)
const oldMapEnd = `                </>
              ))}`;
const newMapEnd = `                </>
                )}
              )}`;

if (c.includes(oldMapEnd)) {
  c = c.replace(oldMapEnd, newMapEnd);
  console.log("map end OK");
} else {
  console.log("map end NO ENCONTRADO");
}

// 12. Agregar botones familia y celda extra
const oldBotones = `          <button onClick={abrirBiblioteca}
            style={{ border: "1px dashed #1D9E75", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#0F6E56", cursor: "pointer" }}>
            📚 Desde biblioteca
          </button>
          <button onClick={() => setItems(prev => [...prev, newItem(cotId, prev.length)])}
            style={{ border: "1px dashed #d1d5db", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
            + Agregar ítem
          </button>`;

const newBotones = `          <button onClick={abrirBiblioteca}
            style={{ border: "1px dashed #1D2040", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#1D2040", cursor: "pointer" }}>
            📚 Desde biblioteca
          </button>
          <button onClick={() => setItems(prev => [...prev, newFamilia(cotId, prev.length)])}
            style={{ border: "1px dashed #03E373", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#027a45", cursor: "pointer" }}>
            + Familia / Grupo
          </button>
          <button onClick={() => {
            const ultimaFamilia = [...items].reverse().find(i => i.tipo === "familia")
            setItems(prev => [...prev, newItem(cotId, prev.length, ultimaFamilia?.id)])
          }} style={{ border: "1px dashed #d1d5db", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
            + Agregar ítem
          </button>
          <button onClick={() => setItems(prev => [...prev, newCeldaExtra(cotId, prev.length)])}
            style={{ border: "1px dashed #f59e0b", borderRadius: 8, background: "none", padding: "7px 18px", fontSize: 12, color: "#92400e", cursor: "pointer" }}>
            + Campo adicional
          </button>`;

if (c.includes(oldBotones)) {
  c = c.replace(oldBotones, newBotones);
  console.log("botones OK");
} else {
  console.log("botones NO ENCONTRADO");
}

// 13. Agregar descuento en totales
c = c.replace(
  '          { label: `IGV (${igvPct}%)`, value: fmt(igvMonto), color: "#374151", size: 18 },',
  `          ...(descuentoPct > 0 ? [{ label: \`Descuento (\${descuentoPct}%)\`, value: "- " + fmt(descuentoMonto), color: "#dc2626", size: 18 }] : []),
          { label: \`IGV (\${igvPct}%)\`, value: fmt(igvMonto), color: "#374151", size: 18 },`
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("DONE - " + c.length);