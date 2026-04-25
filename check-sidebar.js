const fs = require("fs");
const c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const idx = c.indexOf("Izango");
console.log(JSON.stringify(c.substring(idx-200, idx+300)));