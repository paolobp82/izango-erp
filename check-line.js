const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const lines = c.split("\n");
console.log(lines.slice(880, 893).map((l, i) => (880+i+1) + ": " + l).join("\n"));