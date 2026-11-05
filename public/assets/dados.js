// Camada de dados do CTA.
// Nesta versão tudo fica no navegador (localStorage) com dados de teste.
// Quando o Supabase estiver pronto, só este arquivo muda: as telas continuam iguais.

import { CONFIG } from './config.js';

const CHAVE = 'cta-dados';
let db = null;

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
  const a = new Date(isoA + 'T12:00:00');
  const b = new Date(isoB + 'T12:00:00');
  return Math.round((b - a) / 86400000);
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function nomeMes(m) { return MESES[m]; }
export function dataCurta(iso) { const [, m, d] = iso.split('-'); return `${Number(d)} ${MESES_CURTOS[Number(m) - 1]}`; }
export function mesAno(iso) { const [y, m] = iso.split('-'); return `${MESES[Number(m) - 1]} de ${y}`; }

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

async function resumo(texto) {
  const dados = new TextEncoder().encode('cta:' + texto);
  const h = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function novoId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

// ---------- carregar e salvar ----------

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { /* sem armazenamento: segue só em memória */ }
}

export async function iniciar() {
  if (db) return;
  try { db = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { db = null; }
  if (!db || db.versao !== 1) {
    db = await dadosDeTeste();
    salvar();
  }
}

export async function recomecarTeste() {
  db = await dadosDeTeste();
  salvar();
}

// ---------- alunos ----------

export function alunos() { return db.alunos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); }
export function aluno(id) { return db.alunos.find((a) => a.id === id) || null; }

export function buscarPorCelular(celular) {
  const d = soDigitos(celular);
  if (d.length < 10) return [];
  return alunos().filter((a) => a.celular === d || (a.responsavel && a.responsavel.celular === d));
}

export function buscarPorNome(texto) {
  const t = texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!t) return alunos();
  return alunos().filter((a) => a.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t));
}

export async function cadastrar(dados) {
  const celular = soDigitos(dados.celular);
  const menor = idade(dados.nascimento) !== null && idade(dados.nascimento) < 18;
  const respCel = menor ? soDigitos(dados.responsavel && dados.responsavel.celular) : '';

  if (!dados.nome || dados.nome.trim().split(/\s+/).length < 2) throw new Error('Escreva o nome completo.');
  if (!dados.nascimento) throw new Error('Informe a data de nascimento.');
  if (!dados.modalidades || dados.modalidades.length === 0) throw new Error('Escolha pelo menos uma modalidade.');
  if (!/^\d{4}$/.test(dados.pin || '')) throw new Error('O PIN precisa ter 4 números.');
  if (!dados.emergencia || !dados.emergencia.nome || soDigitos(dados.emergencia.celular).length < 10) throw new Error('Informe o nome e o telefone do contato de emergência.');
  if (!dados.termo) throw new Error('Para treinar, é preciso aceitar o termo de responsabilidade.');

  if (menor) {
    if (!dados.responsavel || !dados.responsavel.nome) throw new Error('Para menores de 18 anos, informe o nome do responsável.');
    if (respCel.length < 10) throw new Error('Informe o celular do responsável com DDD.');
    if (celular && db.alunos.some((a) => a.celular === celular)) throw new Error('Esse celular já tem cadastro. Deixe o campo do aluno vazio ou use outro número.');
  } else {
    if (celular.length < 10) throw new Error('Informe o celular com DDD.');
    if (db.alunos.some((a) => a.celular === celular)) throw new Error('Esse celular já tem cadastro. Faça o check-in com ele.');
  }

  const novo = {
    id: novoId(),
    nome: dados.nome.trim().replace(/\s+/g, ' '),
    nascimento: dados.nascimento,
    celular: celular || null,
    responsavel: menor ? { nome: dados.responsavel.nome.trim(), celular: respCel } : null,
    modalidades: dados.modalidades,
    kimono: dados.kimono || '',
    emergencia: { nome: dados.emergencia.nome.trim(), celular: soDigitos(dados.emergencia.celular) },
    saude: (dados.saude || '').trim(),
    foto: dados.foto || null,
    pinHash: await resumo(dados.pin),
    graduacoes: {},
    termoAceitoEm: new Date().toISOString(),
    criadoEm: hojeISO(),
  };
  if (novo.modalidades.includes('jiujitsu')) novo.graduacoes.jiujitsu = { faixa: 'branca', graus: 0, data: hojeISO(), por: null };
  db.alunos.push(novo);
  salvar();
  return novo;
}

