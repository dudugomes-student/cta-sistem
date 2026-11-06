import * as D from './dados.js';
import { CONFIG } from './config.js';
import { esc, $, $$, avatar, faixa, textoFaixa, faixasPara, abrirDialogo, mascararCelular, montarFundo, animar, trocarTela, abertura, explodir, aviso } from './ui.js';

const raiz = $('#raiz');
let quem = null;
const sair = async () => { quem = null; rotaAtual = null; try { await D.sair(); } catch (e) { /* sem conexão */ } raiz.innerHTML = ''; ir(); };

const nomeModalidade = (id) => (D.MODALIDADES.find((m) => m.id === id) || {}).nome || id;
const listaModalidades = (ids) => ids.map(nomeModalidade).join(', ');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const conta = (n) => `<span class="destaque-num" data-conta="${n}">${n}</span>`;
const itemTexto = (e) => (e.item === 'kimono' ? `Kimono ${e.tamanho}` : `Faixa ${e.cor} ${e.tamanho}`);
const quando = (iso) => { const d = D.diasEntre(iso, D.hojeISO()); return d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };
const mesAtual = () => D.nomeMes(new Date().getMonth());

// ---------- ícones (traço fino) ----------

const ICONES = {
  hoje: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  numeros: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  checkin: '<path d="M20 6 9 17l-5-5"/>',
  horarios: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  frequencia: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  alunos: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.8 3.1 2.5 3.5 5.2"/>',
  'novo-aluno': '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.8-3.5 3.4-5.5 6.5-5.5 1.4 0 2.6.4 3.6 1"/><path d="M18 14v6M15 17h6"/>',
  novos: '<path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9L9.6 8z"/>',
  inativos: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  graduacoes: '<path d="M3 9h18v4H3z"/><path d="M15 9v4M7 13l-2 7M11 13l1 7"/>',
  aniversarios: '<path d="M4 21h16V12H4zM4 16c2 1.2 4 1.2 6 0s4-1.2 6 0 3 1.2 4 0"/><path d="M12 12V8M12 5.5c-.9 0-1.2-1 0-2.5 1.2 1.5.9 2.5 0 2.5z"/>',
  emprestimos: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  estoque: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  equipe: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/>',
};
const icone = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[k] || ''}</svg>`;

// ---------- menu lateral ----------

const MENU = [
  { grupo: 'Visão geral', itens: [['hoje', 'Hoje'], ['numeros', 'Números']] },
  { grupo: 'Treinos', itens: [['checkin', 'Check-in'], ['frequencia', 'Frequência'], ['horarios', 'Horários']] },
  { grupo: 'Alunos', itens: [['alunos', 'Todos os alunos'], ['novo-aluno', 'Cadastrar aluno'], ['novos', 'Cadastros novos'], ['inativos', 'Inativos'], ['graduacoes', 'Graduações'], ['aniversarios', 'Aniversariantes']] },
  { grupo: 'Materiais', itens: [['emprestimos', 'Empréstimos'], ['estoque', 'Estoque']] },
  { grupo: 'Administração', itens: [['equipe', 'Equipe'], ['ajustes', 'Ajustes']] },
];

function contadores() {
  return {
    checkin: D.checkinsDoDia().length,
    novos: cadastrosNovos().length,
    emprestimos: D.emprestimosAbertos().filter(D.precisaCobrar).length,
    aniversarios: aniversariantes().length,
  };
}

function montarEstrutura() {
  raiz.innerHTML = `
  <div class="shell" id="shell">
    <aside class="sidebar" id="sidebar" aria-label="Menu do painel">
      <div class="marca-topo"><a class="wordmark" href="#hoje">CTA</a><small>Painel</small><button class="recolher" type="button" id="recolher" aria-label="Recolher o menu"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button></div>
      <nav id="menu"><span class="menu-indicador" id="indicador"></span><div id="menu-itens"></div></nav>
      <div class="rodape">${avatar({ nome: quem.nome })}<span>${esc(quem.nome)}<small>${esc(quem.login)}</small></span><button class="close" type="button" id="sair">Sair</button></div>
    </aside>
    <div class="veu" id="veu"></div>
    <div class="content">
      <div class="topo-mobile"><button class="menu-btn" type="button" id="menu-btn" aria-label="Abrir menu" aria-expanded="false"><span></span></button><a class="wordmark" href="#hoje">CTA</a><span style="width:44px"></span></div>
      <main class="content-inner" id="app" aria-live="polite"></main>
    </div>
  </div>`;
  const shell = $('#shell');
  const fecharMenu = () => { shell.classList.remove('menu-aberto'); $('#menu-btn').setAttribute('aria-expanded', 'false'); };
  $('#menu-btn').addEventListener('click', () => {
    const aberto = shell.classList.toggle('menu-aberto');
    $('#menu-btn').setAttribute('aria-expanded', String(aberto));
  });
  $('#veu').addEventListener('click', fecharMenu);
  $('#menu').addEventListener('click', (e) => { if (e.target.closest('a')) fecharMenu(); });
  $('#sair').addEventListener('click', sair);
  let recolhido = false;
  try { recolhido = localStorage.getItem('cta-menu') === 'recolhido'; } catch (e) { /* segue */ }
  shell.classList.toggle('recolhido', recolhido);
  $('#recolher').addEventListener('click', () => {
    const r = shell.classList.toggle('recolhido');
    try { localStorage.setItem('cta-menu', r ? 'recolhido' : ''); } catch (e) { /* segue */ }
    setTimeout(posicionarIndicador, 520);
  });
  window.addEventListener('resize', posicionarIndicador);
}

function posicionarIndicador() {
  const ind = $('#indicador');
  const ativo = $('#menu-itens .menu-item[aria-current="page"]');
  if (!ind || !ativo) { if (ind) ind.style.opacity = '0'; return; }
  ind.style.opacity = '1';
  ind.style.top = `${ativo.offsetTop}px`;
  ind.style.height = `${ativo.offsetHeight}px`;
}

function desenharMenu(rota) {
  const c = contadores();
  $('#menu-itens').innerHTML = MENU.map((g) => `<div class="menu-grupo"><p>${g.grupo}</p>${g.itens.map(([id, nome]) => `
    <a class="menu-item" href="#${id}"${id === rota ? ' aria-current="page"' : ''}>${icone(id)}<span>${nome}</span>${c[id] ? `<span class="conta${id === 'emprestimos' ? ' alerta' : ''}">${c[id]}</span>` : ''}</a>`).join('')}</div>`).join('');
  if (!desenharMenu.feito) { $$('#menu-itens .menu-grupo').forEach((g) => { g.style.animation = 'entraLado .5s var(--mola) both'; }); desenharMenu.feito = true; } else { $$('#menu-itens .menu-grupo').forEach((g) => { g.style.animation = 'none'; }); }
  requestAnimationFrame(posicionarIndicador);
}

const app = () => $('#app');

function cabecalho(titulo, dica, acoes = '') {
  return `<h1>${titulo}</h1>${dica ? `<p class="hint">${dica}</p>` : ''}${acoes ? `<div class="acoes">${acoes}</div>` : ''}`;
}

function linhaAluno(a, direita = '', sub = null) {
  return `<button class="row" type="button" data-aluno="${a.id}">
    <span class="person">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${esc(sub ?? listaModalidades(a.modalidades))}</small></span></span>
    ${direita}<span class="chev" aria-hidden="true">›</span>
  </button>`;
}

function ligarAlunos(r = app()) { $$('[data-aluno]', r).forEach((b) => b.addEventListener('click', () => fichaAluno(b.dataset.aluno))); }

const vazio = (t) => `<p class="empty">${t}</p>`;

// ---------- entrar ----------

function telaEntrar() {
  raiz.innerHTML = `<main class="app" id="login-wrap" style="padding-top:8vh">
  <form class="view" id="login" novalidate>
    <h1>Painel do CTA</h1>
    <p class="hint">Para professores e equipe.</p>
    <div class="group">
      <label class="field"><span>Login</span><input id="l-user" type="email" autocomplete="username" placeholder="nome@${CONFIG.dominioLogin}"></label>
      <label class="field"><span>Senha</span><input id="l-senha" type="password" autocomplete="current-password"></label>
    </div>
    <p class="alert" id="l-erro" role="alert"></p>
    <button class="btn" type="submit">Entrar</button>
    <p class="hint" style="margin-top:0">Esqueceu a senha? Peça para outra pessoa da equipe redefinir.</p>
  </form></main>`;
  animar($('#login'));
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#l-erro').textContent = '';
    const b = $('#login button[type=submit]');
    b.disabled = true; b.textContent = 'Entrando';
    try {
      quem = await D.entrarEquipe($('#l-user').value, $('#l-senha').value);
      location.hash = '#hoje';
      ir();
    } catch (err) { b.disabled = false; b.textContent = 'Entrar'; requestAnimationFrame(() => { $('#l-erro').textContent = err.message; }); }
  });
}

// ---------- visão geral ----------

function cadastrosNovos() { return D.alunos().filter((a) => D.diasEntre(a.criadoEm, D.hojeISO()) <= 7).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)); }

function telaHoje() {
  const hoje = D.checkinsDoDia();
  const ativos = D.alunos().filter(D.ativo).length;
  const cobrar = D.emprestimosAbertos().filter(D.precisaCobrar);
  const novos = cadastrosNovos();
  const h = new Date().getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  app().innerHTML = `
    ${cabecalho(`${saudacao}, ${esc(D.primeiroNome(quem.nome))}`, `${conta(hoje.length)} ${hoje.length === 1 ? 'check-in' : 'check-ins'} até agora e ${conta(ativos)} ${ativos === 1 ? 'aluno ativo' : 'alunos ativos'}.`,
      '<button class="btn small" type="button" id="h-ck">Fazer check-in de um aluno</button><a class="btn quiet small" href="#novo-aluno">Cadastrar aluno</a>')}
    <div class="split">
      <div class="view">
        <p class="section-label">Check-ins de hoje</p>
        <div class="group">${hoje.length ? hoje.map((c) => { const a = D.aluno(c.alunoId); return a ? linhaAluno(a, `<span class="v k">${esc(c.hora)}</span>`, c.por ? `${listaModalidades(a.modalidades)}, marcado por ${c.por}` : null) : ''; }).join('') : vazio('Ninguém fez check-in ainda hoje.')}</div>
      </div>
      <div class="view">
        <p class="section-label">Kimonos e faixas para cobrar</p>
        <div class="group">${cobrar.length ? cobrar.map((e) => { const a = D.aluno(e.alunoId); const ult = D.ultimoTreino(e.alunoId); return a ? linhaAluno(a, '<span class="flag">Cobrar</span>', `${itemTexto(e)}, ${ult ? `último treino ${quando(ult)}` : 'sem treinos'}`) : ''; }).join('') : vazio('Ninguém com item emprestado sumiu dos treinos.')}</div>
        <p class="section-label">Cadastros novos</p>
        <div class="group">${novos.length ? novos.map((a) => linhaAluno(a, '', `${listaModalidades(a.modalidades)}, ${quando(a.criadoEm)}`)).join('') : vazio('Nenhum cadastro novo nesta semana.')}</div>
      </div>
    </div>`;
  ligarAlunos();
  $('#h-ck').addEventListener('click', dialogoCheckin);
}

function telaNumeros() {
  const todos = D.alunos();
  const ativos = todos.filter(D.ativo);
  const meses = D.checkinsPorMes(6);
  const maior = Math.max(1, ...meses.map((m) => m.total));
  const top = D.maisFrequentes(8);
  app().innerHTML = `
    ${cabecalho('Números', `${conta(ativos.length)} ${ativos.length === 1 ? 'aluno ativo' : 'alunos ativos'} de ${conta(todos.length)} cadastrados. Ativo é quem treinou nos últimos ${D.DIAS_INATIVO} dias.`)}
    <div class="split">
      <div class="view">
        <p class="section-label">Ativos por modalidade</p>
        <div class="group">${D.MODALIDADES.map((m) => { const n = ativos.filter((a) => a.modalidades.includes(m.id)).length; return `<div class="row"><span>${m.nome}</span><span class="v" data-conta="${n}">${n}</span></div>`; }).join('')}</div>
        <p class="section-label">Check-ins por mês</p>
        <div class="group"><div class="bars">${meses.map((m, i) => `
          <div class="barline"><span>${D.nomeMes(m.mes)}</span><span class="track"><span class="fill" style="width:${Math.round((m.total / maior) * 100)}%;animation-delay:${0.2 + i * 0.08}s"></span></span><span class="n" data-conta="${m.total}">${m.total}</span></div>`).join('')}</div></div>
      </div>
      <div class="view">
        <p class="section-label">Quem mais treinou em ${mesAtual()}</p>
        <div class="group">${top.length ? top.map((t) => linhaAluno(t.aluno, `<span class="v">${plural(t.n, 'treino', 'treinos')}</span>`)).join('') : vazio('Ainda sem check-ins neste mês.')}</div>
      </div>
    </div>`;
  ligarAlunos();
}

// ---------- treinos ----------

function dialogoCheckin() {
  escolherAluno('Check-in de um aluno', (a, fechar) => {
    if (!D.fazerCheckin(a.id, quem.nome)) return;
    fechar(); aviso(`${D.primeiroNome(a.nome)}, presença marcada`); explodir($('#app h1')); ir();
  }, (a) => (D.fezHoje(a.id) ? '<span class="k">já fez hoje</span>' : ''));
}

function escolherAluno(titulo, aoEscolher, extra = () => '') {
  abrirDialogo(titulo, `<div class="group"><label class="field"><span>Buscar pelo nome</span><input id="b-txt" autocomplete="off" placeholder="Davi"></label></div><div class="group" id="b-res"></div>`, (dlg) => {
    const desenhar = () => {
      const lista = D.buscarPorNome($('#b-txt', dlg).value).slice(0, 30);
      $('#b-res', dlg).innerHTML = lista.length ? lista.map((a) => linhaAluno(a, extra(a))).join('') : vazio('Ninguém com esse nome.');
      $$('[data-aluno]', dlg).forEach((b) => b.addEventListener('click', () => aoEscolher(D.aluno(b.dataset.aluno), () => dlg.parentElement.querySelector('[data-fechar]').click())));
    };
    $('#b-txt', dlg).addEventListener('input', desenhar);
    desenhar();
  });
}

function telaCheckin() {
  const hoje = D.checkinsDoDia();
  const faltam = D.alunos().filter((a) => D.ativo(a) && !D.fezHoje(a.id));
  app().innerHTML = `
    ${cabecalho('Check-in', `${conta(hoje.length)} ${hoje.length === 1 ? 'aluno treinou' : 'alunos treinaram'} hoje. Use para quem veio sem celular, como as crianças.`)}
    <div class="group"><label class="field"><span>Buscar aluno para marcar presença</span><input id="ck-busca" autocomplete="off" placeholder="Nome do aluno"></label></div>
    <div class="group" id="ck-res"></div>
    <div class="split">
      <div class="view"><p class="section-label">Já treinaram hoje</p>
        <div class="group">${hoje.length ? hoje.map((c) => { const a = D.aluno(c.alunoId); return a ? linhaAluno(a, `<span class="v k">${esc(c.hora)}</span>`, c.por ? `marcado por ${c.por}` : 'pelo celular') : ''; }).join('') : vazio('Ninguém ainda.')}</div></div>
      <div class="view"><p class="section-label">Alunos ativos que ainda não vieram</p>
        <div class="group">${faltam.length ? faltam.slice(0, 40).map((a) => `<div class="row"><span class="person">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${esc(listaModalidades(a.modalidades))}</small></span></span><button class="btn quiet small" type="button" data-marcar="${a.id}">Marcar</button></div>`).join('') : vazio('Todos os ativos já fizeram check-in.')}</div></div>
    </div>`;
  ligarAlunos();
  const busca = $('#ck-busca');
  const res = $('#ck-res');
  const desenhar = () => {
    const t = busca.value.trim();
    res.hidden = !t;
    if (!t) return;
    const lista = D.buscarPorNome(t).slice(0, 8);
    res.innerHTML = lista.length ? lista.map((a) => `<div class="row"><span class="person">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${esc(listaModalidades(a.modalidades))}</small></span></span>${D.fezHoje(a.id) ? '<span class="k">já fez hoje</span>' : `<button class="btn small" type="button" data-marcar="${a.id}">Marcar presença</button>`}</div>`).join('') : vazio('Ninguém com esse nome.');
    ligarMarcar(res);
  };
  const ligarMarcar = (r) => $$('[data-marcar]', r).forEach((b) => b.addEventListener('click', () => {
    D.fazerCheckin(b.dataset.marcar, quem.nome);
    b.classList.add('done'); b.textContent = 'Presença marcada'; explodir(b);
    aviso(`${D.primeiroNome(D.aluno(b.dataset.marcar).nome)}, presença marcada`);
    setTimeout(() => ir(), 650);
  }));
  res.hidden = true;
  busca.addEventListener('input', desenhar);
  ligarMarcar(app());
}

function telaFrequencia() {
  const lista = D.alunos().filter(D.ativo).map((a) => ({ a, n: D.treinosNoMes(a.id), ult: D.ultimoTreino(a.id) })).sort((x, y) => y.n - x.n || x.a.nome.localeCompare(y.a.nome));
  const maior = Math.max(1, ...lista.map((x) => x.n));
  app().innerHTML = `
    ${cabecalho('Frequência', `Treinos de cada aluno ativo em ${mesAtual()}.`)}
    <div class="group">${lista.length ? lista.map((x, i) => `
      <button class="row" type="button" data-aluno="${x.a.id}">
        <span class="person" style="flex:1">${avatar(x.a)}<span class="row-main">${esc(x.a.nome)}<small>${x.ult ? `último treino ${quando(x.ult)}` : 'sem treinos'}</small></span></span>
        <span class="barline" style="grid-template-columns:minmax(80px,180px) 36px;flex:none"><span class="track"><span class="fill" style="width:${Math.round((x.n / maior) * 100)}%;animation-delay:${0.2 + Math.min(i, 14) * 0.04}s"></span></span><span class="n">${x.n}</span></span>
      </button>`).join('') : vazio('Nenhum aluno ativo.')}</div>`;
  ligarAlunos();
}

function telaHorarios() {
  const hs = D.horarios();
  const porDia = D.DIAS.map((d) => ({ dia: d, aulas: hs.filter((h) => h.dia === d) })).filter((x) => x.aulas.length);
  app().innerHTML = `
    ${cabecalho('Horários', 'A grade que aparece no site dos alunos.', '<button class="btn small" type="button" id="h-novo">Adicionar horário</button>')}
    ${porDia.length ? `<div class="split">${porDia.map((d) => `<div class="view"><p class="section-label">${d.dia}</p><div class="group">${d.aulas.map((h) => `
      <div class="row"><span>${esc(nomeModalidade(h.modalidade))}${h.turma ? `<small>${esc(h.turma)}</small>` : ''}</span><span style="display:flex;gap:12px;align-items:center"><span class="v">${esc(h.inicio)} às ${esc(h.fim)}</span><button class="btn quiet small" type="button" data-hdel="${h.id}">Tirar</button></span></div>`).join('')}</div></div>`).join('')}</div>`
      : '<div class="group">' + vazio('Nenhum horário cadastrado.') + '</div>'}`;
  $$('[data-hdel]').forEach((b) => b.addEventListener('click', () => { const linha = b.closest('.row'); linha.style.transition = 'opacity .3s, transform .3s'; linha.style.opacity = '0'; linha.style.transform = 'translateX(30px)'; D.removerHorario(b.dataset.hdel); aviso('Horário retirado do site'); setTimeout(ir, 300); }));
  $('#h-novo').addEventListener('click', dialogoHorario);
}

function dialogoHorario() {
  abrirDialogo('Adicionar horário', `
    <div class="group">
      <label class="field"><span>Dia</span><select id="ho-dia">${D.DIAS.map((d) => `<option>${d}</option>`).join('')}</select></label>
      <label class="field"><span>Início</span><input id="ho-ini" type="time" value="19:00"></label>
      <label class="field"><span>Fim</span><input id="ho-fim" type="time" value="20:00"></label>
      <label class="field"><span>Modalidade</span><select id="ho-mod">${D.MODALIDADES.map((m) => `<option value="${m.id}">${m.nome}</option>`).join('')}</select></label>
      <label class="field"><span>Turma, se houver</span><input id="ho-turma" placeholder="Infantil"></label>
    </div>
    <p class="alert" id="ho-erro" role="alert"></p>
    <button class="btn" type="button" id="ho-ok">Adicionar</button>`, (dlg, fechar) => {
    $('#ho-ok', dlg).addEventListener('click', () => {
      try { D.adicionarHorario({ dia: $('#ho-dia', dlg).value, inicio: $('#ho-ini', dlg).value, fim: $('#ho-fim', dlg).value, modalidade: $('#ho-mod', dlg).value, turma: $('#ho-turma', dlg).value }); fechar(); aviso('Horário adicionado'); ir(); }
      catch (err) { $('#ho-erro', dlg).textContent = err.message; }
    });
  });
}

// ---------- alunos ----------

let filtro = { texto: '', mod: '' };

function telaListaAlunos(titulo, dica, base, situacaoFixa) {
  app().innerHTML = `
    ${cabecalho(titulo, dica, situacaoFixa === 'todos' ? '<a class="btn small" href="#novo-aluno">Cadastrar aluno</a>' : '')}
    <div class="group">
      <label class="field"><span>Buscar</span><input id="f-txt" autocomplete="off" placeholder="Nome do aluno" value="${esc(filtro.texto)}"></label>
      <label class="field"><span>Modalidade</span><select id="f-mod"><option value="">Todas</option>${D.MODALIDADES.map((m) => `<option value="${m.id}"${filtro.mod === m.id ? ' selected' : ''}>${m.nome}</option>`).join('')}</select></label>
    </div>
    <p class="hint" id="a-conta" style="margin-top:0"></p>
    <div class="group" id="a-lista"></div>`;
  const desenhar = (primeira) => {
    const t = filtro.texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let lista = base().filter((a) => !t || a.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t));
    if (filtro.mod) lista = lista.filter((a) => a.modalidades.includes(filtro.mod));
    $('#a-conta').textContent = plural(lista.length, 'aluno', 'alunos');
    const g = $('#a-lista');
    g.innerHTML = lista.length ? lista.map((a) => {
      const gr = a.graduacoes.jiujitsu;
      const ult = D.ultimoTreino(a.id);
      return linhaAluno(a, `<span class="v k">${ult ? D.dataCurta(ult) : 'sem treinos'}</span>`, `${listaModalidades(a.modalidades)}${gr ? `, ${textoFaixa(gr)}` : ''}`);
    }).join('') : vazio('Nenhum aluno com esses filtros.');
    if (!primeira) { Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 14))); g.classList.remove('cascata'); void g.offsetWidth; g.classList.add('cascata'); }
    ligarAlunos(g);
  };
  $('#f-txt').addEventListener('input', (e) => { filtro.texto = e.target.value; desenhar(); });
  $('#f-mod').addEventListener('change', (e) => { filtro.mod = e.target.value; desenhar(); });
  desenhar(true);
}

const telaAlunos = () => telaListaAlunos('Alunos', `${D.alunos().length} cadastrados. Toque num aluno para abrir a ficha.`, () => D.alunos(), 'todos');
const telaNovos = () => telaListaAlunos('Cadastros novos', 'Quem se cadastrou nos últimos 7 dias. Confira os dados e dê as boas-vindas no tatame.', cadastrosNovos, 'novos');
const telaInativos = () => telaListaAlunos('Inativos', `Alunos há mais de ${D.DIAS_INATIVO} dias sem treinar. Voltam a ativos no próximo check-in.`, () => D.alunos().filter((a) => !D.ativo(a)), 'inativos');

function telaGraduacoes() {
  const jj = D.alunos().filter((a) => a.modalidades.includes('jiujitsu'));
  const ordem = [...D.FAIXAS_INFANTIL, ...D.FAIXAS_ADULTO.slice(1)];
  const grupos = ordem.map((f) => ({ f, lista: jj.filter((a) => (a.graduacoes.jiujitsu || { faixa: 'branca' }).faixa === f) })).filter((g) => g.lista.length);
  app().innerHTML = `
    ${cabecalho('Graduações', `${conta(jj.length)} ${jj.length === 1 ? 'aluno' : 'alunos'} de jiu-jitsu. Para graduar, abra a ficha do aluno.`)}
    <div class="split">${grupos.map((g) => `<div class="view">
      <p class="section-label">Faixa ${g.f}</p>
      <div class="group">${g.lista.map((a) => { const gr = a.graduacoes.jiujitsu || { faixa: 'branca', graus: 0 }; return `
        <button class="row" type="button" data-aluno="${a.id}" style="flex-wrap:wrap">
          <span class="person" style="flex:1">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${gr.graus ? plural(gr.graus, 'grau', 'graus') : 'sem graus'}${gr.data ? `, desde ${D.dataCurta(gr.data)}` : ''}</small></span></span>
          <span style="width:120px">${faixa(gr, 12)}</span>
        </button>`; }).join('')}</div></div>`).join('')}</div>`;
  ligarAlunos();
}

function aniversariantes() {
  const m = new Date().getMonth() + 1;
  return D.alunos().filter((a) => Number(a.nascimento.slice(5, 7)) === m).sort((a, b) => a.nascimento.slice(8) - b.nascimento.slice(8));
}

function telaAniversarios() {
  const lista = aniversariantes();
  const hoje = new Date().getDate();
  app().innerHTML = `
    ${cabecalho('Aniversariantes', `Quem faz aniversário em ${mesAtual()}.`)}
    <div class="group">${lista.length ? lista.map((a) => { const dia = Number(a.nascimento.slice(8)); return linhaAluno(a, `<span class="v${dia === hoje ? '' : ' k'}">${dia === hoje ? 'hoje' : `dia ${dia}`}</span>`, `faz ${(D.idade(a.nascimento) ?? 0) + (dia > hoje ? 1 : 0)} anos`); }).join('') : vazio(`Ninguém faz aniversário em ${mesAtual()}.`)}</div>`;
  ligarAlunos();
}

function telaNovoAluno() {
  app().innerHTML = `
    ${cabecalho('Cadastrar aluno', 'Para quem chegou no CTA sem fazer o cadastro pelo site.')}
    <form class="view" id="cad" novalidate>
      <div class="split">
        <div class="view">
          <div class="group">
            <label class="field"><span>Nome completo</span><input id="c-nome" autocomplete="off" placeholder="Lucas Silva"></label>
            <label class="field"><span>Data de nascimento</span><input id="c-nasc" type="date" max="${D.hojeISO()}"></label>
            <label class="field"><span id="c-cel-rot">Celular com WhatsApp</span><input id="c-cel" type="tel" inputmode="numeric" placeholder="(11) 90000-0000"></label>
          </div>
          <div id="c-resp" class="view" hidden>
            <p class="section-label">Responsável</p>
            <div class="group">
              <label class="field"><span>Nome do responsável</span><input id="c-rnome" placeholder="Patrícia Oliveira"></label>
              <label class="field"><span>Celular do responsável</span><input id="c-rcel" type="tel" inputmode="numeric" placeholder="(11) 90000-0000"></label>
            </div>
          </div>
          <p class="section-label">Modalidades</p>
          <div class="group"><div class="checks">${D.MODALIDADES.map((m) => `<label class="check"><input type="checkbox" name="mod" value="${m.id}">${m.nome}</label>`).join('')}</div></div>
        </div>
        <div class="view">
          <p class="section-label">Contato de emergência</p>
          <div class="group">
            <label class="field"><span>Nome</span><input id="c-enome" placeholder="Maria Silva"></label>
            <label class="field"><span>Telefone</span><input id="c-ecel" type="tel" inputmode="numeric" placeholder="(11) 90000-0000"></label>
          </div>
          <p class="section-label">Outras informações</p>
          <div class="group">
            <label class="field"><span>Tamanho do kimono</span><select id="c-kim"><option value="">Não sei</option>${D.TAMANHOS_KIMONO.map((t) => `<option>${t}</option>`).join('')}</select></label>
            <label class="field"><span>Problema de saúde ou lesão</span><textarea id="c-saude" rows="2" placeholder="Opcional"></textarea></label>
            <label class="field"><span>PIN inicial do aluno, 4 números</span><input id="c-pin" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Passe para o aluno"></label>
          </div>
          <div class="group"><div class="row"><label class="check" style="box-shadow:none;background:none;padding:0"><input type="checkbox" id="c-termo">O aluno ou o responsável leu e aceitou o termo de responsabilidade</label></div></div>
        </div>
      </div>
      <p class="alert" id="c-erro" role="alert"></p>
      <div><button class="btn" type="submit" id="c-ok" style="max-width:320px">Cadastrar aluno</button></div>
    </form>`;
  ['#c-cel', '#c-rcel', '#c-ecel'].forEach((s) => mascararCelular($(s), D.formatarCelular));
  $('#c-nasc').addEventListener('change', () => {
    const i = D.idade($('#c-nasc').value);
    const menor = i !== null && i < 18;
    $('#c-resp').hidden = !menor;
    $('#c-cel-rot').textContent = menor ? 'Celular do aluno, se tiver' : 'Celular com WhatsApp';
  });
  $('#cad').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erro = $('#c-erro');
    erro.textContent = '';
    try {
      const novo = await D.cadastrar({
        nome: $('#c-nome').value, nascimento: $('#c-nasc').value, celular: $('#c-cel').value,
        responsavel: { nome: $('#c-rnome').value, celular: $('#c-rcel').value },
        modalidades: $$('input[name="mod"]:checked').map((x) => x.value),
        emergencia: { nome: $('#c-enome').value, celular: $('#c-ecel').value },
        kimono: $('#c-kim').value, saude: $('#c-saude').value, pin: $('#c-pin').value, termo: $('#c-termo').checked,
      });
      desenharMenu('novo-aluno');
      explodir($('#c-ok'));
      aviso(`${D.primeiroNome(novo.nome)} cadastrado`);
      fichaAluno(novo.id);
      telaNovoAluno();
      animar(app());
    } catch (err) { requestAnimationFrame(() => { erro.textContent = err.message; }); }
  });
}

function fichaAluno(id) {
  const a = D.aluno(id);
  if (!a) return;
  const i = D.idade(a.nascimento);
  const g = a.graduacoes.jiujitsu;
  const itens = D.emprestimosDe(a.id);
  const ult = D.ultimoTreino(a.id);
  const cel = (d) => (d ? D.formatarCelular(d) : '');

  abrirDialogo(a.nome, `
    <div class="person">${avatar(a)}<span class="row-main">${esc(listaModalidades(a.modalidades))}<small>${D.ativo(a) ? 'Ativo' : 'Inativo'}, ${ult ? `último treino em ${D.dataCurta(ult)}` : 'sem treinos'}, ${plural(D.treinosNoMes(a.id), 'treino', 'treinos')} no mês</small></span></div>
    <div><button class="btn small" type="button" id="fa-ck"${D.fezHoje(a.id) ? ' disabled' : ''}>${D.fezHoje(a.id) ? 'Já fez check-in hoje' : 'Fazer check-in'}</button></div>

    ${a.modalidades.includes('jiujitsu') ? `
    <p class="section-label">Jiu-jitsu</p>
    <div class="group">
      ${g ? `<div class="row" style="display:block">${faixa(g)}<small style="margin-top:10px">${esc(textoFaixa(g))} desde ${esc(D.dataCurta(g.data))}${g.por ? `, por ${esc(g.por)}` : ''}</small></div>` : ''}
      <label class="field"><span>Faixa</span><select id="fa-faixa">${faixasPara(D.infantil(a)).map((f) => `<option${g && g.faixa === f ? ' selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Graus</span><select id="fa-graus">${[0, 1, 2, 3, 4].map((n) => `<option${g && g.graus === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="row"><button class="btn quiet small" type="button" id="fa-grad">Salvar graduação</button></div>
    </div>` : ''}

    <p class="section-label">Kimonos e faixas com ${esc(D.primeiroNome(a.nome))}</p>
    <div class="group">${itens.length ? itens.map((e) => `<div class="row"><span>${esc(itemTexto(e))}<small>desde ${esc(D.dataCurta(e.saida))}</small></span><button class="btn quiet small" type="button" data-dev="${e.id}">Devolver</button></div>`).join('') : vazio('Nenhum item emprestado.')}
      <div class="row"><button class="btn quiet small" type="button" id="fa-emp">Emprestar kimono ou faixa</button></div></div>

    <p class="section-label">Dados</p>
    <div class="group">
      <div class="row"><span class="k">Nascimento</span><span class="v">${esc(D.dataCurta(a.nascimento))} ${esc(a.nascimento.slice(0, 4))}${i !== null ? `<small>${i} anos</small>` : ''}</span></div>
      ${a.celular ? `<div class="row"><span class="k">Celular</span><span class="v">${esc(cel(a.celular))}</span></div>` : ''}
      ${a.responsavel ? `<div class="row"><span class="k">Responsável</span><span class="v">${esc(a.responsavel.nome)}<small>${esc(cel(a.responsavel.celular))}</small></span></div>` : ''}
      <div class="row"><span class="k">Emergência</span><span class="v">${esc(a.emergencia.nome)}<small>${esc(cel(a.emergencia.celular))}</small></span></div>
      ${a.kimono ? `<div class="row"><span class="k">Kimono</span><span class="v">${esc(a.kimono)}</span></div>` : ''}
      <div class="row"><span class="k">Saúde</span><span class="v">${esc(a.saude || 'Nada informado')}</span></div>
      <div class="row"><span class="k">Cadastro</span><span class="v">${esc(D.dataCurta(a.criadoEm))} ${esc(a.criadoEm.slice(0, 4))}<small>termo aceito</small></span></div>
    </div>

    <p class="section-label">PIN da conta do aluno</p>
    <div class="group">
      <label class="field"><span>Novo PIN de 4 números</span><input id="fa-pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>
      <div class="row"><button class="btn quiet small" type="button" id="fa-pinok">Redefinir PIN</button><span class="k" id="fa-pinmsg"></span></div>
    </div>`, (dlg, fechar) => {
    const recarregar = () => { fechar(); ir(); setTimeout(() => fichaAluno(id), 240); };
    $('#fa-ck', dlg).addEventListener('click', (ev) => { D.fazerCheckin(a.id, quem.nome); ev.currentTarget.classList.add('done'); ev.currentTarget.textContent = 'Presença marcada'; explodir(ev.currentTarget); aviso(`${D.primeiroNome(a.nome)}, presença marcada`); setTimeout(recarregar, 650); });
    const grad = $('#fa-grad', dlg);
    if (grad) grad.addEventListener('click', () => { D.definirGraduacao(a.id, $('#fa-faixa', dlg).value, $('#fa-graus', dlg).value, quem.nome); explodir(grad, 'var(--red)'); aviso(`Graduação de ${D.primeiroNome(a.nome)} salva`); setTimeout(recarregar, 400); });
    $$('[data-dev]', dlg).forEach((b) => b.addEventListener('click', () => { D.devolver(b.dataset.dev); aviso('Devolução registrada'); recarregar(); }));
    $('#fa-emp', dlg).addEventListener('click', () => { fechar(); setTimeout(() => dialogoEmprestimo(a, () => { ir(); setTimeout(() => fichaAluno(id), 240); }), 240); });
    $('#fa-pinok', dlg).addEventListener('click', async () => {
      try { await D.redefinirPin(a.id, $('#fa-pin', dlg).value); $('#fa-pin', dlg).value = ''; $('#fa-pinmsg', dlg).textContent = 'PIN redefinido. Avise o aluno.'; aviso('PIN redefinido'); }
      catch (err) { $('#fa-pinmsg', dlg).innerHTML = `<span class="flag">${esc(err.message)}</span>`; }
    });
  });
}

