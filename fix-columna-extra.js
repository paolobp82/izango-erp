const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// 1. Agregar estado para columna extra
c = c.replace(
  "  const [subitems, setSubitems] = useState<Record<string, any[]>>({})",
  `  const [subitems, setSubitems] = useState<Record<string, any[]>>({})
  const [columnaExtra, setColumnaExtra] = useState<{activa: boolean, titulo: string}>({activa: false, titulo: "Dirección"})`
);

// 2. Cargar columna extra desde cotizacion
c = c.replace(
  "      setBloqueada(cot?.bloqueada || false)\n      setDescuentoPct(cot?.descuento_pct || 0)",
  `      setBloqueada(cot?.bloqueada || false)
      setDescuentoPct(cot?.descuento_pct || 0)
      if (cot?.columna_extra_titulo) setColumnaExtra({ activa: true, titulo: cot.columna_extra_titulo })`
);

// 3. Guardar columna extra en BD
c = c.replace(
  "      descuento_pct: descuentoPct || 0,",
  `      descuento_pct: descuentoPct || 0,
      columna_extra_titulo: columnaExtra.activa ? columnaExtra.titulo : null,`
);

// 4. Agregar campo columna_extra_valor a newItem
c = c.replace(
  "    tipo: \"item\", familia_id: familiaId || null, es_opcional: false, incluir_en_total: true,",
  "    tipo: \"item\", familia_id: familiaId || null, es_opcional: false, incluir_en_total: true, columna_extra_valor: \"\","
);

// 5. Guardar columna_extra_valor en payload
c = c.replace(
  "        celda_titulo: item.celda_titulo || null,\n        numero_item: item.numero_item || null,",
  `        celda_titulo: item.celda_titulo || null,
        numero_item: item.numero_item || null,
        columna_extra_valor: item.columna_extra_valor || null,`
);

// 6. Agregar boton para activar columna extra en header de tabla
c = c.replace(
  '<h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#374151" }}>Itemizado del presupuesto</h2>',
  `<h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#374151" }}>Itemizado del presupuesto</h2>`
);

c = c.replace(
  '<span style={{ fontSize: 11, color: "#9ca3af" }}>▶ Expande cada ítem para costos internos y proveedor</span>',
  `<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>▶ Expande cada ítem para costos internos y proveedor</span>
            {!columnaExtra.activa ? (
              <button onClick={() => setColumnaExtra({ activa: true, titulo: "Dirección" })}
                style={{ fontSize: 11, color: "#1e40af", background: "none", border: "1px dashed #93c5fd", borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>
                + Columna extra
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ padding: "3px 8px", border: "1px solid #93c5fd", borderRadius: 6, fontSize: 11, fontFamily: "inherit", width: 120, background: "#eff6ff" }}
                  value={columnaExtra.titulo} onChange={e => setColumnaExtra({ ...columnaExtra, titulo: e.target.value })} />
                <button onClick={() => setColumnaExtra({ activa: false, titulo: "Dirección" })}
                  style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>× quitar</button>
              </div>
            )}
          </div>`
);

// 7. Agregar columna en el thead
c = c.replace(
  '                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Elemento</th>\n                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Cant.</th>',
  `                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Elemento</th>
                {columnaExtra.activa && <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#93c5fd", width: 160 }}>{columnaExtra.titulo}</th>}
                <th style={{ textAlign: "center", width: 65, padding: "8px 4px", fontSize: 11, fontWeight: 600, color: "#fff" }}>Cant.</th>`
);

// 8. Agregar celda en cada fila de item normal
c = c.replace(
  '                    <td style={{ padding: "6px 12px" }}>\n                      <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion} disabled={bloqueada}\n                        placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />\n                    </td>',
  `                    <td style={{ padding: "6px 12px" }}>
                      <input style={{ ...inp, width: "100%", minWidth: 160 }} value={item.descripcion} disabled={bloqueada}
                        placeholder="Descripción del ítem" onChange={e => updateItem(item.id, "descripcion", e.target.value)} />
                    </td>
                    {columnaExtra.activa && (
                      <td style={{ padding: "6px 8px", width: 160 }}>
                        <input style={{ ...inp, width: "100%", background: "#eff6ff" }} value={item.columna_extra_valor || ""}
                          placeholder={columnaExtra.titulo + "..."} onChange={e => updateItem(item.id, "columna_extra_valor", e.target.value)} />
                      </td>
                    )}`
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("OK - " + c.length);