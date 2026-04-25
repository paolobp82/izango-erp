const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

const oldStr = `<div style={{width:32,height:32,background:"#03E373",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>\r\n          <span style={{color:"#fff",fontWeight:700,fontSize:12}}>iz</span>\r\n        </div>\r\n        <div>\r\n          <div style={{fontSize:14,fontWeight:600}}>Izango</div>\r\n          <div style={{fontSize:11,color:"#9ca3af"}}>{ENTIDAD[perfil.entidad]}</div>\r\n        </div>`;

const newStr = `<div style={{background:"#03E373",borderRadius:10,padding:"6px 8px",flexShrink:0}}>\r\n          <img src="https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png" alt="Izango" style={{height:32,objectFit:"contain",display:"block"}} />\r\n        </div>\r\n        <div style={{minWidth:0}}>\r\n          <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>Izango 360 SAC</div>\r\n          <div style={{fontSize:11,color:"#9ca3af"}}>{ENTIDAD[perfil.entidad]}</div>\r\n        </div>`;

if (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr);
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO - length: " + c.length);
}