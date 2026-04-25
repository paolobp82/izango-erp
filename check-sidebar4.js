const fs = require("fs");
const c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const idx = c.indexOf("borderBottom");
console.log(JSON.stringify(c.substring(idx-50, idx+400)));