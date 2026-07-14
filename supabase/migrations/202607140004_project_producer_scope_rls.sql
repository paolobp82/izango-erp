create or replace function public.usuario_puede_acceder_proyecto(proyecto_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.proyectos p
    join public.perfiles perfil on perfil.id = auth.uid()
    where p.id = proyecto_uuid
      and p.deleted_at is null
      and (
        perfil.perfil in ('superadmin', 'gerente_general', 'gerente_produccion', 'controller', 'comercial', 'administrador')
        or (perfil.perfil = 'productor' and p.productor_id = perfil.id)
      )
  );
$$;

create or replace function public.usuario_puede_operar_proyecto(proyecto_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.proyectos p
    join public.perfiles perfil on perfil.id = auth.uid()
    where p.id = proyecto_uuid
      and p.deleted_at is null
      and (
        perfil.perfil in ('superadmin', 'gerente_general', 'gerente_produccion', 'controller')
        or (perfil.perfil = 'productor' and p.productor_id = perfil.id)
      )
  );
$$;

revoke all on function public.usuario_puede_acceder_proyecto(uuid) from public;
revoke all on function public.usuario_puede_operar_proyecto(uuid) from public;
grant execute on function public.usuario_puede_acceder_proyecto(uuid) to authenticated;
grant execute on function public.usuario_puede_operar_proyecto(uuid) to authenticated;

alter table public.proyectos enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;
alter table public.requerimientos_pago enable row level security;
alter table public.tareas enable row level security;
alter table public.audiovisual_requerimientos enable row level security;
alter table public.liquidaciones enable row level security;

drop policy if exists "rq read authenticated" on public.requerimientos_pago;
drop policy if exists "rq insert authenticated" on public.requerimientos_pago;
drop policy if exists "rq update creator once" on public.requerimientos_pago;
drop policy if exists "rq update finance roles" on public.requerimientos_pago;
drop policy if exists "rq update approval roles" on public.requerimientos_pago;

drop policy if exists "authenticated read audiovisual requerimientos" on public.audiovisual_requerimientos;
drop policy if exists "authenticated insert audiovisual requerimientos" on public.audiovisual_requerimientos;
drop policy if exists "authenticated update audiovisual requerimientos" on public.audiovisual_requerimientos;
drop policy if exists "authenticated delete audiovisual requerimientos" on public.audiovisual_requerimientos;

drop policy if exists "project scope read proyectos" on public.proyectos;
create policy "project scope read proyectos"
on public.proyectos for select
to authenticated
using (public.usuario_puede_acceder_proyecto(id));

drop policy if exists "project scope insert proyectos" on public.proyectos;
create policy "project scope insert proyectos"
on public.proyectos for insert
to authenticated
with check (
  exists (
    select 1 from public.perfiles perfil
    where perfil.id = auth.uid()
      and (
        perfil.perfil in ('superadmin', 'gerente_general', 'gerente_produccion')
        or (perfil.perfil = 'productor' and productor_id = perfil.id)
      )
  )
);

drop policy if exists "project scope update proyectos" on public.proyectos;
create policy "project scope update proyectos"
on public.proyectos for update
to authenticated
using (public.usuario_puede_operar_proyecto(id))
with check (public.usuario_puede_operar_proyecto(id));

drop policy if exists "project scope delete proyectos" on public.proyectos;
create policy "project scope delete proyectos"
on public.proyectos for delete
to authenticated
using (
  exists (
    select 1 from public.perfiles perfil
    where perfil.id = auth.uid()
      and perfil.perfil in ('superadmin', 'gerente_general', 'gerente_produccion', 'controller')
  )
);

drop policy if exists "project scope read cotizaciones" on public.cotizaciones;
create policy "project scope read cotizaciones"
on public.cotizaciones for select
to authenticated
using (public.usuario_puede_acceder_proyecto(proyecto_id));

