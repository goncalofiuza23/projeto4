-- 1. criar a função primeiro para evitar erros de dependência
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- 2. criar tabela custom_columns
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

-- 3. criar tabela email_metadata atualizada (com snooze e subtasks)
create table if not exists email_metadata (
  email_id varchar(255) primary key,
  user_id varchar(255) not null,
  column_id uuid references custom_columns(id) on delete set null,
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

-- 4. criar tabela user_preferences (para as colunas minimizadas)
create table if not exists user_preferences (
  user_id varchar(255) primary key,
  collapsed_columns text[] default '{}',
  updated_at timestamp with time zone default now()
);