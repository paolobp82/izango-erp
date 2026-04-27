const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

c = c.replace(
  "\n    </div>\n  )\n}",
  "\n    </div>\n    </div>\n    </div>\n  )\n}"
);

fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);

// Verificar
const lines = c.split("\n");
let open = 0;
lines.forEach(line => {
  open += (line.match(/<div/g)||[]).length - (line.match(/<\/div>/g)||[]).length;
});
console.log("Divs sin cerrar:", open);