const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Fix 1: Campo adicional - columnas correctas
const oldCeldaExtra = `                if (item.tipo === "celda_extra") {
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
                }`;

const newCeldaExtra = `                if (item.tipo === "celda_extra") {
                  return (
                    <tr key={item.id} style={{ background: "#fffbeb", borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ textAlign: "center", padding: "6px 4px" }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 14 }}>×</button>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input style={{ ...inp, width: "100%", fontWeight: 700, color: "#92400e", fontSize: 11 }} value={item.celda_titulo || ""}
                          placeholder="Título..." onChange={e => updateItem(item.id, "celda_titulo", e.target.value)} />
                      </td>
                      <td colSpan={8} style={{ padding: "6px 12px" }}>
                        <input style={{ ...inp, width: "100%" }} value={item.descripcion || ""}
                          placeholder="Descripción del campo adicional..." onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )
                }`;

if (c.includes(oldCeldaExtra)) {
  c = c.replace(oldCeldaExtra, newCeldaExtra);
  console.log("celda extra OK");
} else {
  console.log("celda extra NO ENCONTRADO");
}

// Fix 2: Familia con boton agregar item interno
const oldFamilia = `                if (item.tipo === "familia") {
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
                }`;

const newFamilia = `                if (item.tipo === "familia") {
                  const familiaItems = items.filter(i => i.familia_id === item.id && i.tipo !== "familia")
                  const subtotalFamilia = familiaItems.filter(i => i.incluir_en_total !== false).reduce((s, i) => s + (i.precio_cliente || 0), 0)
                  const familiaIdx = items.indexOf(item)
                  return (
                    <tr key={item.id} style={{ background: "#1D2040", borderBottom: "1px solid #374151" }}>
                      <td style={{ padding: "8px 6px", textAlign: "center" }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 14 }}>×</button>
                      </td>
                      <td colSpan={7} style={{ padding: "8px 12px" }}>
                        <input style={{ ...inp, background: "transparent", border: "none", color: "#03E373", fontWeight: 800, fontSize: 14, width: "100%" }}
                          value={item.descripcion} placeholder="Nombre de la familia..."
                          onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 12px", color: "#03E373", fontWeight: 700, fontSize: 13 }}>
                        {subtotalFamilia > 0 ? fmt(subtotalFamilia) : "—"}
                      </td>
                      <td colSpan={2} style={{ padding: "8px 8px", textAlign: "right" }}>
                        <button onClick={() => {
                          const nuevoItem = newItem(cotId, familiaIdx + familiaItems.length + 1, item.id)
                          setItems(prev => {
                            const idx = prev.findIndex(i => i.id === item.id)
                            const insertIdx = prev.slice(idx + 1).findIndex(i => i.tipo === "familia" && i.id !== item.id)
                            const pos = insertIdx === -1 ? prev.length : idx + 1 + insertIdx
                            return [...prev.slice(0, pos), nuevoItem, ...prev.slice(pos)]
                          })
                        }} style={{ background: "none", border: "1px dashed #03E373", borderRadius: 6, color: "#03E373", fontSize: 10, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                          + item
                        </button>
                      </td>
                    </tr>
                  )
                }`;

if (c.includes(oldFamilia)) {
  c = c.replace(oldFamilia, newFamilia);
  console.log("familia OK");
} else {
  console.log("familia NO ENCONTRADO");
}

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("DONE - " + c.length);