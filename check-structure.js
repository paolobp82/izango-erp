const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const lines = c.split("\n");
let open = 0;
lines.forEach((line, i) => {
  const opens = (line.match(/<div/g)||[]).length;
  const closes = (line.match(/<\/div>/g)||[]).length;
  open += opens - closes;
  if (open <= 1 && i > 800) console.log(`L${i+1} [${open}]: ${line.trim().substring(0,100)}`);
});
console.log("Total:", open);