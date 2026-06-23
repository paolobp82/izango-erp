alter table public.facturas
add column if not exists tipo_cobro text default 'directo';

alter table public.facturas
add column if not exists entidad_factoring text;

alter table public.facturas
add column if not exists costo_factoring numeric default 0;

alter table public.facturas
add column if not exists otros_descuentos numeric default 0;

alter table public.facturas
add column if not exists observacion_cobro text;
