const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Ver contexto alrededor del segundo boton
const btn2 = c.indexOf("+ Columna extra", c.indexOf("+ Columna extra") + 10);
const start = c.lastIndexOf("{!columnaExtra.activa", btn2);
const end = c.indexOf("</div>", c.indexOf("</div>", c.indexOf("</div>", start) + 1) + 1) + 6;
console.log("Bloque a eliminar:", JSON.stringify(c.substring(start, start + 200)));

// Eliminar bloque duplicado
const blockStart = c.lastIndexOf("\n", start);
const blockEnd = end;
c = c.substring(0, blockStart) + c.substring(blockEnd);
fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("OK - " + c.length);