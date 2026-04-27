const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");

// Reemplazar el final directamente por indice
const endIdx = c.lastIndexOf("    </div>\n    </div>\n  )\n}");
console.log("End idx:", endIdx);
if (endIdx !== -1) {
  c = c.substring(0, endIdx) + "    </div>\n    </div>\n    </div>\n  )\n}";
  fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
}

const lines = c.split("\n");
let open = 0;
lines.forEach(l => { open += (l.match(/<div/g)||[]).length - (l.match(/<\/div>/g)||[]).length; });
console.log("Divs sin cerrar:", open);
console.log("Ultimas 6:", lines.slice(-6).join("\n"));