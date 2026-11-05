import * as D from './dados.js';
import { CONFIG } from './config.js';
import { esc, $, $$, avatar, faixa, textoFaixa, faixasPara, abrirDialogo, mascararCelular, marcarAba } from './ui.js';

const app = $('#app');
const abas = $('#abas');
let quem = null;
try { quem = JSON.parse(localStorage.getItem('cta-equipe') || 'null'); } catch (e) { quem = null; }
const guardar = () => { try { localStorage.setItem('cta-equipe', JSON.stringify(quem)); } catch (e) { /* sem armazenamento */ } };

const nomeModalidade = (id) => (D.MODALIDADES.find((m) => m.id === id) || {}).nome || id;
const listaModalidades = (ids) => ids.map(nomeModalidade).join(', ');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const itemTexto = (e) => (e.item === 'kimono' ? `Kimono ${e.tamanho}` : `Faixa ${e.cor} ${e.tamanho}`);

function topo(lado) {
  return `<header class="bar"><a class="wordmark" href="#hoje">CTA</a><span class="side">${esc(lado || '')}</span></header>`;
}

function linhaAluno(a, direita = '', sub = null) {
  return `<button class="row" type="button" data-aluno="${a.id}">
    <span class="person">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${esc(sub ?? listaModalidades(a.modalidades))}</small></span></span>
    ${direita}
  </button>`;
}

function ligarAlunos(raiz) { $$('[data-aluno]', raiz).forEach((b) => b.addEventListener('click', () => fichaAluno(b.dataset.aluno))); }

// ---------- entrar ----------

function telaEntrar() {
  $('#abas-wrap').hidden = true;
  app.innerHTML = `${topo('Painel')}
  <form class="view" id="login" novalidate style="max-width:520px;margin:0 auto">
    <h1>Painel do CTA</h1>
    <p class="hint">Para professores e equipe.</p>
    <div class="group">
      <label class="field"><span>Login</span><input id="l-user" type="email" autocomplete="username" placeholder="nome@${CONFIG.dominioLogin}"></label>
      <label class="field"><span>Senha</span><input id="l-senha" type="password" autocomplete="current-password"></label>
    </div>
    <p class="alert" id="l-erro" role="alert"></p>
    <button class="btn" type="submit">Entrar</button>
    <p class="hint" style="margin-top:0">Esqueceu a senha? Peça para outra pessoa da equipe redefinir.</p>
    ${CONFIG.modoTeste ? `<p class="test-note">Modo de teste: login teste@${CONFIG.dominioLogin}, senha tatame.</p>` : ''}
  </form>`;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      quem = await D.entrarEquipe($('#l-user').value, $('#l-senha').value);
      guardar();
      location.hash = '#hoje';
      ir();
    } catch (err) { $('#l-erro').textContent = err.message; }
  });
}

// ---------- hoje ----------

