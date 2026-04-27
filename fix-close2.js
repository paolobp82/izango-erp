const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Eliminar el </div> duplicado en linea 872
c = c.replace(
  "      </div>\n\n      </div>\n\n      {/* Totales */}",
  "      </div>\n\n      {/* Totales */}"
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
console.log("OK - " + c.length);