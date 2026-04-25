const fs = require("fs");

// ---- INVENTARIO ITEMS ----
let c1 = fs.readFileSync("app/inventario/page.tsx", "utf8");
c1 = c1.replace(
  'import { useRouter } from "next/navigation"',
  'import { useRouter } from "next/navigation"\r\nimport ImportExport from "@/components/ImportExport"'
);
c1 = c1.replace(
  '<button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo item</button>',
  `<ImportExport
            modulo="inventario_items"
            campos={[
              {key:"nombre",label:"Nombre",requerido:true},
              {key:"descripcion",label:"Descripcion"},
              {key:"categoria",label:"Categoria"},
              {key:"unidad",label:"Unidad"},
              {key:"stock_minimo",label:"Stock minimo"},
              {key:"tiene_variantes",label:"Tiene variantes"},
              {key:"foto_url",label:"URL Foto"},
            ]}
            datos={items}
            onImportar={async (registros) => {
              let exitosos=0; const errores: string[]=[];
              for(const r of registros){
                const {error}=await supabase.from("inventario_items").insert({...r,activo:true});
                if(error)errores.push(r.nombre+": "+error.message); else exitosos++;
              }
              load(); return{exitosos,errores};
            }}
          />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nuevo item</button>`
);
fs.writeFileSync("app/inventario/page.tsx", c1);
console.log("items OK - " + c1.length);

// ---- ORDENES ----
let c2 = fs.readFileSync("app/inventario/ordenes/page.tsx", "utf8");
c2 = c2.replace(
  'import { createClient } from "@/lib/supabase"',
  'import { createClient } from "@/lib/supabase"\r\nimport ImportExport from "@/components/ImportExport"'
);
c2 = c2.replace(
  '<button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva orden</button>',
  `<ImportExport
            modulo="inventario_ordenes"
            campos={[
              {key:"numero_orden",label:"N Orden"},
              {key:"tipo",label:"Tipo"},
              {key:"estado",label:"Estado"},
              {key:"direccion_destino",label:"Direccion destino"},
              {key:"contacto_receptor",label:"Contacto receptor"},
              {key:"dni_receptor",label:"DNI receptor"},
              {key:"telefono_receptor",label:"Telefono receptor"},
              {key:"transportista",label:"Transportista"},
              {key:"vehiculo_placa",label:"Placa"},
              {key:"fecha_entrega",label:"Fecha entrega"},
              {key:"fecha_retorno_esperada",label:"Fecha retorno esperada"},
              {key:"notas",label:"Notas"},
            ]}
            datos={ordenes}
            onImportar={async (registros) => {
              let exitosos=0; const errores: string[]=[];
              for(const r of registros){
                const {error}=await supabase.from("inventario_ordenes").insert({...r,estado:r.estado||"borrador"});
                if(error)errores.push((r.numero_orden||"?")+": "+error.message); else exitosos++;
              }
              load(); return{exitosos,errores};
            }}
          />
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva orden</button>`
);
fs.writeFileSync("app/inventario/ordenes/page.tsx", c2);
console.log("ordenes OK - " + c2.length);

// ---- UBICACIONES ----
let c3 = fs.readFileSync("app/inventario/ubicaciones/page.tsx", "utf8");
c3 = c3.replace(
  'import { createClient } from "@/lib/supabase"',
  'import { createClient } from "@/lib/supabase"\r\nimport ImportExport from "@/components/ImportExport"'
);
c3 = c3.replace(
  '<button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva ubicación</button>',
  `<ImportExport
            modulo="inventario_ubicaciones"
            campos={[
              {key:"nombre",label:"Nombre",requerido:true},
              {key:"tipo",label:"Tipo"},
              {key:"direccion",label:"Direccion"},
            ]}
            datos={ubicaciones}
            onImportar={async (registros) => {
              let exitosos=0; const errores: string[]=[];
              for(const r of registros){
                const {error}=await supabase.from("inventario_ubicaciones").insert({...r,activo:true});
                if(error)errores.push(r.nombre+": "+error.message); else exitosos++;
              }
              load(); return{exitosos,errores};
            }}
          />
          <button onClick={abrirNuevo} className="btn-primary" style={{ fontSize: 13 }}>+ Nueva ubicación</button>`
);
fs.writeFileSync("app/inventario/ubicaciones/page.tsx", c3);
console.log("ubicaciones OK - " + c3.length);