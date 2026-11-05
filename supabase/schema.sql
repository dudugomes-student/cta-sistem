-- Banco de dados do CTA no Supabase.
-- Rodar no SQL Editor do projeto do CTA quando formos sair do modo de teste.
--
-- Regra de segurança: as tabelas só abrem para quem está logado no painel (equipe).
-- O site dos alunos nunca lê as tabelas direto; ele usa as funções no fim deste arquivo,
-- que devolvem só o necessário (nome no check-in, a própria carteirinha com PIN).

create extension if not exists pgcrypto;

-- equipe: cada pessoa do painel é um usuário do Supabase Auth com login nome@cta.app
create table if not exists equipe (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  login text not null unique,
  criado_em timestamptz not null default now()
);

create table if not exists alunos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nascimento date not null,
  celular text unique,
  responsavel_nome text,
  responsavel_celular text,
  modalidades text[] not null check (array_length(modalidades, 1) >= 1),
  kimono text,
  emergencia_nome text not null,
  emergencia_celular text not null,
  saude text,
  foto_path text,
  pin_hash text not null,
  termo_aceito_em timestamptz not null,
  criado_em timestamptz not null default now(),
  check (celular is not null or responsavel_celular is not null)
);
create index if not exists alunos_resp_cel on alunos (responsavel_celular);

create table if not exists graduacoes (
  id bigserial primary key,
  aluno_id uuid not null references alunos (id) on delete cascade,
  modalidade text not null default 'jiujitsu',
  faixa text not null,
  graus smallint not null default 0 check (graus between 0 and 4),
  data date not null default current_date,
  por uuid references equipe (id)
);
create index if not exists graduacoes_aluno on graduacoes (aluno_id, data desc);

create table if not exists checkins (
  aluno_id uuid not null references alunos (id) on delete cascade,
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  hora time not null default (now() at time zone 'America/Sao_Paulo')::time,
  por uuid references equipe (id),
  primary key (aluno_id, dia)
);
create index if not exists checkins_dia on checkins (dia);

create table if not exists estoque (
  item text not null check (item in ('kimono', 'faixa')),
  tamanho text not null,
  cor text not null default '',
  total integer not null check (total >= 0),
  primary key (item, tamanho, cor)
);

create table if not exists emprestimos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  item text not null check (item in ('kimono', 'faixa')),
  tamanho text not null,
  cor text not null default '',
  saida date not null default current_date,
  devolvido_em date,
  por uuid references equipe (id)
);
create index if not exists emprestimos_abertos on emprestimos (aluno_id) where devolvido_em is null;

create table if not exists horarios (
  id uuid primary key default gen_random_uuid(),
  dia text not null,
  inicio time not null,
  fim time not null check (fim > inicio),
  modalidade text not null,
  turma text
);

-- ---------- quem é da equipe ----------

create or replace function eh_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from equipe where id = auth.uid());
$$;

-- ---------- RLS: tudo fechado, só a equipe abre ----------

alter table equipe enable row level security;
alter table alunos enable row level security;
alter table graduacoes enable row level security;
alter table checkins enable row level security;
alter table estoque enable row level security;
alter table emprestimos enable row level security;
alter table horarios enable row level security;

create policy equipe_tudo on equipe for all to authenticated using (eh_equipe()) with check (eh_equipe());
create policy alunos_equipe on alunos for all to authenticated using (eh_equipe()) with check (eh_equipe());
create policy graduacoes_equipe on graduacoes for all to authenticated using (eh_equipe()) with check (eh_equipe());
create policy checkins_equipe on checkins for all to authenticated using (eh_equipe()) with check (eh_equipe());
create policy estoque_equipe on estoque for all to authenticated using (eh_equipe()) with check (eh_equipe());
create policy emprestimos_equipe on emprestimos for all to authenticated using (eh_equipe()) with check (eh_equipe());
create policy horarios_equipe on horarios for all to authenticated using (eh_equipe()) with check (eh_equipe());
-- a grade de horários é pública no site
create policy horarios_publico on horarios for select to anon using (true);

-- ---------- funções do site dos alunos ----------

