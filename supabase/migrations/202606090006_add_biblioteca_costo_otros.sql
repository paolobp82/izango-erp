alter table public.items_biblioteca
  add column if not exists costo_otros numeric default 0;
