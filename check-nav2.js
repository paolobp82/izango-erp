const fs = require("fs");
const c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const idx = c.indexOf("Administracion");
console.log(JSON.stringify(c.substring(idx-10, idx+200)));