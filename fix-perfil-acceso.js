const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

// Agregar /perfil a todos los perfiles que no son superadmin/gerente_general
const perfiles = [
  "administrador",
  "controller", 
  "productor",
  "logistica",
  "practicante",
  "comercial",
  "gerente_produccion",
  "gerente_finanzas"
];

perfiles.forEach(p => {
  const regex = new RegExp(`(${p}: \\[)([^\\]]+)(\\])`, "g");
  c = c.replace(regex, (match, start, middle, end) => {
    if (!middle.includes("/perfil")) {
      return start + middle.trimEnd() + ',"/perfil"' + end;
    }
    return match;
  });
});

fs.writeFileSync("components/layout/Sidebar.tsx", c);
console.log("OK");