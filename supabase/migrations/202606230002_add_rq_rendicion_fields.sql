alter table public.requerimientos_pago
add column if not exists monto_rendido numeric default 0;

alter table public.requerimientos_pago
add column if not exists monto_devolucion numeric default 0;

alter table public.requerimientos_pago
add column if not exists fecha_rendicion date;

alter table public.requerimientos_pago
add column if not exists observacion_rendicion text;
