const fs = require("fs");
const c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const idx = c.indexOf("return (");
console.log(JSON.stringify(c.substring(idx, idx+600)));