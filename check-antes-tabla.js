const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const idx = c.indexOf('      {/* Tabla */}');
console.log(JSON.stringify(c.substring(idx - 300, idx + 50)));