# Banco do CTA no Supabase

Projeto **CTA Alphaville** (região São Paulo). As migrações aplicadas ficam registradas no próprio projeto, em Database > Migrations: `cta_tabelas`, `cta_funcoes`, `cta_pin_separado` e `cta_bloquear_cadastro_publico`.

## Tabelas

- `equipe`: quem entra no painel. Cada pessoa é um usuário do Supabase Auth com login `nome@cta.app`.
- `alunos`: cadastro completo, sem o PIN.
- `graduacoes`: histórico de faixas e graus. A mais recente é a atual.
- `checkins`: um por aluno por dia.
- `emprestimos`: kimonos e faixas que saíram e voltaram.
- `estoque`: total de kimonos e faixas por tamanho.
- `horarios`: grade de aulas. É a única tabela que o site lê direto.
- `privado.alunos_pin`: PIN dos alunos, fora da API e criptografado.

## Quem vê o quê

- Quem não está logado não lê nenhuma tabela, só a grade de horários.
- O site dos alunos usa funções que devolvem só o necessário: `site_buscar_checkin`, `site_fazer_checkin`, `site_minha_conta` e `cadastrar_aluno`.
- A equipe logada lê e altera tudo pelo painel.

## Logins da equipe

- `painel_criar_acesso` cria o usuário de login e já registra a pessoa na equipe, sem e-mail de confirmação. Só quem já é da equipe consegue chamar.
- `painel_redefinir_senha` e `painel_redefinir_pin` redefinem senha e PIN.
- Qualquer outra criação de conta é recusada por um gatilho em `auth.users`.

## Tempo real

As tabelas do painel estão na publicação `supabase_realtime`. Um cadastro ou check-in feito pelo site aparece sozinho no painel.
