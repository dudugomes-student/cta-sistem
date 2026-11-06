# CTA Alphaville

Sistema do Centro de Treinamento de Alphaville: site dos alunos e painel dos professores.

O CTA oferece treinos gratuitos de boxe, jiu-jitsu e muay thai, num projeto da igreja.

## O que tem aqui

- **Site dos alunos** (`public/index.html`): cadastro, check-in, minha conta com a carteirinha, e horários.
- **Painel** (`public/painel/`): hoje, alunos, empréstimos de kimonos e faixas, números, horários e equipe.
- **Banco de dados** (`supabase/README.md`): como o banco do Supabase está organizado e quem vê o quê.

## Situação atual

O sistema está ligado ao banco do CTA no Supabase. Tudo o que é feito no programa, no painel pelo celular e no site vai direto para o banco, e as telas do painel se atualizam sozinhas quando alguém faz cadastro ou check-in. Detalhes do banco em `supabase/README.md`.

O primeiro acesso do painel é `douglas@cta.app`. Pela tela Equipe, qualquer pessoa da equipe cria novos logins na hora.

## Programa para Windows

O painel também é um programa instalável, CTA Painel, na pasta `desktop`. A cada atualização do painel no GitHub, o instalador é gerado sozinho numa máquina Windows e fica na página Releases do repositório, como CTA-Painel-Instalador.

Para gerar no próprio Windows, dentro da pasta `desktop`:

```
npm install
npm run exe
```

O instalador sai em `desktop/dist`. Para abrir o programa sem instalar: `npm start`.

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

## Check-in no local

O check-in pelo site só funciona dentro do CTA, na Lagoinha Alphaville (Av. Tamboré, 74, Barueri), num raio de 200 metros. Para mudar, ajuste `localCTA` em `public/assets/config.js`.

## Identidade visual

Tema preto com vidro fosco e relevo suave, luzes difusas e gotas de vidro no fundo, vermelho do CTA nos destaques e animações em telas, listas, botões e confirmações.
