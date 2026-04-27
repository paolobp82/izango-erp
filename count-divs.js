const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const lines = c.split("\n");
let open = 0;
let issues = [];
lines.forEach((line, i) => {
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  open += opens - closes;
  if (i > 100) issues.push(`L${i+1} [${open}]: ${line.trim().substring(0,80)}`);
});
// Mostrar solo las ultimas 40 lineas con el contador
console.log(issues.slice(-40).join("\n"));
console.log("\nTotal divs sin cerrar:", open);