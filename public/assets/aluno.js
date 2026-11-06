import * as D from './dados.js';
import { CONFIG } from './config.js';
import { esc, $, $$, avatar, faixa, textoFaixa, mascararCelular, marcarAba, montarFundo, animar, trocarTela, abertura, explodir, aviso } from './ui.js';

const app = $('#app');
const abas = $('#abas');
let conta = null;

const nomeModalidade = (id) => (D.MODALIDADES.find((m) => m.id === id) || {}).nome || id;
const listaModalidades = (ids) => ids.map(nomeModalidade).join(', ');

function topo(lado) {
  const h = new Date();
  const texto = lado || `${D.DIAS[(h.getDay() + 6) % 7]}, ${D.dataCurta(D.hojeISO())}`;
  return `<header class="bar"><a class="wordmark" href="#checkin">CTA</a><span class="side">${esc(texto)}</span></header>`;
}


// ---------- check-in ----------

function telaCheckin() {
  app.innerHTML = `${topo()}
  <section class="view">
    <h1>Check-in</h1>
    <p class="hint">Um por dia, feito aqui no CTA.</p>
    <div class="group"><label class="field"><span>Celular</span><input id="ck-cel" class="big" type="tel" inputmode="numeric" autocomplete="tel" placeholder="(11) 90000-0000"></label></div>
    <div id="ck-res" class="stack"></div>
    <div id="ck-acao" class="stack"></div>
  </section>`;
  const cel = $('#ck-cel');
  mascararCelular(cel, D.formatarCelular);
  let escolhido = null;
  let chave = '';
  let lista = [];
  let buscado = '';
  let espera = null;

  const desenhar = () => {
    const res = $('#ck-res');
    const acao = $('#ck-acao');
    if (D.soDigitos(cel.value).length < 10) { res.innerHTML = ''; acao.innerHTML = ''; escolhido = null; chave = ''; return; }
    if (lista.length === 0) {
      res.innerHTML = '<p class="alert">Não achamos cadastro com esse celular.</p>';
      acao.innerHTML = '<a class="btn quiet" href="#cadastro">Fazer cadastro</a>';
      escolhido = null;
      if (chave !== 'nada') { chave = 'nada'; animar(res); animar(acao); }
      return;
    }
    if (!escolhido || !lista.some((a) => a.id === escolhido)) escolhido = lista.length === 1 ? lista[0].id : null;
    res.innerHTML = `${lista.length > 1 ? '<p class="section-label">Quem vai treinar?</p>' : ''}<div class="group">${lista.map((a) => `
      <button class="row" type="button" data-id="${a.id}" aria-pressed="${a.id === escolhido}">
        <span class="person">${avatar(a)}<span class="row-main">${esc(a.nome)}<small>${esc(listaModalidades(a.modalidades))}</small></span></span>
        <span class="marcado" aria-hidden="true">${a.id === escolhido ? '✓' : ''}</span>
      </button>`).join('')}</div>`;
    const nova = lista.map((x) => x.id).join(',');
    if (nova !== chave) { chave = nova; animar(res); }
    $$('[data-id]', res).forEach((b) => b.addEventListener('click', () => { escolhido = b.dataset.id; desenhar(); animar(acao); }));

    const a = escolhido && lista.find((x) => x.id === escolhido);
    if (!a) { acao.innerHTML = ''; return; }
    if (a.jaFez) {
      acao.innerHTML = `<p class="ok-text">${esc(D.primeiroNome(a.nome))}, sua presença de hoje já está registrada.</p>`;
      return;
    }
    acao.innerHTML = '<button class="btn" type="button" id="ck-ok">Confirmar presença</button><p class="hint" id="ck-msg" style="margin-top:-8px"></p>';
    $('#ck-ok').addEventListener('click', async (ev) => {
      const b = ev.currentTarget;
      b.disabled = true; b.textContent = 'Conferindo a localização';
      const local = await D.conferirLocal();
      if (!local.ok) { b.disabled = false; b.textContent = 'Confirmar presença'; $('#ck-msg').innerHTML = `<span class="alert">${esc(local.motivo)}</span>`; return; }
      b.textContent = 'Registrando';
      try {
        await D.site.checkin(cel.value, a.id);
      } catch (err) {
        b.disabled = false; b.textContent = 'Confirmar presença';
        $('#ck-msg').innerHTML = `<span class="alert">${esc(err.message)}</span>`;
        return;
      }
      a.jaFez = true;
      const agora = new Date();
      b.classList.add('done');
      b.textContent = `${D.primeiroNome(a.nome)}, presença registrada`;
      explodir(b);
      aviso('Presença registrada. Bom treino.');
      $('#ck-msg').textContent = `Às ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}. Bom treino.`;
    });
  };

  const aoDigitar = () => {
    const d = D.soDigitos(cel.value);
    clearTimeout(espera);
    if (d.length < 10) { lista = []; buscado = ''; desenhar(); return; }
    if (d === buscado) return;
    espera = setTimeout(async () => {
      buscado = d;
      $('#ck-acao').innerHTML = '<p class="hint" style="margin:0">Procurando seu cadastro</p>';
      try { lista = await D.site.buscar(d); }
      catch (err) { lista = []; $('#ck-res').innerHTML = `<p class="alert">${esc(err.message)}</p>`; $('#ck-acao').innerHTML = ''; buscado = ''; return; }
      if (D.soDigitos(cel.value) === d) desenhar();
    }, 250);
  };
  cel.addEventListener('input', aoDigitar);
  cel.focus();
}

