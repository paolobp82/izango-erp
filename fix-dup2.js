const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Buscar duplicado en el header de tabla
const idx1 = c.indexOf("{columnaExtra.activa && <th");
const idx2 = c.indexOf("{columnaExtra.activa && <th", idx1 + 10);
console.log("Primera:", idx1, "Segunda:", idx2);

if (idx2 !== -1) {
  // Hay duplicado - encontrar y eliminar el segundo bloque
  const start = c.lastIndexOf("\n", idx2);
  const end = c.indexOf("\n", c.indexOf("</th>", idx2)) + 1;
  console.log("Eliminando desde", start, "hasta", end);
  c = c.substring(0, start) + c.substring(end);
  fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
  console.log("OK - " + c.length);
} else {
  console.log("No hay duplicado en thead");
}

// Buscar duplicado en boton "+ Columna extra"
const btn1 = c.indexOf("+ Columna extra");
const btn2 = c.indexOf("+ Columna extra", btn1 + 10);
console.log("Boton 1:", btn1, "Boton 2:", btn2);