export async function entrarAluno(celular, pin) {
  const lista = buscarPorCelular(celular);
  if (lista.length === 0) throw new Error('Não achamos cadastro com esse celular.');
  const h = await resumo(pin);
  const certos = lista.filter((a) => a.pinHash === h);
  if (certos.length === 0) throw new Error('PIN incorreto. Se esqueceu, peça para um professor redefinir.');
  return certos;
}

export async function redefinirPin(alunoId, novoPin) {
  if (!/^\d{4}$/.test(novoPin)) throw new Error('O PIN precisa ter 4 números.');
  const a = aluno(alunoId);
  a.pinHash = await resumo(novoPin);
  salvar();
}

export function atualizarAluno(alunoId, mudancas) {
  const a = aluno(alunoId);
  Object.assign(a, mudancas);
  salvar();
}

export function definirGraduacao(alunoId, faixa, graus, por) {
  const a = aluno(alunoId);
  const anterior = a.graduacoes.jiujitsu;
  a.graduacoes.jiujitsu = { faixa, graus: Number(graus), data: hojeISO(), por };
  a.historicoGraduacoes = a.historicoGraduacoes || [];
  if (anterior) a.historicoGraduacoes.unshift(anterior);
  salvar();
}

export function infantil(a) { const i = idade(a.nascimento); return i !== null && i < 16; }

// ---------- check-in ----------

export function checkinsDe(alunoId) { return db.checkins.filter((c) => c.alunoId === alunoId).sort((a, b) => (a.data < b.data ? 1 : -1)); }
export function checkinsDoDia(dia = hojeISO()) { return db.checkins.filter((c) => c.data === dia).sort((a, b) => (a.hora < b.hora ? 1 : -1)); }
export function fezHoje(alunoId) { return db.checkins.some((c) => c.alunoId === alunoId && c.data === hojeISO()); }

