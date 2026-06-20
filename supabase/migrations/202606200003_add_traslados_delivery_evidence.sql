alter table logistica_traslados
add column if not exists cargo_firmado_url text,
add column if not exists evidencia_url text,
add column if not exists recibido_por text,
add column if not exists fecha_entrega_real date;
