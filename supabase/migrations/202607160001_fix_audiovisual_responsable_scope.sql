drop policy if exists "project scope read audiovisual" on public.audiovisual_requerimientos;
drop policy if exists "project scope write audiovisual" on public.audiovisual_requerimientos;

create policy "audiovisual scope read"
on public.audiovisual_requerimientos for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles perfil
    left join public.proyectos proyecto on proyecto.id = audiovisual_requerimientos.proyecto_id
    where perfil.id = auth.uid()
      and (
        perfil.perfil::text in ('superadmin', 'gerente_general', 'gerente_produccion', 'controller')
        or audiovisual_requerimientos.responsable_audiovisual_id = perfil.id
        or audiovisual_requerimientos.productor_id = perfil.id
        or (
          perfil.perfil::text in ('productor', 'audiovisual')
          and audiovisual_requerimientos.creado_por = perfil.id
        )
        or (
          perfil.perfil::text = 'productor'
          and proyecto.deleted_at is null
          and proyecto.productor_id = perfil.id
        )
      )
  )
);

create policy "audiovisual scope insert"
on public.audiovisual_requerimientos for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles perfil
    left join public.proyectos proyecto on proyecto.id = audiovisual_requerimientos.proyecto_id
    where perfil.id = auth.uid()
      and (
        perfil.perfil::text in ('superadmin', 'gerente_general', 'gerente_produccion', 'controller')
        or (
          perfil.perfil::text in ('productor', 'audiovisual')
          and audiovisual_requerimientos.creado_por = perfil.id
        )
        or (
          perfil.perfil::text = 'productor'
          and proyecto.deleted_at is null
          and proyecto.productor_id = perfil.id
        )
      )
  )
);

create policy "audiovisual scope update"
on public.audiovisual_requerimientos for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles perfil
    left join public.proyectos proyecto on proyecto.id = audiovisual_requerimientos.proyecto_id
    where perfil.id = auth.uid()
      and (
        perfil.perfil::text in ('superadmin', 'gerente_general', 'gerente_produccion', 'controller')
        or audiovisual_requerimientos.responsable_audiovisual_id = perfil.id
        or audiovisual_requerimientos.productor_id = perfil.id
        or (
          perfil.perfil::text = 'productor'
          and proyecto.deleted_at is null
          and proyecto.productor_id = perfil.id
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.perfiles perfil
    left join public.proyectos proyecto on proyecto.id = audiovisual_requerimientos.proyecto_id
    where perfil.id = auth.uid()
      and (
        perfil.perfil::text in ('superadmin', 'gerente_general', 'gerente_produccion', 'controller')
        or audiovisual_requerimientos.responsable_audiovisual_id = perfil.id
        or audiovisual_requerimientos.productor_id = perfil.id
        or (
          perfil.perfil::text in ('productor', 'audiovisual')
          and audiovisual_requerimientos.creado_por = perfil.id
        )
        or (
          perfil.perfil::text = 'productor'
          and proyecto.deleted_at is null
          and proyecto.productor_id = perfil.id
        )
      )
  )
);

create policy "audiovisual scope delete"
on public.audiovisual_requerimientos for delete
to authenticated
using (
  exists (
    select 1
    from public.perfiles perfil
    where perfil.id = auth.uid()
      and (
        (
          audiovisual_requerimientos.estado = 'completado'
          and perfil.perfil::text in ('superadmin', 'gerente_general')
        )
        or (
          audiovisual_requerimientos.estado <> 'completado'
          and (
            perfil.perfil::text in ('superadmin', 'gerente_general', 'gerente_produccion')
            or audiovisual_requerimientos.creado_por = perfil.id
          )
        )
      )
  )
);
