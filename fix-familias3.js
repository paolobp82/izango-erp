const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Fix 1: Campo adicional - hacer titulo mas visible
const oldCelda = `                      <td style={{ padding: "6px 8px" }}>
                        <input style={{ ...inp, width: "100%", fontWeight: 700, color: "#92400e", fontSize: 11 }} value={item.celda_titulo || ""}
                          placeholder="Título..." onChange={e => updateItem(item.id, "celda_titulo", e.target.value)} />
                      </td>
                      <td colSpan={8} style={{ padding: "6px 12px" }}>
                        <input style={{ ...inp, width: "100%" }} value={item.descripcion || ""}
                          placeholder="Descripción del campo adicional..." onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>`;

const newCelda = `                      <td style={{ padding: "6px 8px", minWidth: 140 }}>
                        <input style={{ ...inp, width: "100%", fontWeight: 700, color: "#92400e", fontSize: 12, background: "#fff8f0", borderColor: "#f59e0b" }} value={item.celda_titulo || ""}
                          placeholder="Titulo del campo..." onChange={e => updateItem(item.id, "celda_titulo", e.target.value)} />
                      </td>
                      <td colSpan={8} style={{ padding: "6px 12px" }}>
                        <input style={{ ...inp, width: "100%" }} value={item.descripcion || ""}
                          placeholder="Descripcion..." onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                      </td>`;

if (c.includes(oldCelda)) {
  c = c.replace(oldCelda, newCelda);
  console.log("celda titulo OK");
} else {
  console.log("celda titulo NO ENCONTRADO");
}

// Fix 2: Agregar selector de familia en la fila expandida de cada item
const oldProvSelector = `                              <span style={{ fontSize: 11, color: "#6b7280" }}>Centro de costos:</span>
                              <select style={{ ...inp, minWidth: 160 }} value={item.centro_costo_id || ""}
                                onChange={e => updateItem(item.id, "centro_costo_id", e.target.value || null)}>
                                <option value="">Sin centro</option>
                                {centrosCostos.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.nombre}</option>)}
                              </select>`;

const newProvSelector = `                              <span style={{ fontSize: 11, color: "#6b7280" }}>Familia:</span>
                              <select style={{ ...inp, minWidth: 140 }} value={item.familia_id || ""}
                                onChange={e => updateItem(item.id, "familia_id", e.target.value || null)}>
                                <option value="">Sin familia</option>
                                {items.filter(i => i.tipo === "familia").map((f: any) => <option key={f.id} value={f.id}>{f.descripcion}</option>)}
                              </select>
                              <span style={{ fontSize: 11, color: "#6b7280" }}>Centro de costos:</span>
                              <select style={{ ...inp, minWidth: 160 }} value={item.centro_costo_id || ""}
                                onChange={e => updateItem(item.id, "centro_costo_id", e.target.value || null)}>
                                <option value="">Sin centro</option>
                                {centrosCostos.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.nombre}</option>)}
                              </select>`;

if (c.includes(oldProvSelector)) {
  c = c.replace(oldProvSelector, newProvSelector);
  console.log("selector familia OK");
} else {
  console.log("selector familia NO ENCONTRADO");
}

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("DONE - " + c.length);