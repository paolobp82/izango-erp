const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const idx = c.indexOf("function calcItem");
const idx2 = c.indexOf("function newItem");
const idx3 = c.indexOf("export default");
console.log(JSON.stringify(c.substring(idx, idx2 + 400)));