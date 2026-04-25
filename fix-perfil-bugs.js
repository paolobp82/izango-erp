const fs = require("fs");
let c = fs.readFileSync("app/perfil/page.tsx", "utf8");

// Fix 1: cargo inicializado correctamente
c = c.replace(
  'setForm({ nombre: p?.nombre || "", apellido: p?.apellido || "", email: user.email || "", cargo: p?.cargo || "" })',
  'setForm({ nombre: p?.nombre || "", apellido: p?.apellido || "", email: user.email || "", cargo: p?.cargo || "" })'
);

// Fix 2: autoComplete off en campos de password
c = c.replace(
  '<input style={inp} type="password" placeholder="Mínimo 6 caracteres" value={passForm.nueva}',
  '<input style={inp} type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={passForm.nueva}'
);
c = c.replace(
  '<input style={inp} type="password" placeholder="Repite la contraseña" value={passForm.confirmar}',
  '<input style={inp} type="password" autoComplete="new-password" placeholder="Repite la contraseña" value={passForm.confirmar}'
);

fs.writeFileSync("app/perfil/page.tsx", c);
console.log("OK - passwords fixed");

// Mostrar como esta el cargo
const idx = c.indexOf("cargo");
console.log("cargo context:", JSON.stringify(c.substring(idx-50, idx+150)));