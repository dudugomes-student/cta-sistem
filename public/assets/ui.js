import { iniciais, FAIXAS_ADULTO } from './dados.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

// as animações fazem parte do sistema: rodam sempre, mesmo com "reduzir movimento" ligado no aparelho
const semMovimento = () => false;

// fundo com luzes difusas, aurora e gotas de vidro, mais todos os efeitos de interação
export function montarFundo() {
  if ($('.fundo')) return;
  const f = document.createElement('div');
  f.className = 'fundo';
  f.setAttribute('aria-hidden', 'true');
  f.innerHTML = '<i class="aurora"></i><i class="grade-luz"></i><i class="orbe a"></i><i class="orbe b"></i><i class="orbe c"></i><i class="orbe vermelha"></i><i class="gota a"></i><i class="gota b"></i><i class="gota c"></i>';
  document.body.prepend(f);
  const barra = document.createElement('i');
  barra.className = 'progresso';
  barra.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barra);
  const rolagem = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    barra.style.setProperty('--rolagem', max > 0 ? (window.scrollY / max).toFixed(3) : 0);
  };
  window.addEventListener('scroll', rolagem, { passive: true });
  if (semMovimento()) return;

  const gotas = $$('.gota, .orbe', f);
  const grade = $('.grade-luz', f);
  let pendente = false;
  let ultimo = null;
  window.addEventListener('pointermove', (e) => {
    ultimo = e;
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(() => {
      const ev = ultimo;
      const nx = ev.clientX / window.innerWidth - 0.5;
      const ny = ev.clientY / window.innerHeight - 0.5;
      // camadas do fundo se movem em profundidades diferentes
      gotas.forEach((g, i) => { g.style.translate = `${nx * (10 + i * 6)}px ${ny * (10 + i * 6)}px`; });
      grade.style.setProperty('--gx', `${(nx + 0.5) * 100}%`);
      grade.style.setProperty('--gy', `${(ny + 0.5) * 100}%`);
      // luz que segue o cursor nos cartões
      const card = ev.target.closest && ev.target.closest('.group, .idcard');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${ev.clientX - r.left}px`);
        card.style.setProperty('--my', `${ev.clientY - r.top}px`);
        if (card.classList.contains('idcard')) {
          const rx = ((ev.clientY - r.top) / r.height - 0.5) * -10;
          const ry = ((ev.clientX - r.left) / r.width - 0.5) * 12;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
        }
      }
      // botões magnéticos
      const b = ev.target.closest && ev.target.closest('.btn:not([disabled])');
      $$('.btn.ima').forEach((x) => { if (x !== b) { x.classList.remove('ima'); x.style.transform = ''; } });
      if (b) {
        const r = b.getBoundingClientRect();
        const mx = (ev.clientX - (r.left + r.width / 2)) / r.width;
        const my = (ev.clientY - (r.top + r.height / 2)) / r.height;
        b.classList.add('ima');
        b.style.transform = `translate(${mx * 8}px, ${my * 6 - 2}px)`;
      }
      pendente = false;
    });
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const card = e.target.closest && e.target.closest('.idcard');
    if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
  });
  // onda que nasce onde o botão foi tocado
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .close, .menu-btn, .recolher, .check');
    if (!b) return;
    const r = b.getBoundingClientRect();
    const lado = Math.max(r.width, r.height) * 2.2;
    const o = document.createElement('span');
    o.className = 'onda-el';
    o.style.cssText = `width:${lado}px;height:${lado}px;left:${e.clientX - r.left - lado / 2}px;top:${e.clientY - r.top - lado / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.overflow = 'hidden';
    b.appendChild(o);
    setTimeout(() => o.remove(), 700);
  });
}

// abertura com o logo, uma vez por sessão
export function abertura(texto) {
  if (semMovimento()) return;
  try { if (sessionStorage.getItem('cta-abertura')) return; sessionStorage.setItem('cta-abertura', '1'); } catch (e) { /* segue */ }
  const a = document.createElement('div');
  a.className = 'abertura';
  a.setAttribute('aria-hidden', 'true');
  a.innerHTML = `<div class="logo"><div class="letras"><span>C</span><span>T</span><span>A</span></div><i class="linha"></i><small>${esc(texto)}</small></div>`;
  document.body.appendChild(a);
  a.addEventListener('click', () => a.remove());
  setTimeout(() => a.remove(), 2400);
}

// faíscas e anel de confirmação saindo de um elemento
export function explodir(el, cor) {
  if (semMovimento() || !el) return;
  const r = el.getBoundingClientRect();
  const e = document.createElement('div');
  e.className = 'explosao';
  e.style.left = `${r.left + r.width / 2}px`;
  e.style.top = `${r.top + r.height / 2}px`;
  const cores = cor ? [cor] : ['var(--done)', 'var(--red)', '#f2f2f3'];
  let html = '<b></b>';
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 50 + Math.random() * 50;
    html += `<i style="--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px;--c:${cores[i % cores.length]};animation-delay:${Math.random() * 60}ms"></i>`;
  }
  e.innerHTML = html;
  document.body.appendChild(e);
  setTimeout(() => e.remove(), 900);
}

// aviso deslizante no canto da tela
export function aviso(texto, tipo = 'ok') {
  let pilha = $('.avisos');
  if (!pilha) { pilha = document.createElement('div'); pilha.className = 'avisos'; pilha.setAttribute('role', 'status'); document.body.appendChild(pilha); }
  const a = document.createElement('div');
  a.className = `aviso${tipo === 'erro' ? ' erro' : ''}`;
  a.innerHTML = `<span class="ponto"><svg viewBox="0 0 12 12">${tipo === 'erro' ? '<path d="M3 3l6 6M9 3l-6 6"/>' : '<path d="M2 6.3l2.6 2.5L10 3.4"/>'}</svg></span><span>${esc(texto)}</span>`;
  pilha.appendChild(a);
  const sair = () => { a.classList.add('saindo'); setTimeout(() => a.remove(), 350); };
  a.addEventListener('click', sair);
  setTimeout(sair, 3200);
}

// títulos surgem palavra por palavra, com um brilho que passa por cima
export function titulos(raiz) {
  if (semMovimento()) return;
  $$('h1', raiz).forEach((h) => {
    if (h.dataset.animado) return;
    h.dataset.animado = '1';
    const palavras = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = palavras.map((p, i) => `<span class="palavra" aria-hidden="true"><span style="--p:${i}">${esc(p)}</span></span>`).join(' ');
    h.classList.add('brilho');
  });
}

// anima a entrada de uma tela: blocos sobem em sequência, linhas entram em cascata, números contam
export function animar(raiz) {
  raiz.classList.remove('sai');
  raiz.classList.remove('entra');
  void raiz.offsetWidth;
  raiz.classList.add('entra');
  $$('.group', raiz).forEach((g) => {
    g.classList.add('cascata');
    Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 14)));
  });
  titulos(raiz);
  contarNumeros(raiz);
}