-- check-in: devolve só id, nome e se já treinou hoje para quem tem aquele celular
create or replace function site_buscar_checkin(p_celular text)
returns table (id uuid, nome text, ja_fez boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome,
    exists (select 1 from checkins c where c.aluno_id = a.id and c.dia = (now() at time zone 'America/Sao_Paulo')::date)
  from alunos a
  where length(regexp_replace(p_celular, '\D', '', 'g')) >= 10
    and (a.celular = regexp_replace(p_celular, '\D', '', 'g') or a.responsavel_celular = regexp_replace(p_celular, '\D', '', 'g'))
  order by a.nome;
$$;

create or replace function site_fazer_checkin(p_celular text, p_aluno uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare cel text := regexp_replace(p_celular, '\D', '', 'g');
begin
  if not exists (select 1 from alunos where id = p_aluno and (celular = cel or responsavel_celular = cel)) then
    raise exception 'Celular e aluno não conferem.';
  end if;
  insert into checkins (aluno_id) values (p_aluno) on conflict do nothing;
  return found;
end $$;

create or replace function site_cadastrar(
  p_nome text, p_nascimento date, p_celular text, p_resp_nome text, p_resp_celular text,
  p_modalidades text[], p_kimono text, p_emerg_nome text, p_emerg_celular text, p_saude text, p_pin text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid; cel text := nullif(regexp_replace(coalesce(p_celular, ''), '\D', '', 'g'), '');
begin
  if p_pin !~ '^\d{4}$' then raise exception 'O PIN precisa ter 4 números.'; end if;
  insert into alunos (nome, nascimento, celular, responsavel_nome, responsavel_celular, modalidades, kimono,
    emergencia_nome, emergencia_celular, saude, pin_hash, termo_aceito_em)
  values (trim(p_nome), p_nascimento, cel, nullif(trim(p_resp_nome), ''), nullif(regexp_replace(coalesce(p_resp_celular, ''), '\D', '', 'g'), ''),
    p_modalidades, nullif(p_kimono, ''), trim(p_emerg_nome), regexp_replace(p_emerg_celular, '\D', '', 'g'), nullif(trim(p_saude), ''),
    crypt(p_pin, gen_salt('bf')), now())
  returning id into novo;
  if 'jiujitsu' = any (p_modalidades) then
    insert into graduacoes (aluno_id, faixa, graus) values (novo, 'branca', 0);
  end if;
  return novo;
end $$;

-- conta do aluno: só com celular e PIN corretos
create or replace function site_minha_conta(p_celular text, p_pin text)
returns table (id uuid, nome text, modalidades text[], criado_em timestamptz, foto_path text, faixa text, graus smallint, treinos_no_mes bigint)
language sql stable security definer set search_path = public as $$
  select a.id, a.nome, a.modalidades, a.criado_em, a.foto_path, g.faixa, g.graus,
    (select count(*) from checkins c where c.aluno_id = a.id and date_trunc('month', c.dia) = date_trunc('month', now() at time zone 'America/Sao_Paulo'))
  from alunos a
  left join lateral (select faixa, graus from graduacoes where aluno_id = a.id order by data desc, id desc limit 1) g on true
  where (a.celular = regexp_replace(p_celular, '\D', '', 'g') or a.responsavel_celular = regexp_replace(p_celular, '\D', '', 'g'))
    and a.pin_hash = crypt(p_pin, a.pin_hash);
$$;

-- o professor redefine o PIN pelo painel
create or replace function painel_redefinir_pin(p_aluno uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_equipe() then raise exception 'Sem permissão.'; end if;
  if p_pin !~ '^\d{4}$' then raise exception 'O PIN precisa ter 4 números.'; end if;
  update alunos set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_aluno;
end $$;

revoke all on function site_buscar_checkin, site_fazer_checkin, site_cadastrar, site_minha_conta, painel_redefinir_pin from public;
grant execute on function site_buscar_checkin, site_fazer_checkin, site_cadastrar, site_minha_conta to anon, authenticated;
grant execute on function painel_redefinir_pin to authenticated;
