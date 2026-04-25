const fs = require("fs");
const c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const idx = c.indexOf("Mi cuenta");
console.log("Mi cuenta idx:", idx);
const idx2 = c.indexOf("Mi perfil");
console.log("Mi perfil idx:", idx2);
if (idx2 !== -1) console.log(JSON.stringify(c.substring(idx2-100, idx2+100)));