function telaHoje() {
  const hoje = D.checkinsDoDia();
  const ativos = D.alunos().filter(D.ativo).length;
  const cobrar = D.emprestimosAbertos().filter(D.precisaCobrar);
  const novos = D.alunos().filter((a) => D.diasEntre(a.criadoEm, D.hojeISO()) <= 7).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  const quando = (iso) => { const d = D.diasEntre(iso, D.hojeISO()); return d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };

  app.innerHTML = `${topo(`Olá, ${D.primeiroNome(quem.nome)}`)}
  <section class="view">
    <h1>Hoje</h1>
    <p class="hint">${plural(hoje.length, 'check-in', 'check-ins')} até agora, ${plural(ativos, 'aluno ativo', 'alunos ativos')}.</p>
    <div><button class="btn quiet small" type="button" id="h-ck">Fazer check-in de um aluno</button></div>
    <div class="split">
      <div class="view">
        <p class="section-label">Check-ins de hoje</p>
        <div class="group solid" id="h-lista">${hoje.length ? hoje.map((c) => { const a = D.aluno(c.alunoId); return a ? linhaAluno(a, `<span class="v k">${esc(c.hora)}</span>`, c.por ? `${listaModalidades(a.modalidades)}, marcado por ${c.por}` : null) : ''; }).join('') : '<p class="empty">Ninguém fez check-in ainda hoje.</p>'}</div>
      </div>
      <div class="view">
        <p class="section-label">Kimonos e faixas para cobrar</p>
        <div class="group solid" id="h-cobrar">${cobrar.length ? cobrar.map((e) => { const a = D.aluno(e.alunoId); const ult = D.ultimoTreino(e.alunoId); return a ? linhaAluno(a, '<span class="flag">Cobrar</span>', `${itemTexto(e)}, ${ult ? `último treino ${quando(ult)}` : 'sem treinos'}`) : ''; }).join('') : '<p class="empty">Ninguém com item emprestado sumiu dos treinos.</p>'}</div>
        <p class="section-label">Cadastros novos</p>
        <div class="group solid" id="h-novos">${novos.length ? novos.map((a) => linhaAluno(a, '', `${listaModalidades(a.modalidades)}, ${quando(a.criadoEm)}`)).join('') : '<p class="empty">Nenhum cadastro novo nesta semana.</p>'}</div>
      </div>
    </div>
  </section>`;
  ligarAlunos(app);
  $('#h-ck').addEventListener('click', () => escolherAluno('Check-in de um aluno', (a, fechar) => {
    if (!D.fazerCheckin(a.id, quem.nome)) return;
    fechar(); telaHoje();
  }, (a) => (D.fezHoje(a.id) ? '<span class="k">já fez hoje</span>' : '')));
}

function escolherAluno(titulo, aoEscolher, extra = () => '') {
  abrirDialogo(titulo, `<div class="group"><label class="field"><span>Buscar pelo nome</span><input id="b-txt" autocomplete="off" placeholder="Davi"></label></div><div class="group solid" id="b-res"></div>`, (dlg, fechar) => {
    const desenhar = () => {
      const lista = D.buscarPorNome($('#b-txt', dlg).value).slice(0, 30);
      $('#b-res', dlg).innerHTML = lista.length ? lista.map((a) => linhaAluno(a, extra(a))).join('') : '<p class="empty">Ninguém com esse nome.</p>';
      $$('[data-aluno]', dlg).forEach((b) => b.addEventListener('click', () => aoEscolher(D.aluno(b.dataset.aluno), fechar)));
    };
    $('#b-txt', dlg).addEventListener('input', desenhar);
    desenhar();
  });
}

// ---------- alunos ----------

let filtro = { texto: '', mod: '', situacao: 'ativos' };

function telaAlunos() {
  app.innerHTML = `${topo('Alunos')}
  <section class="view">
    <h1>Alunos</h1>
    <div class="group">
      <label class="field"><span>Buscar</span><input id="f-txt" autocomplete="off" placeholder="Nome do aluno" value="${esc(filtro.texto)}"></label>
      <label class="field"><span>Modalidade</span><select id="f-mod"><option value="">Todas</option>${D.MODALIDADES.map((m) => `<option value="${m.id}"${filtro.mod === m.id ? ' selected' : ''}>${m.nome}</option>`).join('')}</select></label>
      <label class="field"><span>Situação</span><select id="f-sit">
        <option value="ativos"${filtro.situacao === 'ativos' ? ' selected' : ''}>Ativos</option>
        <option value="inativos"${filtro.situacao === 'inativos' ? ' selected' : ''}>Inativos, ${D.DIAS_INATIVO} dias sem treinar</option>
        <option value="todos"${filtro.situacao === 'todos' ? ' selected' : ''}>Todos</option></select></label>
    </div>
    <p class="hint" id="a-conta" style="margin-top:0"></p>
    <div class="group solid" id="a-lista"></div>
  </section>`;
  const desenhar = () => {
    let lista = D.buscarPorNome(filtro.texto);
    if (filtro.mod) lista = lista.filter((a) => a.modalidades.includes(filtro.mod));
    if (filtro.situacao === 'ativos') lista = lista.filter(D.ativo);
    if (filtro.situacao === 'inativos') lista = lista.filter((a) => !D.ativo(a));
    $('#a-conta').textContent = plural(lista.length, 'aluno', 'alunos');
    $('#a-lista').innerHTML = lista.length ? lista.map((a) => {
      const g = a.graduacoes.jiujitsu;
      const ult = D.ultimoTreino(a.id);
      return linhaAluno(a, `<span class="v k">${ult ? D.dataCurta(ult) : 'sem treinos'}</span>`, `${listaModalidades(a.modalidades)}${g ? `, ${textoFaixa(g)}` : ''}`);
    }).join('') : '<p class="empty">Nenhum aluno com esses filtros.</p>';
    ligarAlunos($('#a-lista'));
  };
  $('#f-txt').addEventListener('input', (e) => { filtro.texto = e.target.value; desenhar(); });
  $('#f-mod').addEventListener('change', (e) => { filtro.mod = e.target.value; desenhar(); });
  $('#f-sit').addEventListener('change', (e) => { filtro.situacao = e.target.value; desenhar(); });
  desenhar();
}

