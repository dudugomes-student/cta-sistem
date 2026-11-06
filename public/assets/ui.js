import { iniciais, FAIXAS_ADULTO } from './dados.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

const semMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// fundo com esferas escuras e gotas de vidro, uma vez por página
export function montarFundo() {
  if ($('.fundo')) return;
  const f = document.createElement('div');
  f.className = 'fundo';
  f.setAttribute('aria-hidden', 'true');
  f.innerHTML = '<i class="orbe a"></i><i class="orbe b"></i><i class="orbe c"></i><i class="orbe vermelha"></i><i class="gota a"></i><i class="gota b"></i><i class="gota c"></i>';
  document.body.prepend(f);
  if (semMovimento()) return;
  // as gotas acompanham o mouse de leve
  let pendente = false;
  window.addEventListener('pointermove', (e) => {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(() => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 18;
      const dy = (e.clientY / window.innerHeight - 0.5) * 18;
      f.style.transform = `translate(${dx}px, ${dy}px)`;
      pendente = false;
    });
  });
  f.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1)';
  // botões com brilho onde foram tocados
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--x', `${e.clientX - r.left}px`);
    b.style.setProperty('--y', `${e.clientY - r.top}px`);
    b.classList.add('onda');
    setTimeout(() => b.classList.remove('onda'), 30);
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
