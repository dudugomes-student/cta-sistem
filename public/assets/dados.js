// Camada de dados do CTA, ligada ao Supabase.
//
// Painel: a equipe entra com login e senha, o painel carrega os dados permitidos para a equipe,
// guarda uma cópia em memória para as telas lerem na hora e escuta o banco em tempo real
// (cadastros e check-ins feitos pelo site aparecem sozinhos). Cada alteração vai para o banco
// na hora; se o banco recusar, a cópia é recarregada e um aviso aparece.
//
// Site: os alunos não leem tabelas. Tudo passa pelas funções do banco (check-in, cadastro e conta),
// que devolvem só o necessário.

import { CONFIG } from './config.js';

export const MODALIDADES = [
  { id: 'jiujitsu', nome: 'Jiu-jitsu' },
  { id: 'boxe', nome: 'Boxe' },
  { id: 'muaythai', nome: 'Muay thai' },
];
export const FAIXAS_ADULTO = ['branca', 'azul', 'roxa', 'marrom', 'preta'];
export const FAIXAS_INFANTIL = ['branca', 'cinza', 'amarela', 'laranja', 'verde'];
export const TAMANHOS_KIMONO = ['M00', 'M0', 'M1', 'M2', 'M3', 'M4', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
export const TAMANHOS_FAIXA = ['M0', 'M1', 'M2', 'M3', 'M4', 'A0', 'A1', 'A2', 'A3', 'A4'];
export const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const DIAS_INATIVO = 60;
export const DIAS_COBRAR = 21;

// ---------- utilidades ----------

export function soDigitos(s) { return String(s || '').replace(/\D/g, ''); }

export function formatarCelular(s) {
  const d = soDigitos(s).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function hojeISO(base = new Date()) {
  const d = new Date(base);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function diasEntre(isoA, isoB) {
  return Math.round((new Date(isoB + 'T12:00:00') - new Date(isoA + 'T12:00:00')) / 86400000);
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function nomeMes(m) { return MESES[m]; }
export function dataCurta(iso) { const [, m, d] = String(iso).split('-'); return `${Number(d)} ${MESES_CURTOS[Number(m) - 1]}`; }
export function mesAno(iso) { const [y, m] = String(iso).split('-'); return `${MESES[Number(m) - 1]} de ${y}`; }

export function idade(nascimento) {
  if (!nascimento) return null;
  const n = new Date(nascimento + 'T12:00:00');
  const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
}

export function primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0]; }
export function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/);
  return ((p[0] || '')[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '');
}
const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }));
const agoraHora = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// mensagens de erro do banco viram frases para a pessoa
function mensagem(err) {
  const m = (err && (err.message || err.error_description || err.msg)) || '';
  if (/Invalid login credentials/i.test(m)) return 'Login ou senha incorretos.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sem conexão com a internet. Confira e tente de novo.';
  if (/JWT|expired|refresh/i.test(m)) return 'Sua sessão expirou. Entre de novo.';
  return m || 'Algo deu errado. Tente de novo.';
}

// ---------- conexão ----------

let sb = null;
function cliente() {
  if (sb) return sb;
  if (!window.supabase || !CONFIG.supabase.url) throw new Error('O sistema não está configurado para o banco de dados.');
  sb = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.chave, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cta-sessao' },
  });
  return sb;
}

// ---------- estado do painel ----------

let db = { alunos: [], checkins: [], emprestimos: [], estoque: [], horarios: [], equipe: [] };
let usuarioAtual = null;
let canal = null;
const ouvintes = { mudou: [], erro: [] };
export function aoMudar(fn) { ouvintes.mudou.push(fn); }
export function aoErro(fn) { ouvintes.erro.push(fn); }
const avisarMudanca = () => ouvintes.mudou.forEach((f) => f());
const avisarErro = (m) => ouvintes.erro.forEach((f) => f(m));

const nomeEquipe = (id) => (id && (db.equipe.find((p) => p.id === id) || {}).nome) || null;
const hora5 = (t) => String(t || '').slice(0, 5);
const dataLocal = (ts) => hojeISO(new Date(ts));

