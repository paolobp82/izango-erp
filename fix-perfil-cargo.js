const fs = require("fs");
let c = fs.readFileSync("app/perfil/page.tsx", "utf8");

// Agregar cargo al form
c = c.replace(
  'const [form, setForm] = useState({ nombre: "", apellido: "", email: "" })',
  'const [form, setForm] = useState({ nombre: "", apellido: "", email: "", cargo: "" })'
);

// Cargar cargo en load
c = c.replace(
  'setForm({ nombre: p?.nombre || "", apellido: p?.apellido || "", email: user.email || "" })',
  'setForm({ nombre: p?.nombre || "", apellido: p?.apellido || "", email: user.email || "", cargo: p?.cargo || "" })'
);

// Guardar cargo
c = c.replace(
  'const { error } = await supabase.from("perfiles").update({ nombre: form.nombre, apellido: form.apellido }).eq("id", perfil.id)',
  'const { error } = await supabase.from("perfiles").update({ nombre: form.nombre, apellido: form.apellido, cargo: form.cargo }).eq("id", perfil.id)'
);

// Mostrar cargo y rol en el avatar card
c = c.replace(
  `          <div style={{ fontSize: 13, color: "#6b7280" }}>{perfil?.email}</div>
          <span style={{ background: "#e6fff4", color: "#027a45", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, marginTop: 4, display: "inline-block" }}>
            {PERFIL_LABEL[perfil?.perfil] || perfil?.perfil}
          </span>`,
  `          <div style={{ fontSize: 13, color: "#6b7280" }}>{perfil?.email}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ background: "#e6fff4", color: "#027a45", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
              {PERFIL_LABEL[perfil?.perfil] || perfil?.perfil}
            </span>
            {perfil?.cargo && <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
              {perfil?.cargo}
            </span>}
          </div>`
);

// Agregar campo cargo en el formulario
c = c.replace(
  `        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Email</label>
          <input style={{ ...inp, background: "#f9fafb", color: "#9ca3af" }} value={form.email} disabled />
        </div>`,
  `        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Cargo / Puesto</label>
          <input style={inp} value={form.cargo} placeholder="Ej: Director Comercial, Productor Senior..." onChange={e => setForm({ ...form, cargo: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Email</label>
          <input style={{ ...inp, background: "#f9fafb", color: "#9ca3af" }} value={form.email} disabled />
        </div>`
);

fs.writeFileSync("app/perfil/page.tsx", c);
console.log("OK");