function fichaAluno(id) {
  const a = D.aluno(id);
  if (!a) return;
  const i = D.idade(a.nascimento);
  const g = a.graduacoes.jiujitsu;
  const itens = D.emprestimosDe(a.id);
  const ult = D.ultimoTreino(a.id);
  const cel = (d) => (d ? D.formatarCelular(d) : '');
  const telaAtual = () => ir();

  abrirDialogo(a.nome, `
    <div class="person">${avatar(a)}<span class="row-main">${esc(listaModalidades(a.modalidades))}<small>${D.ativo(a) ? 'Ativo' : 'Inativo'}, ${ult ? `último treino em ${D.dataCurta(ult)}` : 'sem treinos'}, ${plural(D.treinosNoMes(a.id), 'treino', 'treinos')} no mês</small></span></div>
    <div><button class="btn small" type="button" id="fa-ck"${D.fezHoje(a.id) ? ' disabled' : ''}>${D.fezHoje(a.id) ? 'Já fez check-in hoje' : 'Fazer check-in'}</button></div>

    ${a.modalidades.includes('jiujitsu') ? `
    <p class="section-label">Jiu-jitsu</p>
    <div class="group">
      ${g ? `<div class="row" style="display:block">${faixa(g)}<small style="margin-top:8px">${esc(textoFaixa(g))} desde ${esc(D.dataCurta(g.data))}${g.por ? `, por ${esc(g.por)}` : ''}</small></div>` : ''}
      <label class="field"><span>Faixa</span><select id="fa-faixa">${faixasPara(D.infantil(a)).map((f) => `<option${g && g.faixa === f ? ' selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Graus</span><select id="fa-graus">${[0, 1, 2, 3, 4].map((n) => `<option${g && g.graus === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="row"><button class="btn quiet small" type="button" id="fa-grad">Salvar graduação</button></div>
    </div>` : ''}

    <p class="section-label">Kimonos e faixas com ${esc(D.primeiroNome(a.nome))}</p>
    <div class="group">${itens.length ? itens.map((e) => `<div class="row"><span>${esc(itemTexto(e))}<small>desde ${esc(D.dataCurta(e.saida))}</small></span><button class="btn quiet small" type="button" data-dev="${e.id}">Devolver</button></div>`).join('') : '<p class="empty">Nenhum item emprestado.</p>'}
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
    const recarregar = () => { fechar(); telaAtual(); fichaAluno(id); };
    $('#fa-ck', dlg).addEventListener('click', () => { D.fazerCheckin(a.id, quem.nome); recarregar(); });
    const grad = $('#fa-grad', dlg);
    if (grad) grad.addEventListener('click', () => { D.definirGraduacao(a.id, $('#fa-faixa', dlg).value, $('#fa-graus', dlg).value, quem.nome); recarregar(); });
    $$('[data-dev]', dlg).forEach((b) => b.addEventListener('click', () => { D.devolver(b.dataset.dev); recarregar(); }));
    $('#fa-emp', dlg).addEventListener('click', () => { fechar(); dialogoEmprestimo(a, () => { telaAtual(); fichaAluno(id); }); });
    $('#fa-pinok', dlg).addEventListener('click', async () => {
      try { await D.redefinirPin(a.id, $('#fa-pin', dlg).value); $('#fa-pin', dlg).value = ''; $('#fa-pinmsg', dlg).textContent = 'PIN redefinido. Avise o aluno.'; }
      catch (err) { $('#fa-pinmsg', dlg).innerHTML = `<span class="flag">${esc(err.message)}</span>`; }
    });
  });
}

// ---------- empréstimos ----------

function dialogoEmprestimo(alunoFixo, depois) {
  let alvo = alunoFixo || null;
  const corpo = () => `
    ${alvo ? `<div class="group"><div class="row"><span class="person">${avatar(alvo)}<span>${esc(alvo.nome)}</span></span>${alunoFixo ? '' : '<button class="link" type="button" id="em-troca">Trocar</button>'}</div></div>`
      : '<div class="group"><label class="field"><span>Aluno</span><input id="em-busca" autocomplete="off" placeholder="Buscar pelo nome"></label></div><div class="group solid" id="em-res"></div>'}
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
        try { D.emprestar(alvo.id, item.value, tam.value, cor.value, quem.nome); fechar(); if (depois) depois(); }
        catch (err) { $('#em-erro', dlg).textContent = err.message; }
      });
    };
    montar();
  });
}