let graduacoesBrutas = [];
function montarAlunos(linhas) {
  const porAluno = {};
  graduacoesBrutas.forEach((g) => { (porAluno[g.aluno_id] = porAluno[g.aluno_id] || []).push(g); });
  return linhas.map((r) => {
    const hist = (porAluno[r.id] || []).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id));
    const atual = hist[0];
    return {
      id: r.id, nome: r.nome, nascimento: r.nascimento, celular: r.celular,
      responsavel: r.responsavel_celular ? { nome: r.responsavel_nome || '', celular: r.responsavel_celular } : null,
      modalidades: r.modalidades || [], kimono: r.kimono || '',
      emergencia: { nome: r.emergencia_nome, celular: r.emergencia_celular },
      saude: r.saude || '', foto: r.foto || null,
      criadoEm: dataLocal(r.criado_em), termoAceitoEm: r.termo_aceito_em,
      graduacoes: atual ? { jiujitsu: { faixa: atual.faixa, graus: atual.graus, data: atual.data, por: nomeEquipe(atual.por) } } : {},
      historicoGraduacoes: hist.slice(1).map((g) => ({ faixa: g.faixa, graus: g.graus, data: g.data, por: nomeEquipe(g.por) })),
    };
  });
}
let alunosBrutos = [];

async function buscar(tabela) {
  const s = cliente();
  const desde = hojeISO(new Date(Date.now() - 400 * 86400000));
  let q;
  if (tabela === 'checkins') q = s.from('checkins').select('*').gte('dia', desde);
  else if (tabela === 'emprestimos') q = s.from('emprestimos').select('*').or(`devolvido_em.is.null,saida.gte.${desde}`);
  else q = s.from(tabela).select('*');
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function recarregar(tabela) {
  const dados = await buscar(tabela);
  if (tabela === 'equipe') db.equipe = dados.map((p) => ({ id: p.id, nome: p.nome, login: p.login }));
  if (tabela === 'graduacoes') { graduacoesBrutas = dados; db.alunos = montarAlunos(alunosBrutos); }
  if (tabela === 'alunos') { alunosBrutos = dados; db.alunos = montarAlunos(alunosBrutos); }
  if (tabela === 'checkins') db.checkins = dados.map((c) => ({ alunoId: c.aluno_id, data: c.dia, hora: hora5(c.hora), por: nomeEquipe(c.por) }));
  if (tabela === 'emprestimos') db.emprestimos = dados.map((e) => ({ id: e.id, alunoId: e.aluno_id, item: e.item, tamanho: e.tamanho, cor: e.cor || null, saida: e.saida, devolvidoEm: e.devolvido_em, por: nomeEquipe(e.por) }));
  if (tabela === 'estoque') db.estoque = dados.map((s) => ({ item: s.item, tamanho: s.tamanho, cor: s.cor || null, total: s.total }));
  if (tabela === 'horarios') db.horarios = dados.map((h) => ({ id: h.id, dia: h.dia, inicio: hora5(h.inicio), fim: hora5(h.fim), modalidade: h.modalidade, turma: h.turma || '' }));
}

async function carregarTudo() {
  await recarregar('equipe');
  await Promise.all(['graduacoes', 'alunos', 'checkins', 'emprestimos', 'estoque', 'horarios'].map(recarregar));
  db.alunos = montarAlunos(alunosBrutos);
}

// escuta o banco: qualquer mudança feita por outra pessoa, pelo site ou por outro computador
function escutar() {
  if (canal) return;
  const s = cliente();
  const pendentes = new Set();
  let timer = null;
  canal = s.channel('cta-painel');
  ['alunos', 'checkins', 'emprestimos', 'graduacoes', 'estoque', 'horarios', 'equipe'].forEach((t) => {
    canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => {
      pendentes.add(t);
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const lista = [...pendentes];
        pendentes.clear();
        try { for (const tab of lista) await recarregar(tab); avisarMudanca(); } catch (e) { /* tenta na próxima */ }
      }, 350);
    });
  });
  canal.subscribe();
  // garantia: atualiza tudo de tempos em tempos e quando a janela volta ao foco
  setInterval(() => { if (usuarioAtual) carregarTudo().then(avisarMudanca).catch(() => {}); }, 5 * 60 * 1000);
  window.addEventListener('focus', () => { if (usuarioAtual) carregarTudo().then(avisarMudanca).catch(() => {}); });
}

// grava no banco em segundo plano; se falhar, recarrega a tabela e avisa
function gravar(promessa, tabela) {
  Promise.resolve(promessa).then(({ error } = {}) => {
    if (error) throw error;
  }).catch(async (err) => {
    avisarErro(mensagem(err));
    try { await recarregar(tabela); avisarMudanca(); } catch (e) { /* sem conexão */ }
  });
}

export async function iniciar() {
  const s = cliente();
  const { data } = await s.auth.getSession();
  if (!data.session) return;
  await entrarComSessao(data.session.user.id);
}

