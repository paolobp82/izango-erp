const fs = require("fs");
let c = fs.readFileSync("app/auth/login/page.tsx", "utf8");
c = c.replace(
  'redirectTo: window.location.origin + "/perfil"',
  'redirectTo: window.location.origin + "/auth/reset-password"'
);
fs.writeFileSync("app/auth/login/page.tsx", c);
console.log("OK");