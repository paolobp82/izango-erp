const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const oldStr = "        </div>\r\n      <nav";
const newStr = "        </a>\r\n      <nav";
if (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr);
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO");
}