function telaEmprestimos() {
  const abertos = D.emprestimosAbertos();
  const est = D.estoque().sort((a, b) => (a.item + (a.cor || '') + a.tamanho).localeCompare(b.item + (b.cor || '') + b.tamanho));
  app.innerHTML = `${topo('Empréstimos')}
  <section class="view">
    <h1>Empréstimos</h1>
    <p class="hint">${plural(abertos.length, 'item fora', 'itens fora')} agora.</p>
    <div><button class="btn small" type="button" id="e-novo">Registrar empréstimo</button></div>
    <div class="split">
      <div class="view">
        <p class="section-label">Com os alunos</p>
        <div class="group solid">${abertos.length ? abertos.map((e) => { const a = D.aluno(e.alunoId); if (!a) return ''; const cobrar = D.precisaCobrar(e); return `
          <div class="row"><button class="link" type="button" data-aluno="${a.id}" style="text-decoration:none;text-align:left"><span class="person">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${esc(itemTexto(e))}, desde ${esc(D.dataCurta(e.saida))}</small></span></span></button>
          <span style="display:flex;gap:10px;align-items:center">${cobrar ? '<span class="flag">Cobrar</span>' : ''}<button class="btn quiet small" type="button" data-dev="${e.id}">Devolver</button></span></div>`; }).join('') : '<p class="empty">Todos os kimonos e faixas estão no CTA.</p>'}</div>
        <p class="hint" style="margin-top:8px">Cobrar aparece quando o aluno está há ${D.DIAS_COBRAR} dias ou mais sem treinar com um item emprestado.</p>
      </div>
      <div class="view">
        <p class="section-label">Estoque</p>
        <div class="group solid">${est.length ? est.map((s) => `
          <button class="row" type="button" data-est='${esc(JSON.stringify(s))}'><span>${s.item === 'kimono' ? 'Kimono' : 'Faixa ' + esc(s.cor)} ${esc(s.tamanho)}<small>${plural(s.total, 'no total', 'no total')}</small></span><span class="v">${plural(D.disponivel(s.item, s.tamanho, s.cor), 'disponível', 'disponíveis')}</span></button>`).join('') : '<p class="empty">O estoque ainda não foi cadastrado.</p>'}
          <div class="row"><button class="btn quiet small" type="button" id="e-est">Adicionar ao estoque</button></div></div>
      </div>
    </div>
  </section>`;
  ligarAlunos(app);
  $('#e-novo').addEventListener('click', () => dialogoEmprestimo(null, telaEmprestimos));
  $$('[data-dev]').forEach((b) => b.addEventListener('click', () => { D.devolver(b.dataset.dev); telaEmprestimos(); }));
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
      fechar(); telaEmprestimos();
    });
  });
}

