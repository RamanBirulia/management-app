create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());
create table if not exists app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
insert into app_settings (key,value) values ('timezone','"Europe/Tallinn"'::jsonb),('default_project_id','null'::jsonb) on conflict (key) do nothing;
