const fs = require("fs");
let c = fs.readFileSync("components/layout/Sidebar.tsx", "utf8");

const oldHeader = `      <div style={{padding:"16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,background:"#03E373",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:12}}>iz</span>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600}}>Izango</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>{ENTIDAD[perfil.entidad]}</div>
        </div>
      </div>`;

const newHeader = `      <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:10}}>
        <div style={{background:"#03E373",borderRadius:10,padding:"6px 8px",flexShrink:0}}>
          <img src="https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png" alt="Izango" style={{height:32,objectFit:"contain",display:"block"}} />
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Izango 360 SAC</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>{ENTIDAD[perfil.entidad]}</div>
        </div>
      </div>`;

if (c.includes(oldHeader)) {
  c = c.replace(oldHeader, newHeader);
  fs.writeFileSync("components/layout/Sidebar.tsx", c);
  console.log("OK");
} else {
  console.log("NO ENCONTRADO");
}