// ---------- números ----------

function telaNumeros() {
  const ativos = D.alunos().filter(D.ativo);
  const meses = D.checkinsPorMes(6);
  const maior = Math.max(1, ...meses.map((m) => m.total));
  const top = D.maisFrequentes(5);
  const mesAtual = D.nomeMes(new Date().getMonth());
  app.innerHTML = `${topo('Números')}
  <section class="view">
    <h1>Números</h1>
    <p class="hint">${plural(ativos.length, 'aluno ativo', 'alunos ativos')} de ${D.alunos().length} cadastrados. Ativo é quem treinou nos últimos ${D.DIAS_INATIVO} dias.</p>
    <div class="split">
      <div class="view">
        <p class="section-label">Ativos por modalidade</p>
        <div class="group solid">${D.MODALIDADES.map((m) => `<div class="row"><span>${m.nome}</span><span class="v">${ativos.filter((a) => a.modalidades.includes(m.id)).length}</span></div>`).join('')}</div>
        <p class="section-label">Check-ins por mês</p>
        <div class="group solid"><div class="bars">${meses.map((m) => `
          <div class="barline"><span>${D.nomeMes(m.mes).slice(0, 3)}</span><span class="track"><span class="fill" style="width:${Math.round((m.total / maior) * 100)}%;display:block"></span></span><span class="n">${m.total}</span></div>`).join('')}</div></div>
      </div>
      <div class="view">
        <p class="section-label">Quem mais treinou em ${mesAtual}</p>
        <div class="group solid" id="n-top">${top.length ? top.map((t) => linhaAluno(t.aluno, `<span class="v">${plural(t.n, 'treino', 'treinos')}</span>`)).join('') : '<p class="empty">Ainda sem check-ins neste mês.</p>'}</div>
      </div>
    </div>
  </section>`;
  ligarAlunos(app);
}

// ---------- mais: horários, equipe ----------

