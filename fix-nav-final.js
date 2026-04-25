const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

const oldStr = "section: \"Administracion\", items: [\r\n    { label: \"Trazabilidad\", href: \"/trazabilidad\" },\r\n    { label: \"Alertas\", href: \"/alertas\" },\r\n  ]},\r\n]";

const newStr = "section: \"Administracion\", items: [\r\n    { label: \"Trazabilidad\", href: \"/trazabilidad\" },\r\n    { label: \"Alertas\", href: \"/alertas\" },\r\n    { label: \"Usuarios\", href: \"/admin/usuarios\" },\r\n  ]},\r\n  { section: \"Mi cuenta\", items: [\r\n    { label: \"Mi perfil\", href: \"/perfil\" },\r\n  ]},\r\n]";

if (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr);
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO");
}