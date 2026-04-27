const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const lines = c.split("\n");
console.log(lines.slice(859, 895).map((l, i) => (859+i+1) + ": " + l).join("\n"));