async function entrarComSessao(id) {
  const s = cliente();
  const { data: eu, error } = await s.from('equipe').select('id, nome, login').eq('id', id).maybeSingle();
  if (error) throw new Error(mensagem(error));
  if (!eu) { await s.auth.signOut(); throw new Error('Esse login não tem acesso ao painel. Peça para alguém da equipe adicionar você.'); }
  usuarioAtual = eu;
  await carregarTudo();
  escutar();
}

export function usuario() { return usuarioAtual; }

export async function entrarEquipe(login, senha) {
  const s = cliente();
  const { data, error } = await s.auth.signInWithPassword({ email: (login || '').trim().toLowerCase(), password: senha || '' });
  if (error) throw new Error(mensagem(error));
  await entrarComSessao(data.user.id);
  return usuarioAtual;
}

export async function sair() {
  usuarioAtual = null;
  if (canal) { cliente().removeChannel(canal); canal = null; }
  db = { alunos: [], checkins: [], emprestimos: [], estoque: [], horarios: [], equipe: [] };
  await cliente().auth.signOut();
}

export async function trocarMinhaSenha(nova) {
  if (!nova || nova.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  const { error } = await cliente().auth.updateUser({ password: nova });
  if (error) throw new Error(mensagem(error));
}

// ---------- alunos ----------

export function alunos() { return db.alunos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); }
export function aluno(id) { return db.alunos.find((a) => a.id === id) || null; }

export function buscarPorNome(texto) {
  const t = semAcento(texto.trim());
  if (!t) return alunos();
  return alunos().filter((a) => semAcento(a.nome).includes(t));
}

function argsCadastro(d) {
  return {
    p_nome: d.nome || '', p_nascimento: d.nascimento || null, p_celular: d.celular || '',
    p_resp_nome: (d.responsavel && d.responsavel.nome) || '', p_resp_celular: (d.responsavel && d.responsavel.celular) || '',
    p_modalidades: d.modalidades || [], p_kimono: d.kimono || '',
    p_emerg_nome: (d.emergencia && d.emergencia.nome) || '', p_emerg_celular: (d.emergencia && d.emergencia.celular) || '',
    p_saude: d.saude || '', p_foto: d.foto || null, p_pin: d.pin || '', p_termo: !!d.termo,
  };
}

// usado pelo painel e pelo site
export async function cadastrar(dados) {
  if (!dados.nascimento) throw new Error('Informe a data de nascimento.');
  const { data: id, error } = await cliente().rpc('cadastrar_aluno', argsCadastro(dados));
  if (error) throw new Error(mensagem(error));
  if (usuarioAtual) {
    await Promise.all([recarregar('alunos'), recarregar('graduacoes')]);
    db.alunos = montarAlunos(alunosBrutos);
    return aluno(id);
  }
  const i = idade(dados.nascimento);
  return { id, nome: dados.nome.trim(), responsavel: i !== null && i < 18 ? dados.responsavel : null };
}

export async function redefinirPin(alunoId, novoPin) {
  if (!/^\d{4}$/.test(novoPin || '')) throw new Error('O PIN precisa ter 4 números.');
  const { error } = await cliente().rpc('painel_redefinir_pin', { p_aluno: alunoId, p_pin: novoPin });
  if (error) throw new Error(mensagem(error));
}

export function definirGraduacao(alunoId, faixa, graus) {
  const a = aluno(alunoId);
  const nova = { aluno_id: alunoId, modalidade: 'jiujitsu', faixa, graus: Number(graus), data: hojeISO(), por: usuarioAtual.id };
  graduacoesBrutas.push({ ...nova, id: Number.MAX_SAFE_INTEGER });
  if (a) { if (a.graduacoes.jiujitsu) a.historicoGraduacoes.unshift(a.graduacoes.jiujitsu); a.graduacoes.jiujitsu = { faixa, graus: Number(graus), data: hojeISO(), por: usuarioAtual.nome }; }
  gravar(cliente().from('graduacoes').insert(nova).then((r) => { if (!r.error) recarregar('graduacoes'); return r; }), 'graduacoes');
}

export function infantil(a) { const i = idade(a.nascimento); return i !== null && i < 16; }

// ---------- check-in ----------

export function checkinsDe(alunoId) { return db.checkins.filter((c) => c.alunoId === alunoId).sort((a, b) => (a.data < b.data ? 1 : -1)); }
export function checkinsDoDia(dia = hojeISO()) { return db.checkins.filter((c) => c.data === dia).sort((a, b) => (a.hora < b.hora ? 1 : -1)); }
export function fezHoje(alunoId) { return db.checkins.some((c) => c.alunoId === alunoId && c.data === hojeISO()); }

