create table if not exists public.tesoreria_parametros (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,
  cuenta text not null default 'Principal',
  nivel_minimo numeric(14,2) not null default 0,
  nivel_seguridad numeric(14,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa, cuenta)
);

create table if not exists public.tesoreria_saldos_diarios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  empresa text not null,
  cuenta text not null default 'Principal',
  saldo_inicial numeric(14,2) not null default 0,
  nivel_minimo numeric(14,2),
  nivel_seguridad numeric(14,2),
  fuente text not null default 'manual',
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fecha, empresa, cuenta)
);

create table if not exists public.tesoreria_cierres_diarios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  empresa text not null,
  caja_inicial numeric(14,2) not null default 0,
  ingresos_esperados numeric(14,2) not null default 0,
  ingresos_confirmados numeric(14,2) not null default 0,
  pagos_programados numeric(14,2) not null default 0,
  pagos_ejecutados numeric(14,2) not null default 0,
  produccion_dia numeric(14,2) not null default 0,
  caja_disponible numeric(14,2) not null default 0,
  caja_final_proyectada numeric(14,2) not null default 0,
  necesidad_fondeo numeric(14,2) not null default 0,
  estado_liquidez text not null default 'sin_datos',
  excedente_necesidad numeric(14,2) not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (fecha, empresa)
);

insert into public.tesoreria_parametros (empresa, cuenta, nivel_minimo, nivel_seguridad)
values
  ('Izango 360', 'BCP Izango 360', 0, 0),
  ('Izango Selva', 'BCP Izango Selva', 0, 0),
  ('Caja Chica', 'Caja Chica', 0, 0)
on conflict (empresa, cuenta) do nothing;

create index if not exists idx_tesoreria_saldos_fecha_empresa
  on public.tesoreria_saldos_diarios(fecha, empresa);

create index if not exists idx_tesoreria_cierres_fecha_empresa
  on public.tesoreria_cierres_diarios(fecha, empresa);

alter table public.tesoreria_parametros enable row level security;
alter table public.tesoreria_saldos_diarios enable row level security;
alter table public.tesoreria_cierres_diarios enable row level security;

grant select, insert, update on public.tesoreria_parametros to authenticated;
grant select, insert, update on public.tesoreria_saldos_diarios to authenticated;
grant select, insert on public.tesoreria_cierres_diarios to authenticated;

drop policy if exists "tesoreria parametros finance read" on public.tesoreria_parametros;
create policy "tesoreria parametros finance read"
on public.tesoreria_parametros
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
);

drop policy if exists "tesoreria parametros finance write" on public.tesoreria_parametros;
create policy "tesoreria parametros finance write"
on public.tesoreria_parametros
for all
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
);

drop policy if exists "tesoreria saldos finance read" on public.tesoreria_saldos_diarios;
create policy "tesoreria saldos finance read"
on public.tesoreria_saldos_diarios
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
);

drop policy if exists "tesoreria saldos finance write" on public.tesoreria_saldos_diarios;
create policy "tesoreria saldos finance write"
on public.tesoreria_saldos_diarios
for all
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
);

drop policy if exists "tesoreria cierres finance read" on public.tesoreria_cierres_diarios;
create policy "tesoreria cierres finance read"
on public.tesoreria_cierres_diarios
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
);

drop policy if exists "tesoreria cierres finance insert" on public.tesoreria_cierres_diarios;
create policy "tesoreria cierres finance insert"
on public.tesoreria_cierres_diarios
for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
  )
);
