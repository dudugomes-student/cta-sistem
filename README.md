# CTA Alphaville

Sistema do Centro de Treinamento de Alphaville: site dos alunos e painel dos professores.

O CTA oferece treinos gratuitos de boxe, jiu-jitsu e muay thai, num projeto da igreja.

## O que tem aqui

- **Site dos alunos** (`public/index.html`): cadastro, check-in, minha conta com a carteirinha, e horários.
- **Painel** (`public/painel/`): hoje, alunos, empréstimos de kimonos e faixas, números, horários e equipe.
- **Banco de dados** (`supabase/schema.sql`): tabelas, regras de acesso e funções do site.

## Situação atual

O sistema está em modo de teste. Tudo funciona no navegador com dados de exemplo, guardados só no aparelho de quem abre. Nada vai para a internet ainda.

Para testar:

- Site: celular (11) 98765-4321, PIN 1234.
- Painel: login teste@cta.app, senha tatame.
- O botão Recomeçar, em Painel > Mais, volta os dados de teste ao começo.

## Rodar no computador

Abrir o arquivo com dois cliques não funciona, porque o navegador bloqueia os scripts fora de um servidor.

No VS Code, instale a extensão Live Server (o VS Code sugere sozinho ao abrir a pasta) e clique em Go Live, no canto de baixo. O projeto já vem configurado para servir a pasta `public`: o site abre em http://127.0.0.1:5500 e o painel em http://127.0.0.1:5500/painel/.

Sem o VS Code, com Node instalado:

```
npx serve public
```

O site abre em http://localhost:3000 e o painel em http://localhost:3000/painel.

## Publicar no Firebase

```
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only hosting
```

## Ligar o Supabase

Falta para sair do modo de teste:

- Rodar `supabase/schema.sql` no SQL Editor do projeto do CTA.
- Preencher a URL e a chave anon em `public/assets/config.js`.
- Preencher as coordenadas do CTA em `config.js`, para o check-in conferir a localização.
- Trocar `modoTeste` para `false` e ligar `public/assets/dados.js` às funções do Supabase.

## Identidade visual

As telas seguem o design system CTA Alphaville: fundo de tatame, vidro discreto sem bordas, fonte do próprio aparelho e vermelho só no que pede ação. Nada de visual com cara de gerado por IA.
