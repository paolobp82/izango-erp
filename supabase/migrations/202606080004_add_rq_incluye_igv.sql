alter table public.requerimientos_pago
  add column if not exists incluye_igv boolean not null default true;