// ---------- materiais ----------

function dialogoEmprestimo(alunoFixo, depois) {
  let alvo = alunoFixo || null;
  const corpo = () => `
    ${alvo ? `<div class="group"><div class="row"><span class="person">${avatar(alvo)}<span>${esc(alvo.nome)}</span></span>${alunoFixo ? '' : '<button class="link" type="button" id="em-troca">Trocar</button>'}</div></div>`
      : '<div class="group"><label class="field"><span>Aluno</span><input id="em-busca" autocomplete="off" placeholder="Buscar pelo nome"></label></div><div class="group" id="em-res"></div>'}
    <div class="group">
      <label class="field"><span>Item</span><select id="em-item"><option value="kimono">Kimono</option><option value="faixa">Faixa</option></select></label>
      <label class="field" id="em-cor-wrap" hidden><span>Cor da faixa</span><select id="em-cor">${[...new Set([...D.FAIXAS_INFANTIL, ...D.FAIXAS_ADULTO])].map((f) => `<option>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Tamanho</span><select id="em-tam"></select></label>
    </div>
    <p class="hint" id="em-disp" style="margin-top:0"></p>
    <p class="alert" id="em-erro" role="alert"></p>
    <button class="btn" type="button" id="em-ok">Registrar empréstimo</button>`;

  abrirDialogo('Emprestar kimono ou faixa', '<div id="em-corpo" class="view"></div>', (dlg, fechar) => {
    const montar = () => {
      $('#em-corpo', dlg).innerHTML = corpo();
      animar($('#em-corpo', dlg));
      const item = $('#em-item', dlg), tam = $('#em-tam', dlg), cor = $('#em-cor', dlg);
      const tamanhos = () => {
        const lista = item.value === 'kimono' ? D.TAMANHOS_KIMONO : D.TAMANHOS_FAIXA;
        const atual = tam.value || (alvo && alvo.kimono) || '';
        tam.innerHTML = lista.map((t) => `<option${t === atual ? ' selected' : ''}>${t}</option>`).join('');
      };
      const disp = () => {
        $('#em-cor-wrap', dlg).hidden = item.value !== 'faixa';
        const n = D.disponivel(item.value, tam.value, cor.value);
        $('#em-disp', dlg).textContent = n > 0 ? `${plural(n, 'disponível', 'disponíveis')} nesse tamanho.` : 'Nenhum disponível nesse tamanho.';
      };
      item.addEventListener('change', () => { tamanhos(); disp(); });
      tam.addEventListener('change', disp);
      cor.addEventListener('change', disp);
      tamanhos(); disp();
      const busca = $('#em-busca', dlg);
      if (busca) {
        const desenhar = () => {
          const lista = D.buscarPorNome(busca.value).slice(0, 8);
          $('#em-res', dlg).innerHTML = lista.map((a) => linhaAluno(a)).join('');
          $$('[data-aluno]', dlg).forEach((b) => b.addEventListener('click', () => { alvo = D.aluno(b.dataset.aluno); montar(); }));
        };
        busca.addEventListener('input', desenhar);
        desenhar();
        busca.focus();
      }
      const troca = $('#em-troca', dlg);
      if (troca) troca.addEventListener('click', () => { alvo = null; montar(); });
      $('#em-ok', dlg).addEventListener('click', () => {
        if (!alvo) { $('#em-erro', dlg).textContent = 'Escolha o aluno.'; return; }
        try { D.emprestar(alvo.id, item.value, tam.value, cor.value, quem.nome); fechar(); aviso(`Empréstimo registrado para ${D.primeiroNome(alvo.nome)}`); if (depois) setTimeout(depois, 230); }
        catch (err) { $('#em-erro', dlg).textContent = err.message; }
      });
    };
    montar();
  });
}

function telaEmprestimos() {
  const abertos = D.emprestimosAbertos();
  const cobrar = abertos.filter(D.precisaCobrar);
  app().innerHTML = `
    ${cabecalho('Empréstimos', `${conta(abertos.length)} ${abertos.length === 1 ? 'item fora' : 'itens fora'} agora${cobrar.length ? `, ${conta(cobrar.length)} para cobrar` : ''}.`, '<button class="btn small" type="button" id="e-novo">Registrar empréstimo</button>')}
    <div class="group">${abertos.length ? abertos.map((e) => { const a = D.aluno(e.alunoId); if (!a) return ''; return `
      <div class="row"><button class="link" type="button" data-aluno="${a.id}" style="text-decoration:none;text-align:left"><span class="person">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${esc(itemTexto(e))}, desde ${esc(D.dataCurta(e.saida))}</small></span></span></button>
      <span style="display:flex;gap:12px;align-items:center">${D.precisaCobrar(e) ? '<span class="flag">Cobrar</span>' : ''}<button class="btn quiet small" type="button" data-dev="${e.id}">Devolver</button></span></div>`; }).join('') : vazio('Todos os kimonos e faixas estão no CTA.')}</div>
    <p class="hint" style="margin-top:0">Cobrar aparece quando o aluno está há ${D.DIAS_COBRAR} dias ou mais sem treinar com um item emprestado.</p>`;
  ligarAlunos();
  $('#e-novo').addEventListener('click', () => dialogoEmprestimo(null, ir));
  $$('[data-dev]').forEach((b) => b.addEventListener('click', () => { b.classList.add('done'); b.textContent = 'Devolvido'; explodir(b); D.devolver(b.dataset.dev); aviso('Devolução registrada'); setTimeout(ir, 550); }));
}

function telaEstoque() {
  const est = D.estoque().sort((a, b) => (a.item + (a.cor || '') + a.tamanho).localeCompare(b.item + (b.cor || '') + b.tamanho));
  const kim = est.filter((s) => s.item === 'kimono');
  const fx = est.filter((s) => s.item === 'faixa');
  const linha = (s) => { const d = D.disponivel(s.item, s.tamanho, s.cor); return `
    <button class="row" type="button" data-est='${esc(JSON.stringify(s))}'><span>${s.item === 'kimono' ? 'Kimono' : 'Faixa ' + esc(s.cor)} ${esc(s.tamanho)}<small>${s.total} no total</small></span><span class="v${d === 0 ? '' : ' k'}">${d === 0 ? '<span class="flag">Esgotado</span>' : plural(d, 'disponível', 'disponíveis')}</span><span class="chev" aria-hidden="true">›</span></button>`; };
  app().innerHTML = `
    ${cabecalho('Estoque', 'Quantos kimonos e faixas o CTA tem, por tamanho. Toque para ajustar.', '<button class="btn small" type="button" id="e-est">Adicionar ao estoque</button>')}
    <div class="split">
      <div class="view"><p class="section-label">Kimonos</p><div class="group">${kim.length ? kim.map(linha).join('') : vazio('Nenhum kimono cadastrado.')}</div></div>
      <div class="view"><p class="section-label">Faixas</p><div class="group">${fx.length ? fx.map(linha).join('') : vazio('Nenhuma faixa cadastrada.')}</div></div>
    </div>`;
  $$('[data-est]').forEach((b) => b.addEventListener('click', () => dialogoEstoque(JSON.parse(b.dataset.est))));
  $('#e-est').addEventListener('click', () => dialogoEstoque(null));
}

function dialogoEstoque(s) {
  abrirDialogo(s ? 'Ajustar estoque' : 'Adicionar ao estoque', `
    <div class="group">
      <label class="field"><span>Item</span><select id="s-item"${s ? ' disabled' : ''}><option value="kimono"${s && s.item === 'kimono' ? ' selected' : ''}>Kimono</option><option value="faixa"${s && s.item === 'faixa' ? ' selected' : ''}>Faixa</option></select></label>
      <label class="field" id="s-cor-wrap"><span>Cor da faixa</span><select id="s-cor"${s ? ' disabled' : ''}>${[...new Set([...D.FAIXAS_INFANTIL, ...D.FAIXAS_ADULTO])].map((f) => `<option${s && s.cor === f ? ' selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Tamanho</span><select id="s-tam"${s ? ' disabled' : ''}></select></label>
      <label class="field"><span>Quantidade total no CTA</span><input id="s-total" type="number" inputmode="numeric" min="0" step="1" value="${s ? s.total : 1}"></label>
    </div>
    <p class="hint" style="margin-top:0">Conte também os que estão emprestados. Zero tira o tamanho do estoque.</p>
    <button class="btn" type="button" id="s-ok">Salvar</button>`, (dlg, fechar) => {
    const item = $('#s-item', dlg), tam = $('#s-tam', dlg);
    const ajustar = () => {
      $('#s-cor-wrap', dlg).hidden = item.value !== 'faixa';
      const lista = item.value === 'kimono' ? D.TAMANHOS_KIMONO : D.TAMANHOS_FAIXA;
      tam.innerHTML = lista.map((t) => `<option${s && s.tamanho === t ? ' selected' : ''}>${t}</option>`).join('');
    };
    item.addEventListener('change', ajustar);
    ajustar();
    $('#s-ok', dlg).addEventListener('click', () => {
      D.definirEstoque(item.value, tam.value, item.value === 'faixa' ? $('#s-cor', dlg).value : null, $('#s-total', dlg).value);
      fechar(); aviso('Estoque atualizado'); ir();
    });
  });
}

// ---------- administração ----------

function telaEquipe() {
  const eq = D.equipe();
  app().innerHTML = `
    ${cabecalho('Equipe', 'Quem tem acesso ao painel. Todos podem fazer tudo.', '<button class="btn small" type="button" id="m-pessoa">Adicionar pessoa</button>')}
    <div class="group">${eq.map((p) => `<div class="row"><span class="person">${avatar({ nome: p.nome })}<span class="row-main">${esc(p.nome)}${p.id === quem.id ? ' <span class="k">(você)</span>' : ''}<small>${esc(p.login)}</small></span></span><button class="btn quiet small" type="button" data-senha="${p.id}">Redefinir senha</button></div>`).join('')}</div>
    <p class="hint" style="margin-top:0">O login @${CONFIG.dominioLogin} serve só para entrar no painel e não recebe e-mails. Quem esquecer a senha pede para outra pessoa da equipe redefinir aqui.</p>`;
  $('#m-pessoa').addEventListener('click', dialogoPessoa);
  $$('[data-senha]').forEach((b) => b.addEventListener('click', () => dialogoSenha(b.dataset.senha)));
}

function dialogoPessoa() {
  abrirDialogo('Adicionar pessoa ao painel', `
    <div class="group">
      <label class="field"><span>Nome</span><input id="p-nome" placeholder="Douglas Santos"></label>
      <label class="field"><span>Login</span><input id="p-login" type="email" placeholder="douglas@${CONFIG.dominioLogin}"></label>
      <label class="field"><span>Senha inicial</span><input id="p-senha" type="text" autocomplete="off" placeholder="Pelo menos 6 caracteres"></label>
    </div>
    <p class="hint" style="margin-top:0">Passe a senha para a pessoa pessoalmente.</p>
    <p class="alert" id="p-erro" role="alert"></p>
    <button class="btn" type="button" id="p-ok">Adicionar</button>`, (dlg, fechar) => {
    const nome = $('#p-nome', dlg), login = $('#p-login', dlg);
    let mexeu = false;
    login.addEventListener('input', () => { mexeu = true; });
    nome.addEventListener('input', () => { if (!mexeu) login.value = nome.value.trim() ? D.loginDe(nome.value) : ''; });
    $('#p-ok', dlg).addEventListener('click', async () => {
      try { await D.adicionarEquipe(nome.value, login.value, $('#p-senha', dlg).value); fechar(); aviso(`${D.primeiroNome(nome.value)} agora tem acesso ao painel`); ir(); }
      catch (err) { $('#p-erro', dlg).textContent = err.message; }
    });
  });
}

function dialogoSenha(id) {
  const p = D.equipe().find((x) => x.id === id);
  abrirDialogo(`Nova senha para ${D.primeiroNome(p.nome)}`, `
    <div class="group"><label class="field"><span>Nova senha</span><input id="ns" type="text" autocomplete="off" placeholder="Pelo menos 6 caracteres"></label></div>
    <p class="alert" id="ns-erro" role="alert"></p>
    <button class="btn" type="button" id="ns-ok">Salvar senha</button>`, (dlg, fechar) => {
    $('#ns-ok', dlg).addEventListener('click', async () => {
      try { await D.redefinirSenha(id, $('#ns', dlg).value); fechar(); aviso('Senha redefinida'); ir(); }
      catch (err) { $('#ns-erro', dlg).textContent = err.message; }
    });
  });
}

function telaAjustes() {
  app().innerHTML = `
    ${cabecalho('Ajustes', 'Sua conta e as regras do sistema.')}
    <div class="group">
      <div class="row"><span class="person">${avatar({ nome: quem.nome })}<span class="row-main">${esc(quem.nome)}<small>${esc(quem.login)}</small></span></span><button class="btn quiet small" type="button" id="m-sair">Sair</button></div>
      <div class="row"><span>Sua senha<small>Troque a senha inicial por uma que só você saiba</small></span><button class="btn quiet small" type="button" id="m-senha">Trocar senha</button></div>
    </div>
    <p class="section-label">Regras</p>
    <div class="group">
      <div class="row"><span>Alunos inativos<small>Quem passa ${D.DIAS_INATIVO} dias sem treinar</small></span><span class="v k">${D.DIAS_INATIVO} dias</span></div>
      <div class="row"><span>Aviso para cobrar<small>Aluno sem treinar com item emprestado</small></span><span class="v k">${D.DIAS_COBRAR} dias</span></div>
      <div class="row"><span>Check-in só dentro do CTA<small>${CONFIG.localCTA ? 'Ligado, pela localização do celular' : 'Desligado até o endereço do CTA ser configurado'}</small></span><span class="v k">${CONFIG.localCTA ? 'Ligado' : 'Desligado'}</span></div>
    </div>
    <p class="hint" style="margin-top:0">Os dados ficam no banco do CTA na internet e são os mesmos no programa, no painel pelo celular e no site.</p>`;
  $('#m-sair').addEventListener('click', sair);
  $('#m-senha').addEventListener('click', () => abrirDialogo('Trocar sua senha', `
    <div class="group">
      <label class="field"><span>Nova senha</span><input id="ms-1" type="password" autocomplete="new-password" placeholder="Pelo menos 6 caracteres"></label>
      <label class="field"><span>Repita a nova senha</span><input id="ms-2" type="password" autocomplete="new-password"></label>
    </div>
    <p class="alert" id="ms-erro" role="alert"></p>
    <button class="btn" type="button" id="ms-ok">Salvar senha</button>`, (dlg, fechar) => {
    $('#ms-ok', dlg).addEventListener('click', async () => {
      $('#ms-erro', dlg).textContent = '';
      if ($('#ms-1', dlg).value !== $('#ms-2', dlg).value) { $('#ms-erro', dlg).textContent = 'As duas senhas estão diferentes.'; return; }
      try { await D.trocarMinhaSenha($('#ms-1', dlg).value); fechar(); aviso('Senha trocada'); }
      catch (err) { $('#ms-erro', dlg).textContent = err.message; }
    });
  }));
}

// ---------- rotas ----------

const ROTAS = {
  hoje: telaHoje, numeros: telaNumeros, checkin: telaCheckin, frequencia: telaFrequencia, horarios: telaHorarios,
  alunos: telaAlunos, 'novo-aluno': telaNovoAluno, novos: telaNovos, inativos: telaInativos, graduacoes: telaGraduacoes, aniversarios: telaAniversarios,
  emprestimos: telaEmprestimos, estoque: telaEstoque, equipe: telaEquipe, ajustes: telaAjustes,
};

let rotaAtual = null;

function ir() {
  quem = D.usuario();
  if (!quem) { rotaAtual = null; telaEntrar(); return; }
  if (!$('#shell')) montarEstrutura();
  const pedida = (location.hash || '#hoje').slice(1);
  const rota = ROTAS[pedida] ? pedida : 'hoje';
  desenharMenu(rota);
  const mudou = rota !== rotaAtual;
  rotaAtual = rota;
  if (mudou) { trocarTela(app(), ROTAS[rota]); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else { ROTAS[rota](); animar(app()); }
}

// quando o banco muda (site, outro computador, outra pessoa), a tela atual se atualiza sozinha
let atualizarDepois = false;
function atualizarAoVivo() {
  if (!quem || !$('#shell')) return;
  const ocupado = $('.dialog-wrap') || (document.activeElement && document.activeElement.closest && document.activeElement.closest('#app input, #app textarea, #app select'));
  if (ocupado) { atualizarDepois = true; return; }
  atualizarDepois = false;
  desenharMenu(rotaAtual);
  ROTAS[rotaAtual]();
  animar(app());
}
D.aoMudar(atualizarAoVivo);
D.aoErro((m) => aviso(m, 'erro'));
document.addEventListener('click', () => { if (atualizarDepois) setTimeout(atualizarAoVivo, 400); });

montarFundo();
abertura('Painel do professor');
D.iniciar()
  .catch((err) => { aviso(err.message, 'erro'); })
  .finally(() => { window.addEventListener('hashchange', ir); ir(); });
