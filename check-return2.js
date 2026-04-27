const fs = require("fs");
const c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const lines = c.split("\n");
const returnIdx = lines.findIndex(l => l.includes("return ("));
console.log("Return en linea:", returnIdx + 1);
console.log(lines.slice(returnIdx, returnIdx + 15).map((l, i) => (returnIdx+i+1) + ": " + l).join("\n"));