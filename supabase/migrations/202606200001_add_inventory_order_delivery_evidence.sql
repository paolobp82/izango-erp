alter table inventario_ordenes
add column if not exists cargo_firmado_url text,
add column if not exists evidencia_url text,
add column if not exists fecha_entrega_real date,
add column if not exists recibido_por text;