// ---------- cadastro ----------

const TERMO = `
<p>Declaro que participo por livre vontade dos treinos de boxe, jiu-jitsu e muay thai oferecidos gratuitamente pelo CTA, Centro de Treinamento de Alphaville, projeto ligado à igreja.</p>
<p>Sei que artes marciais e esportes de contato envolvem risco de lesão e declaro estar em condições de saúde adequadas para treinar. Vou informar aos professores qualquer problema de saúde, lesão ou restrição médica.</p>
<p>Vou seguir as orientações dos professores e as regras de convivência do CTA, e devolver em bom estado os kimonos e faixas que pegar emprestados.</p>
<p>Autorizo o CTA a guardar os dados deste cadastro, usados só para organizar os treinos, o check-in e os empréstimos, sem compartilhar com mais ninguém. Posso pedir a exclusão dos meus dados quando quiser.</p>
<p>Para menores de 18 anos: como responsável legal, autorizo a participação do menor cadastrado e assumo estas declarações em nome dele.</p>`;

function telaCadastro() {
  app.innerHTML = `${topo('Cadastro')}
  <form class="view" id="cad" novalidate>
    <h1>Cadastro</h1>
    <p class="hint">Leva uns dois minutos. Depois disso, é só fazer o check-in quando chegar.</p>

    <div class="group">
      <label class="field"><span>Nome completo</span><input id="c-nome" autocomplete="name" placeholder="Lucas Silva"></label>
      <label class="field"><span>Data de nascimento</span><input id="c-nasc" type="date" max="${D.hojeISO()}"></label>
      <label class="field"><span id="c-cel-rot">Celular com WhatsApp</span><input id="c-cel" type="tel" inputmode="numeric" autocomplete="tel" placeholder="(11) 90000-0000"></label>
    </div>

    <div id="c-resp" hidden>
      <p class="section-label">Responsável</p>
      <div class="group">
        <label class="field"><span>Nome do responsável</span><input id="c-rnome" placeholder="Patrícia Oliveira"></label>
        <label class="field"><span>Celular do responsável</span><input id="c-rcel" type="tel" inputmode="numeric" placeholder="(11) 90000-0000"></label>
      </div>
      <p class="hint" style="margin-top:8px">O check-in pode ser feito com esse celular. Irmãos podem usar o mesmo número.</p>
    </div>

    <p class="section-label">Modalidades</p>
    <div class="group"><div class="checks">${D.MODALIDADES.map((m) => `<label class="check"><input type="checkbox" name="mod" value="${m.id}">${m.nome}</label>`).join('')}</div></div>

    <p class="section-label">Contato de emergência</p>
    <div class="group">
      <label class="field"><span>Nome</span><input id="c-enome" placeholder="Maria Silva"></label>
      <label class="field"><span>Telefone</span><input id="c-ecel" type="tel" inputmode="numeric" placeholder="(11) 90000-0000"></label>
    </div>

    <p class="section-label">Para os professores saberem</p>
    <div class="group">
      <label class="field"><span>Tamanho do kimono, se souber</span><select id="c-kim"><option value="">Não sei</option>${D.TAMANHOS_KIMONO.map((t) => `<option>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Problema de saúde ou lesão</span><textarea id="c-saude" rows="2" placeholder="Opcional"></textarea></label>
      <label class="field"><span>Foto para a carteirinha</span><input id="c-foto" type="file" accept="image/*"></label>
    </div>

    <p class="section-label">PIN da sua conta</p>
    <div class="group">
      <label class="field"><span>Crie um PIN de 4 números</span><input id="c-pin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
      <label class="field"><span>Repita o PIN</span><input id="c-pin2" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
    </div>
    <p class="hint" style="margin-top:8px">Com o celular e o PIN você vê sua carteirinha e seus treinos.</p>

    <p class="section-label">Termo de responsabilidade</p>
    <div class="group">
      <div class="term">${TERMO}</div>
      <div class="row"><label class="check" style="background:none;padding:0"><input type="checkbox" id="c-termo">Li e aceito o termo</label></div>
    </div>

    <p class="alert" id="c-erro" role="alert"></p>
    <button class="btn" type="submit" id="c-ok">Concluir cadastro</button>
  </form>`;

  ['#c-cel', '#c-rcel', '#c-ecel'].forEach((s) => mascararCelular($(s), D.formatarCelular));
  const ajustarMenor = () => {
    const i = D.idade($('#c-nasc').value);
    const menor = i !== null && i < 18;
    $('#c-resp').hidden = !menor;
    $('#c-cel-rot').textContent = menor ? 'Celular do aluno, se tiver' : 'Celular com WhatsApp';
  };
  $('#c-nasc').addEventListener('change', ajustarMenor);

  let foto = null;
  $('#c-foto').addEventListener('change', async (e) => { foto = e.target.files[0] ? await reduzirFoto(e.target.files[0]) : null; });

  $('#cad').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erro = $('#c-erro');
    erro.textContent = '';
    if ($('#c-pin').value !== $('#c-pin2').value) { erro.textContent = 'Os dois PINs estão diferentes.'; return; }
    const b = $('#c-ok');
    b.disabled = true;
    try {
      const novo = await D.cadastrar({
        nome: $('#c-nome').value,
        nascimento: $('#c-nasc').value,
        celular: $('#c-cel').value,
        responsavel: { nome: $('#c-rnome').value, celular: $('#c-rcel').value },
        modalidades: $$('input[name="mod"]:checked').map((x) => x.value),
        emergencia: { nome: $('#c-enome').value, celular: $('#c-ecel').value },
        kimono: $('#c-kim').value,
        saude: $('#c-saude').value,
        foto,
        pin: $('#c-pin').value,
        termo: $('#c-termo').checked,
      });
      app.innerHTML = `${topo('Cadastro')}<section class="view">
        <h1>Pronto, ${esc(D.primeiroNome(novo.nome))}</h1>
        <p class="hint">Seu cadastro está feito. Quando chegar no CTA, é só fazer o check-in com o celular${novo.responsavel ? ' do responsável' : ''}.</p>
        <a class="btn" href="#checkin">Ir para o check-in</a>
      </section>`;
      animar(app);
      setTimeout(() => explodir($('#app h1')), 350);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      erro.textContent = err.message;
      b.disabled = false;
      erro.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
}

function reduzirFoto(arquivo) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const lado = 320;
      const esc2 = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * esc2); c.height = Math.round(img.height * esc2);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ---------- minha conta ----------

function telaConta() {
  if (conta && conta.lista.length) {
    const atual = conta.lista.find((x) => x.id === conta.atual) || conta.lista[0];
    return mostrarCarteirinha(atual, conta.lista);
  }
  app.innerHTML = `${topo('Minha conta')}
  <form class="view" id="entrar" novalidate>
    <h1>Minha conta</h1>
    <p class="hint">Entre com o celular do cadastro e o seu PIN.</p>
    <div class="group">
      <label class="field"><span>Celular</span><input id="e-cel" class="big" type="tel" inputmode="numeric" autocomplete="tel" placeholder="(11) 90000-0000"></label>
      <label class="field"><span>PIN</span><input id="e-pin" class="big" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password"></label>
    </div>
    <p class="alert" id="e-erro" role="alert"></p>
    <button class="btn" type="submit" id="e-ok">Entrar</button>
  </form>`;
  mascararCelular($('#e-cel'), D.formatarCelular);
  $('#entrar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('#e-ok');
    $('#e-erro').textContent = '';
    b.disabled = true; b.textContent = 'Entrando';
    try {
      const lista = await D.site.conta($('#e-cel').value, $('#e-pin').value);
      conta = { lista, atual: lista[0].id };
      trocarTela(app, telaConta);
    } catch (err) {
      b.disabled = false; b.textContent = 'Entrar';
      requestAnimationFrame(() => { $('#e-erro').textContent = err.message; });
    }
  });
}

function mostrarCarteirinha(a, lista) {
  const g = a.graduacao;
  const mes = D.nomeMes(new Date().getMonth());
  app.innerHTML = `${topo('Minha conta')}
  <section class="view">
    ${lista.length > 1 ? `<div class="group"><label class="field"><span>Ver a conta de</span><select id="troca">${lista.map((x) => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label></div>` : ''}
    <div class="idcard">
      <div class="idtop"><span class="wordmark">CTA Alphaville</span><span>Aluno</span></div>
      <div class="idmain">
        <div class="photo">${a.foto ? `<img src="${esc(a.foto)}" alt="Foto de ${esc(a.nome)}">` : esc(a.nome.trim()[0])}</div>
        <div><h2>${esc(a.nome)}</h2><p>Desde ${esc(D.mesAno(a.criadoEm))}</p><p>${esc(listaModalidades(a.modalidades))}</p></div>
      </div>
      ${g ? `${faixa(g)}<p class="belt-label">Jiu-jitsu, ${esc(textoFaixa(g))}</p>` : ''}
    </div>

    <p class="section-label">${mes[0].toUpperCase() + mes.slice(1)}</p>
    <div class="group">
      <div class="row"><span class="k">Treinos no mês</span><span class="v">${a.treinosNoMes}</span></div>
      ${a.emprestimos.length ? a.emprestimos.map((e) => `<div class="row"><span class="k">Com você</span><span class="v">${e.item === 'kimono' ? 'Kimono' : 'Faixa ' + esc(e.cor)} ${esc(e.tamanho)}<small>desde ${esc(D.dataCurta(e.saida))}</small></span></div>`).join('') : '<div class="row"><span class="k">Com você</span><span class="v">Nenhum kimono ou faixa</span></div>'}
    </div>

    <p class="section-label">Últimos treinos</p>
    <div class="group">${a.ultimos.length ? a.ultimos.map((c) => `<div class="row"><span>${esc(D.dataCurta(c.data))}</span><span class="v k">${esc(c.hora)}</span></div>`).join('') : '<p class="empty">Ainda sem treinos registrados.</p>'}</div>

    <button class="btn quiet" type="button" id="sair">Sair</button>
  </section>`;
  const troca = $('#troca');
  if (troca) troca.addEventListener('change', () => { conta.atual = troca.value; trocarTela(app, telaConta); });
  $('#sair').addEventListener('click', () => { conta = null; trocarTela(app, telaConta); });
}

// ---------- horários ----------

function telaHorarios() {
  app.innerHTML = `${topo('Horários')}
  <section class="view">
    <h1>Horários</h1>
    <p class="hint">Treinos gratuitos. Chegue uns minutos antes para fazer o check-in.</p>
    <div id="grade" class="stack"><div class="group"><p class="empty">Carregando a grade</p></div></div>
  </section>`;
  D.site.horarios().then((lista) => {
    const g = $('#grade');
    if (!g) return;
    const porDia = D.DIAS.map((d) => ({ dia: d, aulas: lista.filter((h) => h.dia === d) })).filter((x) => x.aulas.length);
    g.innerHTML = porDia.length ? porDia.map((d) => `<p class="section-label">${d.dia}</p><div class="group">${d.aulas.map((h) => `
      <div class="row"><span>${esc(nomeModalidade(h.modalidade))}${h.turma ? `<small>${esc(h.turma)}</small>` : ''}</span><span class="v">${esc(h.inicio)} às ${esc(h.fim)}</span></div>`).join('')}</div>`).join('')
      : '<div class="group"><p class="empty">A grade de horários ainda não foi publicada.</p></div>';
    animar(g);
  }).catch((err) => { const g = $('#grade'); if (g) g.innerHTML = `<p class="alert">${esc(err.message)}</p>`; });
}

// ---------- rotas ----------

const ROTAS = { checkin: telaCheckin, cadastro: telaCadastro, conta: telaConta, horarios: telaHorarios };

function ir() {
  const rota = (location.hash || '#checkin').slice(1);
  const tela = ROTAS[rota] || telaCheckin;
  marcarAba(abas, ROTAS[rota] ? rota : 'checkin');
  trocarTela(app, tela);
}

montarFundo();
abertura('Centro de Treinamento de Alphaville');
if (document.fonts) document.fonts.ready.then(() => marcarAba(abas, (location.hash || '#checkin').slice(1)));
window.addEventListener('resize', () => marcarAba(abas, (location.hash || '#checkin').slice(1)));
window.addEventListener('hashchange', () => { ir(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
ir();
