alter table public.gastos_oficina
add column if not exists moneda text default 'PEN',
add column if not exists tipo_cambio numeric(10,4) default 1,
add column if not exists monto_original numeric(12,2),
add column if not exists monto_pen numeric(12,2);

update public.gastos_oficina
set moneda = coalesce(moneda, 'PEN'),
    tipo_cambio = coalesce(tipo_cambio, 1),
    monto_original = coalesce(monto_original, monto),
    monto_pen = coalesce(monto_pen, monto)
where monto_original is null
   or monto_pen is null
   or moneda is null
   or tipo_cambio is null;

notify pgrst, 'reload schema';
