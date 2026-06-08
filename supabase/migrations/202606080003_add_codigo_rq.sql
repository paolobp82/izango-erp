alter table public.requerimientos_pago
  add column if not exists codigo_rq text;

with ranked as (
  select
    id,
    extract(year from coalesce(created_at, now()))::int as rq_year,
    row_number() over (
      partition by extract(year from coalesce(created_at, now()))::int
      order by created_at asc nulls last, id asc
    ) as rn
  from public.requerimientos_pago
),
codigos as (
  select
    id,
    'RQ-' || rq_year::text || '-' || lpad(rn::text, 5, '0') as codigo
  from ranked
)
update public.requerimientos_pago rq
set codigo_rq = codigos.codigo
from codigos
where rq.id = codigos.id
  and rq.codigo_rq is null;

create unique index if not exists requerimientos_pago_codigo_rq_key
  on public.requerimientos_pago(codigo_rq)
  where codigo_rq is not null;

create table if not exists public.rq_codigo_counters (
  year int primary key,
  last_value int not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.rq_codigo_counters(year, last_value)
select
  extract(year from coalesce(created_at, now()))::int as year,
  count(*)::int as last_value
from public.requerimientos_pago
group by 1
on conflict (year) do update
set
  last_value = greatest(public.rq_codigo_counters.last_value, excluded.last_value),
  updated_at = now();

create or replace function public.assign_codigo_rq()
returns trigger
language plpgsql
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

drop trigger if exists trg_assign_codigo_rq on public.requerimientos_pago;
create trigger trg_assign_codigo_rq
before insert on public.requerimientos_pago
for each row
execute function public.assign_codigo_rq();
