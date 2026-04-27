const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

c = c.replace(
  '          </div>\n        </div>\n      </div>\n\n      {/* Tabla */}',
  '          </div>\n        </div>\n\n      {/* Tabla */}'
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);

// Verificar divs
const lines = c.split("\n");
let open = 0;
lines.forEach(l => { open += (l.match(/<div/g)||[]).length - (l.match(/<\/div>/g)||[]).length; });
console.log("Divs sin cerrar:", open);