export function fazerCheckin(alunoId) {
  if (fezHoje(alunoId)) return false;
  db.checkins.push({ alunoId, data: hojeISO(), hora: agoraHora(), por: usuarioAtual ? usuarioAtual.nome : null });
  gravar(cliente().from('checkins').insert({ aluno_id: alunoId, por: usuarioAtual ? usuarioAtual.id : null }), 'checkins');
  return true;
}

export function ultimoTreino(alunoId) { const c = checkinsDe(alunoId)[0]; return c ? c.data : null; }
export function ativo(a) { return diasEntre(ultimoTreino(a.id) || a.criadoEm, hojeISO()) <= DIAS_INATIVO; }
export function treinosNoMes(alunoId, iso = hojeISO()) { const p = iso.slice(0, 7); return db.checkins.filter((c) => c.alunoId === alunoId && c.data.startsWith(p)).length; }

export function checkinsPorMes(meses = 6) {
  const h = new Date();
  const lista = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(h.getFullYear(), h.getMonth() - i, 1);
    const p = hojeISO(d).slice(0, 7);
    lista.push({ mes: d.getMonth(), total: db.checkins.filter((c) => c.data.startsWith(p)).length });
  }
  return lista;
}

export function maisFrequentes(limite = 5) {
  const p = hojeISO().slice(0, 7);
  const conta = {};
  db.checkins.filter((c) => c.data.startsWith(p)).forEach((c) => { conta[c.alunoId] = (conta[c.alunoId] || 0) + 1; });
  return Object.entries(conta).map(([id, n]) => ({ aluno: aluno(id), n })).filter((x) => x.aluno)
    .sort((a, b) => b.n - a.n || a.aluno.nome.localeCompare(b.aluno.nome)).slice(0, limite);
}

// ---------- localização ----------

export function conferirLocal() {
  return new Promise((resolve) => {
    if (!CONFIG.localCTA) { resolve({ ok: true }); return; }
    if (!navigator.geolocation) { resolve({ ok: false, motivo: 'Seu celular não informou a localização.' }); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const d = distanciaMetros(pos.coords.latitude, pos.coords.longitude, CONFIG.localCTA.lat, CONFIG.localCTA.lng);
      resolve(d <= CONFIG.localCTA.raioMetros ? { ok: true } : { ok: false, motivo: 'O check-in só funciona dentro do CTA.' });
    }, () => resolve({ ok: false, motivo: 'Libere a localização no navegador para fazer o check-in.' }), { enableHighAccuracy: true, timeout: 10000 });
  });
}

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const r = 6371000, rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

// ---------- empréstimos e estoque ----------

export function emprestimosAbertos() { return db.emprestimos.filter((e) => !e.devolvidoEm).sort((a, b) => (a.saida < b.saida ? -1 : 1)); }
export function emprestimosDe(alunoId) { return emprestimosAbertos().filter((e) => e.alunoId === alunoId); }
export function estoque() { return db.estoque.slice(); }

export function disponivel(item, tamanho, cor = null) {
  const igual = (x) => x.item === item && x.tamanho === tamanho && (item === 'kimono' || x.cor === cor);
  return db.estoque.filter(igual).reduce((t, s) => t + s.total, 0) - emprestimosAbertos().filter(igual).length;
}

export function emprestar(alunoId, item, tamanho, cor) {
  if (disponivel(item, tamanho, cor) <= 0) throw new Error(`Não há ${item === 'kimono' ? 'kimono' : 'faixa ' + cor} ${tamanho} disponível no estoque.`);
  const id = novoId();
  const c = item === 'faixa' ? cor : null;
  db.emprestimos.push({ id, alunoId, item, tamanho, cor: c, saida: hojeISO(), por: usuarioAtual.nome, devolvidoEm: null });
  gravar(cliente().from('emprestimos').insert({ id, aluno_id: alunoId, item, tamanho, cor: c || '', por: usuarioAtual.id }), 'emprestimos');
}

export function devolver(emprestimoId) {
  const e = db.emprestimos.find((x) => x.id === emprestimoId);
  if (!e) return;
  e.devolvidoEm = hojeISO();
  gravar(cliente().from('emprestimos').update({ devolvido_em: hojeISO() }).eq('id', emprestimoId), 'emprestimos');
}

