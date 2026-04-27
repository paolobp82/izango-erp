const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/page.tsx", "utf8");

// Fix 1: Agregar superadmin a todos los roles del FLUJO
c = c.replace(
  'roles: ["gerente_produccion", "gerente_general"] },',
  'roles: ["gerente_produccion", "gerente_general", "superadmin"] },'
);
c = c.replace(
  'roles: ["gerente_general"] },',
  'roles: ["gerente_general", "superadmin"] },'
);
c = c.replace(
  'roles: ["gerente_produccion", "gerente_general", "productor"] }, \r\n  en_curso:',
  'roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },\r\n  en_curso:'
);
c = c.replace(
  'roles: ["gerente_produccion", "gerente_general", "productor"] }, \r\n  terminado:',
  'roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },\r\n  terminado:'
);
c = c.replace(
  'roles: ["gerente_produccion", "gerente_general", "productor"] }, \r\n  liquidado:',
  'roles: ["gerente_produccion", "gerente_general", "productor", "superadmin"] },\r\n  liquidado:'
);
c = c.replace(
  'roles: ["gerente_produccion", "gerente_general"] },\r\n  facturado:',
  'roles: ["gerente_produccion", "gerente_general", "superadmin"] },\r\n  facturado:'
);

// Fix 2: Cambiar facturado por cancelado y agregar rechazado en FLUJO
c = c.replace(
  'facturado:            { label: "Facturado",             bg: "#f0fdf4", color: "#166534", siguiente: null,                  accion: null,                      roles: [] },',
  'facturado:            { label: "Facturado",             bg: "#f0fdf4", color: "#166534", siguiente: "cancelado",           accion: "Marcar cancelado",        roles: ["gerente_general","superadmin"] },\r\n  cancelado:            { label: "Cancelado",             bg: "#fee2e2", color: "#991b1b", siguiente: null,                  accion: null,                      roles: [] },'
);

// Fix 3: Copia de version desde version existente
c = c.replace(
  'async function nuevaVersion() {\r\n    setCreando(true)\r\n    const ultimaVersion = cotizaciones.length > 0 ? Math.max(...cotizaciones.map(c => c.version || 1)) : 0\r\n    const { data: nueva } = await supabase.from("cotizaciones").insert({\r\n      proyecto_id: id, version: ultimaVersion + 1, estado: "borrador",\r\n      condicion_pago: "50% adelanto / 50% contra entrega", validez_dias: 10,\r\n      fee_agencia_pct: 10, fee_activo: true, igv_pct: 18, total_cliente: 0, margen_pct: 0,\r\n    }).select().single()\r\n    setCreando(false)\r\n    if (nueva) router.push(`/proyectos/${id}/cotizaciones/${nueva.id}`)\r\n  }',
  `async function nuevaVersion(copiarDeId?: string) {
    setCreando(true)
    const ultimaVersion = cotizaciones.length > 0 ? Math.max(...cotizaciones.map((c: any) => c.version || 1)) : 0
    let condicion = "50% adelanto / 50% contra entrega"
    let validez = 10
    let fee_pct = 10
    let fee_activo = true
    let igv_pct = 18
    let itemsACopiar: any[] = []
    if (copiarDeId) {
      const cot = cotizaciones.find((c: any) => c.id === copiarDeId)
      if (cot) {
        condicion = cot.condicion_pago || condicion
        validez = cot.validez_dias || validez
        fee_pct = cot.fee_agencia_pct || fee_pct
        fee_activo = cot.fee_activo !== false
        igv_pct = cot.igv_pct || igv_pct
      }
      const { data: its } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", copiarDeId).order("orden")
      itemsACopiar = its || []
    }
    const { data: nueva } = await supabase.from("cotizaciones").insert({
      proyecto_id: id, version: ultimaVersion + 1, estado: "borrador",
      condicion_pago: condicion, validez_dias: validez,
      fee_agencia_pct: fee_pct, fee_activo, igv_pct, total_cliente: 0, margen_pct: 0,
    }).select().single()
    if (nueva && itemsACopiar.length > 0) {
      const copias = itemsACopiar.map(({ id: _id, cotizacion_id: _cid, ...rest }: any) => ({ ...rest, cotizacion_id: nueva.id }))
      await supabase.from("cotizacion_items").insert(copias)
    }
    setCreando(false)
    if (nueva) router.push(\`/proyectos/\${id}/cotizaciones/\${nueva.id}\`)
  }`
);

// Fix 4: Agregar selector de version a copiar en el boton Nueva proforma
c = c.replace(
  '<button onClick={nuevaVersion} disabled={creando} className="btn-primary" style={{ fontSize: 13 }}>\r\n          {creando ? "Creando..." : "+ Nueva proforma"}\r\n        </button>',
  `<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {cotizaciones.length > 0 && (
            <select id="copiar-version" style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "#fff" }}>
              <option value="">Nueva vacía</option>
              {cotizaciones.map((cot: any) => (
                <option key={cot.id} value={cot.id}>Copiar V{cot.version}</option>
              ))}
            </select>
          )}
          <button onClick={() => {
            const sel = document.getElementById("copiar-version") as HTMLSelectElement
            nuevaVersion(sel?.value || undefined)
          }} disabled={creando} className="btn-primary" style={{ fontSize: 13 }}>
            {creando ? "Creando..." : "+ Nueva proforma"}
          </button>
        </div>`
);

// Fix 5: puedeRechazar agregar superadmin
c = c.replace(
  'const puedeRechazar = ["gerente_produccion", "gerente_general"].includes(perfil?.perfil)',
  'const puedeRechazar = ["gerente_produccion", "gerente_general", "superadmin"].includes(perfil?.perfil)'
);

fs.writeFileSync("app/proyectos/[id]/page.tsx", c);
console.log("OK - " + c.length);