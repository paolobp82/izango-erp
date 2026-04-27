const fs = require("fs");
let c = fs.readFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", "utf8");
const dup = `  const [columnaExtra, setColumnaExtra] = useState<{activa: boolean, titulo: string}>({activa: false, titulo: "Dirección"})
  const [columnaExtra, setColumnaExtra] = useState<{activa: boolean, titulo: string}>({activa: false, titulo: "Dirección"})`;
const single = `  const [columnaExtra, setColumnaExtra] = useState<{activa: boolean, titulo: string}>({activa: false, titulo: "Dirección"})`;
if (c.includes(dup)) {
  c = c.replace(dup, single);
  fs.writeFileSync("app/proyectos/[id]/cotizaciones/[cotId]/page.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO - buscando manualmente");
  const idx = c.indexOf("columnaExtra, setColumnaExtra");
  const idx2 = c.indexOf("columnaExtra, setColumnaExtra", idx + 10);
  console.log("Primera:", idx, "Segunda:", idx2);
}