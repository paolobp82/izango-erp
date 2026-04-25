const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

// Verificar si ya existe la seccion Mi cuenta
if (c.includes("Mi perfil")) {
  console.log("Ya existe - OK");
} else {
  c = c.replace(
    `  { section: "Administracion", items: [
    { label: "Trazabilidad", href: "/trazabilidad" },
    { label: "Alertas", href: "/alertas" },
    { label: "Usuarios", href: "/admin/usuarios" },
  ]},
  { section: "Mi cuenta", items: [
    { label: "Mi perfil", href: "/perfil" },
  ]},`,
    `  { section: "Administracion", items: [
    { label: "Trazabilidad", href: "/trazabilidad" },
    { label: "Alertas", href: "/alertas" },
    { label: "Usuarios", href: "/admin/usuarios" },
  ]},
  { section: "Mi cuenta", items: [
    { label: "Mi perfil", href: "/perfil" },
  ]},`
  );
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
}

// Mostrar nav actual
const idx = c.indexOf("Mi cuenta");
if (idx !== -1) {
  console.log("ENCONTRADO:", JSON.stringify(c.substring(idx-50, idx+150)));
} else {
  console.log("NO EXISTE - agregando...");
  // Agregar antes del cierre del array
  c = c.replace(
    `  { section: "Administracion", items: [
    { label: "Trazabilidad", href: "/trazabilidad" },
    { label: "Alertas", href: "/alertas" },
    { label: "Usuarios", href: "/admin/usuarios" },
  ]},`,
    `  { section: "Administracion", items: [
    { label: "Trazabilidad", href: "/trazabilidad" },
    { label: "Alertas", href: "/alertas" },
    { label: "Usuarios", href: "/admin/usuarios" },
  ]},
  { section: "Mi cuenta", items: [
    { label: "Mi perfil", href: "/perfil" },
  ]},`
  );
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK agregado");
}