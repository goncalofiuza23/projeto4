-- 1. criar a função primeiro para evitar erros de dependência
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- 2. criar tabela user_stats (para o backoffice / administradores)
create table if not exists user_stats (
    user_id varchar(255) primary key,
    email varchar(255) not null,
    joined_at timestamp with time zone default now(),
    last_active timestamp with time zone default now(),
    total_emails_organized integer default 0,
    is_admin boolean default false
);

create index if not exists idx_user_stats_email on user_stats(email);

-- 3. criar tabela custom_columns
create table if not exists custom_columns (
    id uuid default gen_random_uuid() primary key,
    user_id varchar(255) not null,
    name varchar(100) not null,
    color varchar(50) default 'bg-slate-100 text-slate-800',
    icon varchar(10) default '📁',
    position integer not null default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_custom_columns_user_id on custom_columns(user_id);
create index if not exists idx_custom_columns_position on custom_columns(user_id, position);

create trigger update_custom_columns_updated_at 
    before update on custom_columns 
    for each row 
    execute function update_updated_at_column();

-- 4. criar tabela email_metadata (column_id alterado para text)
create table if not exists email_metadata (
    email_id varchar(255) primary key,
    user_id varchar(255) not null,
    column_id text,
    priority varchar(20) default 'media',
    tags text[] default '{}',
    snoozed_until timestamp with time zone,
    subtasks jsonb default '[]'::jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_email_metadata_user_id on email_metadata(user_id);
create index if not exists idx_email_metadata_column_id on email_metadata(column_id);

create trigger update_email_metadata_updated_at 
    before update on email_metadata 
    for each row 
    execute function update_updated_at_column();

-- 5. criar tabela user_preferences completa (temas, assinaturas, ui)
create table if not exists user_preferences (
    user_id varchar(255) primary key,
    collapsed_columns text[] default '{}',
    background_id varchar(50) default 'slate',
    is_sidebar_collapsed boolean default false,
    signatures jsonb default '[]'::jsonb,
    updated_at timestamp with time zone default now()
);