export function definirEstoque(item, tamanho, cor, total) {
  const n = Math.max(0, Math.round(Number(total) || 0));
  const c = item === 'faixa' ? (cor || '') : '';
  const s = db.estoque.find((x) => x.item === item && x.tamanho === tamanho && (x.cor || '') === c);
  if (s) s.total = n; else db.estoque.push({ item, tamanho, cor: c || null, total: n });
  db.estoque = db.estoque.filter((x) => x.total > 0);
  const q = n > 0
    ? cliente().from('estoque').upsert({ item, tamanho, cor: c, total: n })
    : cliente().from('estoque').delete().match({ item, tamanho, cor: c });
  gravar(q, 'estoque');
}

export function precisaCobrar(e) { return diasEntre(ultimoTreino(e.alunoId) || e.saida, hojeISO()) >= DIAS_COBRAR; }

// ---------- horários ----------

export function horarios() {
  return db.horarios.slice().sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || (a.inicio < b.inicio ? -1 : 1));
}

export function adicionarHorario(h) {
  if (!h.dia || !h.inicio || !h.fim || !h.modalidade) throw new Error('Preencha dia, início, fim e modalidade.');
  if (h.fim <= h.inicio) throw new Error('O fim precisa ser depois do início.');
  const novo = { id: novoId(), dia: h.dia, inicio: h.inicio, fim: h.fim, modalidade: h.modalidade, turma: (h.turma || '').trim() };
  db.horarios.push(novo);
  gravar(cliente().from('horarios').insert({ ...novo, turma: novo.turma || null }), 'horarios');
}

export function removerHorario(id) {
  db.horarios = db.horarios.filter((h) => h.id !== id);
  gravar(cliente().from('horarios').delete().eq('id', id), 'horarios');
}

// ---------- equipe ----------

export function equipe() { return db.equipe.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); }

export function loginDe(nome) { return semAcento(primeiroNome(nome)).replace(/[^a-z0-9]/g, '') + '@' + CONFIG.dominioLogin; }

// cria o login na hora: o banco registra a pessoa no Supabase Auth e na equipe de uma vez
export async function adicionarEquipe(nome, login, senha) {
  const { error } = await cliente().rpc('painel_criar_acesso', { p_nome: nome || '', p_login: (login || '').trim().toLowerCase(), p_senha: senha || '' });
  if (error) throw new Error(mensagem(error));
  await recarregar('equipe');
}

export async function redefinirSenha(id, senha) {
  const { error } = await cliente().rpc('painel_redefinir_senha', { p_id: id, p_senha: senha || '' });
  if (error) throw new Error(mensagem(error));
}

// ---------- site dos alunos ----------

export const site = {
  async buscar(celular) {
    if (soDigitos(celular).length < 10) return [];
    const { data, error } = await cliente().rpc('site_buscar_checkin', { p_celular: soDigitos(celular) });
    if (error) throw new Error(mensagem(error));
    return data.map((a) => ({ id: a.id, nome: a.nome, modalidades: a.modalidades, jaFez: a.ja_fez }));
  },
  async checkin(celular, alunoId) {
    const { data, error } = await cliente().rpc('site_fazer_checkin', { p_celular: soDigitos(celular), p_aluno: alunoId });
    if (error) throw new Error(mensagem(error));
    return data;
  },
  async conta(celular, pin) {
    if (soDigitos(celular).length < 10) throw new Error('Informe o celular com DDD.');
    const { data, error } = await cliente().rpc('site_minha_conta', { p_celular: soDigitos(celular), p_pin: pin || '' });
    if (error) throw new Error(mensagem(error));
    if (!data || !data.length) throw new Error('Celular ou PIN incorretos. Se esqueceu o PIN, peça para um professor redefinir.');
    return data.map((a) => ({
      id: a.id, nome: a.nome, modalidades: a.modalidades || [], foto: a.foto, criadoEm: dataLocal(a.criado_em),
      graduacao: a.graduacao, treinosNoMes: a.treinos_no_mes,
      emprestimos: (a.emprestimos || []).map((e) => ({ item: e.item, tamanho: e.tamanho, cor: e.cor || null, saida: e.saida })),
      ultimos: (a.ultimos || []).map((u) => ({ data: u.dia, hora: u.hora })),
    }));
  },
  async horarios() {
    const { data, error } = await cliente().from('horarios').select('*');
    if (error) throw new Error(mensagem(error));
    return data.map((h) => ({ id: h.id, dia: h.dia, inicio: hora5(h.inicio), fim: hora5(h.fim), modalidade: h.modalidade, turma: h.turma || '' }))
      .sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || (a.inicio < b.inicio ? -1 : 1));
  },
};