export function fazerCheckin(alunoId, porProfessor = null) {
  if (fezHoje(alunoId)) return false;
  const agora = new Date();
  db.checkins.push({ alunoId, data: hojeISO(agora), hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`, por: porProfessor });
  salvar();
  return true;
}

export function ultimoTreino(alunoId) { const c = checkinsDe(alunoId)[0]; return c ? c.data : null; }

export function ativo(a) {
  const ultimo = ultimoTreino(a.id) || a.criadoEm;
  return diasEntre(ultimo, hojeISO()) <= DIAS_INATIVO;
}

export function treinosNoMes(alunoId, iso = hojeISO()) {
  const prefixo = iso.slice(0, 7);
  return db.checkins.filter((c) => c.alunoId === alunoId && c.data.startsWith(prefixo)).length;
}

export function checkinsPorMes(meses = 6) {
  const h = new Date();
  const lista = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(h.getFullYear(), h.getMonth() - i, 1);
    const prefixo = hojeISO(d).slice(0, 7);
    lista.push({ mes: d.getMonth(), total: db.checkins.filter((c) => c.data.startsWith(prefixo)).length });
  }
  return lista;
}

export function maisFrequentes(limite = 5) {
  const prefixo = hojeISO().slice(0, 7);
  const conta = {};
  db.checkins.filter((c) => c.data.startsWith(prefixo)).forEach((c) => { conta[c.alunoId] = (conta[c.alunoId] || 0) + 1; });
  return Object.entries(conta).map(([id, n]) => ({ aluno: aluno(id), n })).filter((x) => x.aluno)
    .sort((a, b) => b.n - a.n || a.aluno.nome.localeCompare(b.aluno.nome)).slice(0, limite);
}

// ---------- localização ----------

export function conferirLocal() {
  return new Promise((resolve) => {
    if (CONFIG.modoTeste || !CONFIG.localCTA) { resolve({ ok: true, teste: true }); return; }
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

// ---------- empréstimos ----------

export function emprestimosAbertos() {
  return db.emprestimos.filter((e) => !e.devolvidoEm).sort((a, b) => (a.saida < b.saida ? -1 : 1));
}
export function emprestimosDe(alunoId) { return emprestimosAbertos().filter((e) => e.alunoId === alunoId); }

export function estoque() { return db.estoque.slice(); }

export function disponivel(item, tamanho, cor = null) {
  const total = db.estoque.filter((s) => s.item === item && s.tamanho === tamanho && (item === 'kimono' || s.cor === cor)).reduce((t, s) => t + s.total, 0);
  const fora = emprestimosAbertos().filter((e) => e.item === item && e.tamanho === tamanho && (item === 'kimono' || e.cor === cor)).length;
  return total - fora;
}

export function emprestar(alunoId, item, tamanho, cor, por) {
  if (disponivel(item, tamanho, cor) <= 0) throw new Error(`Não há ${item === 'kimono' ? 'kimono' : 'faixa ' + cor} ${tamanho} disponível no estoque.`);
  db.emprestimos.push({ id: novoId(), alunoId, item, tamanho, cor: item === 'faixa' ? cor : null, saida: hojeISO(), por, devolvidoEm: null });
  salvar();
}

export function devolver(emprestimoId) {
  const e = db.emprestimos.find((x) => x.id === emprestimoId);
  e.devolvidoEm = hojeISO();
  salvar();
}

export function definirEstoque(item, tamanho, cor, total) {
  const n = Math.max(0, Math.round(Number(total) || 0));
  const s = db.estoque.find((x) => x.item === item && x.tamanho === tamanho && (x.cor || null) === (cor || null));
  if (s) s.total = n; else db.estoque.push({ item, tamanho, cor: cor || null, total: n });
  db.estoque = db.estoque.filter((x) => x.total > 0);
  salvar();
}

export function precisaCobrar(e) {
  const ultimo = ultimoTreino(e.alunoId) || e.saida;
  return diasEntre(ultimo, hojeISO()) >= DIAS_COBRAR;
}

// ---------- horários ----------

export function horarios() {
  return db.horarios.slice().sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || (a.inicio < b.inicio ? -1 : 1));
}
export function adicionarHorario(h) {
  if (!h.dia || !h.inicio || !h.fim || !h.modalidade) throw new Error('Preencha dia, início, fim e modalidade.');
  if (h.fim <= h.inicio) throw new Error('O fim precisa ser depois do início.');
  db.horarios.push({ id: novoId(), dia: h.dia, inicio: h.inicio, fim: h.fim, modalidade: h.modalidade, turma: (h.turma || '').trim() });
  salvar();
}
export function removerHorario(id) { db.horarios = db.horarios.filter((h) => h.id !== id); salvar(); }

// ---------- equipe ----------

export function equipe() { return db.equipe.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); }

export function loginDe(nome) {
  return primeiroNome(nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') + '@' + CONFIG.dominioLogin;
}

export async function adicionarEquipe(nome, login, senha) {
  login = (login || '').trim().toLowerCase();
  if (!nome || !nome.trim()) throw new Error('Escreva o nome da pessoa.');
  if (!login.endsWith('@' + CONFIG.dominioLogin) || login.length <= CONFIG.dominioLogin.length + 1) throw new Error(`O login precisa terminar em @${CONFIG.dominioLogin}.`);
  if (db.equipe.some((p) => p.login === login)) throw new Error('Já existe alguém com esse login. Use outro, como o nome e o sobrenome.');
  if (!senha || senha.length < 6) throw new Error('A senha inicial precisa ter pelo menos 6 caracteres.');
  db.equipe.push({ id: novoId(), nome: nome.trim(), login, senhaHash: await resumo(senha) });
  salvar();
}

export async function redefinirSenha(id, senha) {
  if (!senha || senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  db.equipe.find((p) => p.id === id).senhaHash = await resumo(senha);
  salvar();
}

export async function entrarEquipe(login, senha) {
  const p = db.equipe.find((x) => x.login === (login || '').trim().toLowerCase());
  if (!p || p.senhaHash !== (await resumo(senha || ''))) throw new Error('Login ou senha incorretos.');
  return { id: p.id, nome: p.nome, login: p.login };
}

// ---------- dados de teste ----------

async function dadosDeTeste() {
  const h = new Date();
  const dia = (n) => hojeISO(new Date(h.getFullYear(), h.getMonth(), h.getDate() - n));
  const pin = await resumo('1234');
  let semente = 7;
  const sorte = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };

  const base = [
    ['Lucas Silva', '1998-04-12', '11987654321', ['jiujitsu', 'boxe'], 'A2', 'azul', 2, 200, 0.55],
    ['Ana Costa', '2001-09-03', '11991234567', ['jiujitsu'], 'A1', 'branca', 3, 120, 0.5],
    ['Pedro Alves', '1994-01-25', '11998877665', ['jiujitsu', 'muaythai'], 'A3', 'roxa', 1, 400, 0],
    ['João Lima', '2003-06-18', '11976543210', ['jiujitsu'], 'A1', 'branca', 1, 40, 0.6],
    ['Marina Rocha', '1999-11-30', '11965432109', ['muaythai'], '', null, 0, 1, 0],
    ['Rafael Souza', '1990-03-08', '11954321098', ['boxe'], '', null, 0, 300, 0.45],
    ['Beatriz Nunes', '2000-07-21', '11943210987', ['muaythai', 'boxe'], '', null, 0, 150, 0.4],
    ['Thiago Martins', '1987-12-02', '11932109876', ['jiujitsu'], 'A4', 'marrom', 4, 700, 0.5],
    ['Camila Ferreira', '1996-05-14', '11921098765', ['jiujitsu', 'muaythai'], 'A2', 'azul', 0, 260, 0.35],
    ['Gustavo Pereira', '2002-02-27', '11910987654', ['boxe'], '', null, 0, 90, 0],
    ['Larissa Gomes', '1993-08-09', '11909876543', ['jiujitsu'], 'A1', 'branca', 4, 180, 0.3],
    ['Felipe Ribeiro', '1985-10-16', '11898765432', ['jiujitsu', 'boxe'], 'A3', 'preta', 1, 900, 0.4],
  ];

  const alunos = base.map(([nome, nasc, cel, mods, kimono, faixa, graus, desde, freq]) => ({
    id: novoId(), nome, nascimento: nasc, celular: cel, responsavel: null, modalidades: mods, kimono,
    emergencia: { nome: 'Família', celular: '11900000000' }, saude: '', foto: null, pinHash: pin,
    graduacoes: faixa ? { jiujitsu: { faixa, graus, data: dia(Math.min(desde, 120)), por: 'Professor de teste' } } : {},
    termoAceitoEm: new Date(h - desde * 86400000).toISOString(), criadoEm: dia(desde), _freq: freq,
  }));

  const resp = { nome: 'Patrícia Oliveira', celular: '11887766554' };
  const filhos = [
    ['Davi Oliveira', '2015-03-10', 'amarela', 2, 0.5],
    ['Sofia Oliveira', '2017-08-22', 'cinza', 1, 0.45],
  ].map(([nome, nasc, faixa, graus, freq]) => ({
    id: novoId(), nome, nascimento: nasc, celular: null, responsavel: resp, modalidades: ['jiujitsu'], kimono: 'M2',
    emergencia: { nome: resp.nome, celular: resp.celular }, saude: '', foto: null, pinHash: pin,
    graduacoes: { jiujitsu: { faixa, graus, data: dia(60), por: 'Professor de teste' } },
    termoAceitoEm: new Date(h - 200 * 86400000).toISOString(), criadoEm: dia(200), _freq: freq,
  }));
  alunos.push(...filhos);

  const checkins = [];
  alunos.forEach((a) => {
    const desde = Math.min(diasEntre(a.criadoEm, hojeISO()), 170);
    for (let n = desde; n >= 1; n--) {
      const d = new Date(h.getFullYear(), h.getMonth(), h.getDate() - n);
      if (d.getDay() === 0) continue;
      if (sorte() < a._freq) checkins.push({ alunoId: a.id, data: hojeISO(d), hora: ['19:05', '19:12', '19:20', '20:01', '10:15'][Math.floor(sorte() * 5)], por: null });
    }
  });
  // Pedro parou de treinar há mais de um mês, ainda com kimono
  const pedro = alunos.find((a) => a.nome === 'Pedro Alves');
  for (let n = 60; n >= 35; n -= 3) checkins.push({ alunoId: pedro.id, data: dia(n), hora: '19:10', por: null });
  // alguns check-ins de hoje
  ['Lucas Silva', 'Thiago Martins', 'Davi Oliveira'].forEach((nome, i) => {
    const a = alunos.find((x) => x.nome === nome);
    checkins.push({ alunoId: a.id, data: hojeISO(), hora: ['18:52', '18:58', '19:03'][i], por: nome === 'Davi Oliveira' ? 'Professor de teste' : null });
  });
  alunos.forEach((a) => delete a._freq);

  const porNome = (n) => alunos.find((a) => a.nome === n).id;
  const emprestimos = [
    { id: novoId(), alunoId: porNome('Pedro Alves'), item: 'kimono', tamanho: 'A3', cor: null, saida: dia(70), por: 'Professor de teste', devolvidoEm: null },
    { id: novoId(), alunoId: porNome('Ana Costa'), item: 'faixa', tamanho: 'A1', cor: 'branca', saida: dia(6), por: 'Professor de teste', devolvidoEm: null },
    { id: novoId(), alunoId: porNome('João Lima'), item: 'kimono', tamanho: 'A1', cor: null, saida: dia(3), por: 'Professor de teste', devolvidoEm: null },
    { id: novoId(), alunoId: porNome('Lucas Silva'), item: 'kimono', tamanho: 'A2', cor: null, saida: dia(24), por: 'Professor de teste', devolvidoEm: null },
    { id: novoId(), alunoId: porNome('Davi Oliveira'), item: 'kimono', tamanho: 'M2', cor: null, saida: dia(40), por: 'Professor de teste', devolvidoEm: null },
  ];

  const estoque = [
    ['kimono', 'M2', null, 3], ['kimono', 'M3', null, 2], ['kimono', 'A1', null, 4], ['kimono', 'A2', null, 5], ['kimono', 'A3', null, 3], ['kimono', 'A4', null, 1],
    ['faixa', 'M2', 'branca', 4], ['faixa', 'A1', 'branca', 6], ['faixa', 'A2', 'branca', 6], ['faixa', 'A3', 'branca', 3],
  ].map(([item, tamanho, cor, total]) => ({ item, tamanho, cor, total }));

  const horarios = [
    ['Segunda', '19:00', '20:30', 'jiujitsu', ''], ['Segunda', '20:30', '21:30', 'boxe', ''],
    ['Terça', '19:00', '20:00', 'muaythai', ''], ['Quarta', '19:00', '20:30', 'jiujitsu', ''],
    ['Quinta', '19:00', '20:00', 'muaythai', ''], ['Quinta', '20:00', '21:00', 'boxe', ''],
    ['Sábado', '10:00', '11:00', 'jiujitsu', 'Infantil'], ['Sábado', '11:00', '12:30', 'jiujitsu', ''],
  ].map(([d, i, f, m, t]) => ({ id: novoId(), dia: d, inicio: i, fim: f, modalidade: m, turma: t }));

  const equipe = [{ id: novoId(), nome: 'Professor de teste', login: 'teste@' + CONFIG.dominioLogin, senhaHash: await resumo('tatame') }];

  return { versao: 1, alunos, checkins, emprestimos, estoque, horarios, equipe };
}
