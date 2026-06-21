alter table public.facturas
  add column if not exists dias_credito integer default 30,
  add column if not exists fecha_vencimiento date;

update public.facturas
set dias_credito = 30
where dias_credito is null;

update public.facturas
set fecha_vencimiento = fecha_emision + dias_credito
where fecha_vencimiento is null
  and fecha_emision is not null;

alter table public.facturas
  alter column dias_credito set default 30;

create index if not exists idx_facturas_fecha_vencimiento
  on public.facturas(fecha_vencimiento);
