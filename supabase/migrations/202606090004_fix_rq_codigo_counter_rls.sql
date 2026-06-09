create or replace function public.assign_codigo_rq()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rq_year int;
  next_value int;
begin
  if new.codigo_rq is null or new.codigo_rq = '' then
    rq_year := extract(year from coalesce(new.created_at, now()))::int;

    insert into public.rq_codigo_counters(year, last_value, updated_at)
    values (rq_year, 1, now())
    on conflict (year) do update
    set
      last_value = public.rq_codigo_counters.last_value + 1,
      updated_at = now()
    returning last_value into next_value;

    new.codigo_rq := 'RQ-' || rq_year::text || '-' || lpad(next_value::text, 5, '0');
  end if;

  if new.numero_rq is null or new.numero_rq = '' then
    new.numero_rq := new.codigo_rq;
  end if;

  return new;
end;
$$;

revoke all on function public.assign_codigo_rq() from public;
grant execute on function public.assign_codigo_rq() to authenticated;

alter table public.rq_codigo_counters enable row level security;

revoke all on table public.rq_codigo_counters from anon;
revoke all on table public.rq_codigo_counters from authenticated;

drop policy if exists "authenticated read rq codigo counters" on public.rq_codigo_counters;
drop policy if exists "authenticated insert rq codigo counters" on public.rq_codigo_counters;
drop policy if exists "authenticated update rq codigo counters" on public.rq_codigo_counters;
drop policy if exists "authenticated delete rq codigo counters" on public.rq_codigo_counters;