function telaMais() {
  const hs = D.horarios();
  const eq = D.equipe();
  app.innerHTML = `${topo(quem.login)}
  <section class="view">
    <h1>Mais</h1>
    <div class="split">
      <div class="view">
        <p class="section-label">Horários publicados no site</p>
        <div class="group solid">${hs.length ? hs.map((h) => `<div class="row"><span>${esc(h.dia)}, ${esc(h.inicio)} às ${esc(h.fim)}<small>${esc(nomeModalidade(h.modalidade))}${h.turma ? `, ${esc(h.turma)}` : ''}</small></span><button class="btn quiet small" type="button" data-hdel="${h.id}">Tirar</button></div>`).join('') : '<p class="empty">Nenhum horário cadastrado.</p>'}
          <div class="row"><button class="btn quiet small" type="button" id="m-hora">Adicionar horário</button></div></div>
      </div>
      <div class="view">
        <p class="section-label">Equipe com acesso ao painel</p>
        <div class="group solid">${eq.map((p) => `<div class="row"><span>${esc(p.nome)}<small>${esc(p.login)}</small></span><button class="btn quiet small" type="button" data-senha="${p.id}">Redefinir senha</button></div>`).join('')}
          <div class="row"><button class="btn quiet small" type="button" id="m-pessoa">Adicionar pessoa</button></div></div>
        <p class="section-label">Sua sessão</p>
        <div class="group solid">
          <div class="row"><span>${esc(quem.nome)}<small>${esc(quem.login)}</small></span><button class="btn quiet small" type="button" id="m-sair">Sair</button></div>
          ${CONFIG.modoTeste ? '<div class="row"><span>Dados de teste<small>Apaga tudo deste aparelho e volta ao exemplo</small></span><button class="btn quiet small" type="button" id="m-reset">Recomeçar</button></div>' : ''}
        </div>
      </div>
    </div>
  </section>`;
  $$('[data-hdel]').forEach((b) => b.addEventListener('click', () => { D.removerHorario(b.dataset.hdel); telaMais(); }));
  $('#m-hora').addEventListener('click', dialogoHorario);
  $('#m-pessoa').addEventListener('click', dialogoPessoa);
  $$('[data-senha]').forEach((b) => b.addEventListener('click', () => dialogoSenha(b.dataset.senha)));
  $('#m-sair').addEventListener('click', () => { quem = null; guardar(); ir(); });
  const reset = $('#m-reset');
  if (reset) reset.addEventListener('click', () => abrirDialogo('Recomeçar os dados de teste', '<p class="hint" style="margin:0">Tudo o que foi feito neste aparelho some e o exemplo volta ao começo.</p><button class="btn" type="button" id="r-ok">Recomeçar</button>', (dlg, fechar) => {
    $('#r-ok', dlg).addEventListener('click', async () => { await D.recomecarTeste(); fechar(); location.hash = '#hoje'; ir(); });
  }));
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
      try { D.adicionarHorario({ dia: $('#ho-dia', dlg).value, inicio: $('#ho-ini', dlg).value, fim: $('#ho-fim', dlg).value, modalidade: $('#ho-mod', dlg).value, turma: $('#ho-turma', dlg).value }); fechar(); telaMais(); }
      catch (err) { $('#ho-erro', dlg).textContent = err.message; }
    });
  });
}

function dialogoPessoa() {
  abrirDialogo('Adicionar pessoa ao painel', `
    <div class="group">
      <label class="field"><span>Nome</span><input id="p-nome" placeholder="Douglas Santos"></label>
      <label class="field"><span>Login</span><input id="p-login" type="email" placeholder="douglas@${CONFIG.dominioLogin}"></label>
      <label class="field"><span>Senha inicial</span><input id="p-senha" type="text" autocomplete="off" placeholder="Pelo menos 6 caracteres"></label>
    </div>
    <p class="hint" style="margin-top:0">O login é só para entrar no painel, não recebe e-mails. Passe a senha para a pessoa pessoalmente.</p>
    <p class="alert" id="p-erro" role="alert"></p>
    <button class="btn" type="button" id="p-ok">Adicionar</button>`, (dlg, fechar) => {
    const nome = $('#p-nome', dlg), login = $('#p-login', dlg);
    let mexeu = false;
    login.addEventListener('input', () => { mexeu = true; });
    nome.addEventListener('input', () => { if (!mexeu) login.value = nome.value.trim() ? D.loginDe(nome.value) : ''; });
    $('#p-ok', dlg).addEventListener('click', async () => {
      try { await D.adicionarEquipe(nome.value, login.value, $('#p-senha', dlg).value); fechar(); telaMais(); }
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
      try { await D.redefinirSenha(id, $('#ns', dlg).value); fechar(); telaMais(); }
      catch (err) { $('#ns-erro', dlg).textContent = err.message; }
    });
  });
}

// ---------- rotas ----------

const ROTAS = { hoje: telaHoje, alunos: telaAlunos, emprestimos: telaEmprestimos, numeros: telaNumeros, mais: telaMais };

function ir() {
  if (!quem || !D.equipe().some((p) => p.id === quem.id)) { quem = null; guardar(); telaEntrar(); return; }
  $('#abas-wrap').hidden = false;
  const rota = (location.hash || '#hoje').slice(1);
  marcarAba(abas, ROTAS[rota] ? rota : 'hoje');
  (ROTAS[rota] || telaHoje)();
}

D.iniciar().then(() => { window.addEventListener('hashchange', () => { ir(); window.scrollTo(0, 0); }); ir(); });
