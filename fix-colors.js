const fs = require("fs");

// Fix globals.css - unificar verde a #03E373
let css = fs.readFileSync("app/globals.css", "utf8");
css = css.replace(/#1D9E75/g, "#03E373");
css = css.replace(/#0F6E56/g, "#027a45");
css = css.replace(/#1D9E75/g, "#03E373");
css = css.replace(/#E1F5EE/g, "#e6fff4");
css = css.replace(/bg-izango-500 { background: #03E373; }/g, "bg-izango-500 { background: #03E373; }");
fs.writeFileSync("app/globals.css", css);
console.log("CSS OK");

// Fix Sidebar - verde activo
let sidebar = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");
sidebar = sidebar.replace(/#1D9E75/g, "#03E373");
sidebar = sidebar.replace(/#0F6E56/g, "#027a45");
sidebar = sidebar.replace(/#E1F5EE/g, "#e6fff4");
fs.writeFileSync("components/layout/Sidebar.tsx", sidebar);
console.log("Sidebar OK");

// Fix AppLayout - header
let layout = fs.readFileSync("components/layout/AppLayout.tsx", "utf8");
layout = layout.replace(/#1D9E75/g, "#03E373");
layout = layout.replace(/#1D9E75/g, "#03E373");
fs.writeFileSync("components/layout/AppLayout.tsx", layout);
console.log("AppLayout OK");