drop policy if exists "project scope write cotizaciones" on public.cotizaciones;
create policy "project scope write cotizaciones"
on public.cotizaciones for all
to authenticated
using (public.usuario_puede_operar_proyecto(proyecto_id))
with check (public.usuario_puede_operar_proyecto(proyecto_id));

drop policy if exists "project scope read cotizacion items" on public.cotizacion_items;
create policy "project scope read cotizacion items"
on public.cotizacion_items for select
to authenticated
using (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_id
      and public.usuario_puede_acceder_proyecto(c.proyecto_id)
  )
);

drop policy if exists "project scope write cotizacion items" on public.cotizacion_items;
create policy "project scope write cotizacion items"
on public.cotizacion_items for all
to authenticated
using (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_id
      and public.usuario_puede_operar_proyecto(c.proyecto_id)
  )
)
with check (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_id
      and public.usuario_puede_operar_proyecto(c.proyecto_id)
  )
);

drop policy if exists "project scope read rq" on public.requerimientos_pago;
create policy "project scope read rq"
on public.requerimientos_pago for select
to authenticated
using (public.usuario_puede_acceder_proyecto(proyecto_id));

drop policy if exists "project scope insert rq" on public.requerimientos_pago;
create policy "project scope insert rq"
on public.requerimientos_pago for insert
to authenticated
with check (public.usuario_puede_operar_proyecto(proyecto_id));

drop policy if exists "project scope update rq" on public.requerimientos_pago;
create policy "project scope update rq"
on public.requerimientos_pago for update
to authenticated
using (public.usuario_puede_operar_proyecto(proyecto_id))
with check (public.usuario_puede_operar_proyecto(proyecto_id));

drop policy if exists "project scope delete rq" on public.requerimientos_pago;
create policy "project scope delete rq"
on public.requerimientos_pago for delete
to authenticated
using (public.usuario_puede_operar_proyecto(proyecto_id));

drop policy if exists "project scope read tareas" on public.tareas;
create policy "project scope read tareas"
on public.tareas for select
to authenticated
using (proyecto_id is null or public.usuario_puede_acceder_proyecto(proyecto_id));

drop policy if exists "project scope write tareas" on public.tareas;
create policy "project scope write tareas"
on public.tareas for all
to authenticated
using (proyecto_id is null or public.usuario_puede_operar_proyecto(proyecto_id))
with check (proyecto_id is null or public.usuario_puede_operar_proyecto(proyecto_id));

drop policy if exists "project scope read audiovisual" on public.audiovisual_requerimientos;
create policy "project scope read audiovisual"
on public.audiovisual_requerimientos for select
to authenticated
using (proyecto_id is null or public.usuario_puede_acceder_proyecto(proyecto_id));

drop policy if exists "project scope write audiovisual" on public.audiovisual_requerimientos;
create policy "project scope write audiovisual"
on public.audiovisual_requerimientos for all
to authenticated
using (proyecto_id is null or public.usuario_puede_operar_proyecto(proyecto_id))
with check (proyecto_id is null or public.usuario_puede_operar_proyecto(proyecto_id));

drop policy if exists "project scope read liquidaciones" on public.liquidaciones;
create policy "project scope read liquidaciones"
on public.liquidaciones for select
to authenticated
using (public.usuario_puede_acceder_proyecto(proyecto_id));

drop policy if exists "project scope write liquidaciones" on public.liquidaciones;
create policy "project scope write liquidaciones"
on public.liquidaciones for all
to authenticated
using (public.usuario_puede_operar_proyecto(proyecto_id))
with check (public.usuario_puede_operar_proyecto(proyecto_id));

comment on function public.usuario_puede_acceder_proyecto(uuid)
is 'Valida alcance vigente de proyecto. Productor solo accede cuando proyectos.productor_id = auth.uid(); no concede acceso por created_by.';

comment on function public.usuario_puede_operar_proyecto(uuid)
is 'Valida operaciones sobre proyecto y tablas hijas. Productor anterior queda bloqueado tras reasignacion.';
