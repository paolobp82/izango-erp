alter table public.requerimientos_pago
  add column if not exists cancelado_por uuid references public.perfiles(id) on delete set null,
  add column if not exists cancelado_at timestamptz,
  add column if not exists cancelado_motivo text;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'requerimientos_pago'
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%estado%'
  loop
    execute format('alter table public.requerimientos_pago drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.requerimientos_pago
  add constraint requerimientos_pago_estado_check
  check (estado in ('pendiente_aprobacion', 'aprobado_produccion', 'aprobado', 'programado', 'pagado', 'rechazado', 'cancelado', 'cerrado'))
  not valid;

create index if not exists idx_requerimientos_pago_cancelado_at
  on public.requerimientos_pago(cancelado_at)
  where cancelado_at is not null;

do $$
declare
  v_rq_id uuid;
begin
  select id
    into v_rq_id
    from public.requerimientos_pago
   where codigo_rq = 'RQ-2026-00128'
      or numero_rq = 'RQ-2026-00128'
   limit 1;

  if v_rq_id is not null then
    update public.caja_chica
       set rq_id = null
     where rq_id = v_rq_id;

    delete from public.requerimientos_pago
     where id = v_rq_id;
  end if;
end;
$$;

create or replace function public.prevent_delete_non_pending_rq()
returns trigger
language plpgsql
as $$
begin
  if old.estado <> 'pendiente_aprobacion' then
    raise exception 'No se puede eliminar un RQ que ya ingresó al flujo de aprobación. Utilice Cancelar RQ.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_non_pending_rq on public.requerimientos_pago;
create trigger trg_prevent_delete_non_pending_rq
before delete on public.requerimientos_pago
for each row
execute function public.prevent_delete_non_pending_rq();
