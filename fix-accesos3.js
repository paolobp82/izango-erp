const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

// Ver que hay entre ACCESO y ALL_NAV
const idxAllNav = c.indexOf("const ALL_NAV");
console.log("Antes de ALL_NAV:", JSON.stringify(c.substring(idxAllNav-100, idxAllNav+50)));