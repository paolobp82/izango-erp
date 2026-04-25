const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

const oldStr = `<div style={{padding:"16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>`;
const newStr = `<a href="/dashboard" style={{padding:"16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12,textDecoration:"none"}}>`;

const oldClose = `        </div>\r\n      <nav`;
const newClose = `        </a>\r\n      <nav`;

if (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr);
  c = c.replace(oldClose, newClose);
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO");
}