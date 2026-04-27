const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Agregar </div> faltante antes de los totales
c = c.replace(
  "      {/* Totales */}",
  "      </div>\n\n      {/* Totales */}"
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("OK - " + c.length);