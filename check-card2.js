const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const idx = c.indexOf("Itemizado del presupuesto");
const start = c.lastIndexOf("\n", idx - 500);
console.log(JSON.stringify(c.substring(start, idx - 150)));