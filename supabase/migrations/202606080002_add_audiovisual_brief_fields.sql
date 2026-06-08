alter table if exists public.audiovisual_requerimientos
  add column if not exists pieza_otros_descripcion text,
  add column if not exists brief text;
