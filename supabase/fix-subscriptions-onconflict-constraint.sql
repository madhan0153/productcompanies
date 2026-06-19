-- One-time migration: replace the partial provider-subscription index with a
-- full unique constraint that PostgREST can use as an ON CONFLICT target.
--
-- PostgreSQL already treats NULL values as distinct for a normal UNIQUE
-- constraint, so the old WHERE provider_subscription_id IS NOT NULL predicate
-- was unnecessary.

begin;

drop index if exists public.ux_subscriptions_provider_environment_subscription;

do $$ begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'ux_subscriptions_provider_environment_subscription'
       and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint ux_subscriptions_provider_environment_subscription
      unique (provider, environment, provider_subscription_id);
  end if;
end $$;

commit;

select conname, contype, conrelid::regclass::text as on_table
  from pg_constraint
 where conname = 'ux_subscriptions_provider_environment_subscription';
