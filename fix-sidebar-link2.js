const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

// Revertir el cierre malo
c = c.replace(`        </a>\r\n      <nav`, `        </div>\r\n      <nav`);

// Ahora envolver todo el header en un <a>
const oldHeader = `      <div style={{padding:"16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>`;
const newHeader = `      <a href="/dashboard" style={{padding:"16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12,textDecoration:"none",cursor:"pointer"}}>`;
const oldClose = `        </div>\r\n      <nav`;
const newClose = `        </a>\r\n      <nav`;

if (c.includes(oldHeader)) {
  c = c.replace(oldHeader, newHeader);
  c = c.replace(oldClose, newClose);
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO");
}