alter table public.gastos_oficina
add column if not exists numero_operacion text,
add column if not exists banco_origen text,
add column if not exists tipo_transferencia text,
add column if not exists voucher_url text,
add column if not exists nota_pago text;

notify pgrst, 'reload schema';