export function contarNumeros(raiz) {
  $$('[data-conta]', raiz).forEach((el) => {
    const alvo = Number(el.dataset.conta);
    if (semMovimento() || !alvo) { el.textContent = alvo; return; }
    const inicio = performance.now();
    const dur = 900;
    const passo = (t) => {
      const p = Math.min(1, (t - inicio) / dur);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
}

// troca de tela com saída rápida e entrada animada
export function trocarTela(raiz, desenhar) {
  if (semMovimento() || !raiz.children.length) { desenhar(); animar(raiz); return; }
  raiz.classList.remove('entra');
  raiz.classList.add('sai');
  setTimeout(() => { desenhar(); animar(raiz); }, 170);
}

export function avatar(a, classe = 'avatar') {
  return `<span class="${classe}">${a.foto ? `<img src="${esc(a.foto)}" alt="">` : esc(iniciais(a.nome))}</span>`;
}

const CORES = {
  branca: 'var(--belt-white)', azul: 'var(--belt-blue)', roxa: 'var(--belt-purple)', marrom: 'var(--belt-brown)', preta: 'var(--belt-black)',
  cinza: 'var(--belt-gray)', amarela: 'var(--belt-yellow)', laranja: 'var(--belt-orange)', verde: 'var(--belt-green)',
};

export function faixa(g, altura) {
  if (!g) return '';
  const graus = Array.from({ length: g.graus || 0 }, () => '<i></i>').join('');
  return `<div class="belt${g.faixa === 'preta' ? ' black' : ''}" style="background:${CORES[g.faixa] || 'var(--belt-white)'}${altura ? `;height:${altura}px` : ''}" role="img" aria-label="Faixa ${esc(g.faixa)}${g.graus ? `, ${g.graus} ${g.graus === 1 ? 'grau' : 'graus'}` : ''}"><div class="tip">${graus}</div></div>`;
}

export function textoFaixa(g) {
  if (!g) return '';
  return `faixa ${g.faixa}${g.graus ? `, ${g.graus} ${g.graus === 1 ? 'grau' : 'graus'}` : ''}`;
}

export function faixasPara(infantil) { return infantil ? ['branca', 'cinza', 'amarela', 'laranja', 'verde'] : FAIXAS_ADULTO; }

export function abrirDialogo(titulo, html, aoMontar) {
  const wrap = document.createElement('div');
  wrap.className = 'dialog-wrap';
  wrap.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="dialog-head"><h2>${esc(titulo)}</h2><button class="close" type="button" data-fechar>Fechar</button></div>${html}</div>`;
  let fechado = false;
  const fechar = () => {
    if (fechado) return;
    fechado = true;
    document.removeEventListener('keydown', tecla);
    if (semMovimento()) { wrap.remove(); return; }
    wrap.classList.add('saindo');
    setTimeout(() => wrap.remove(), 220);
  };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-fechar]')) fechar(); });
  document.addEventListener('keydown', tecla);
  document.body.appendChild(wrap);
  const dlg = wrap.querySelector('.dialog');
  $$('.group', dlg).forEach((g) => { g.classList.add('cascata'); Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 14))); });
  const primeiro = wrap.querySelector('input:not([type=checkbox]), select, textarea');
  if (primeiro) setTimeout(() => primeiro.focus(), 60);
  if (aoMontar) aoMontar(dlg, fechar);
  return fechar;
}

export function mascararCelular(input, formatar) {
  input.addEventListener('input', () => {
    const fim = input.selectionStart === input.value.length;
    input.value = formatar(input.value);
    if (fim) input.setSelectionRange(input.value.length, input.value.length);
  });
}

// abas do site com um marcador que desliza até a aba atual
export function marcarAba(nav, rota) {
  $$('a', nav).forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + rota ? 'page' : 'false'));
  let marca = $('.marca', nav);
  if (!marca) { marca = document.createElement('span'); marca.className = 'marca'; nav.prepend(marca); }
  const atual = $('a[aria-current="page"]', nav);
  if (!atual) { marca.style.width = '0'; return; }
  marca.style.left = `${atual.offsetLeft}px`;
  marca.style.width = `${atual.offsetWidth}px`;
}
