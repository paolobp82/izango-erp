const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
const idx = c.indexOf("</a>\n      <nav");
const idx2 = c.indexOf("</div>\n      <nav");
console.log("a tag idx:", idx, "div idx:", idx2);
if (idx2 !== -1) {
  c = c.replace("</div>\n      <nav", "</a>\n      <nav");
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else if (idx !== -1) {
  console.log("Ya tiene </a> - OK sin cambios");
} else {
  // buscar con \r\n
  const idx3 = c.indexOf("</div>\r\n      <nav");
  console.log("CRLF idx:", idx3);
  if (idx3 !== -1) {
    c = c.replace("</div>\r\n      <nav", "</a>\r\n      <nav");
    fs.writeFileSync("components/layout/Sidebar.tsx", c);
    console.log("OK CRLF");
  }
}