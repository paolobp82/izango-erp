const fs = require("fs");
const c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const idx = c.indexOf("iz\"}");
console.log(JSON.stringify(c.substring(idx-100, idx+400)));