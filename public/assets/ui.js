import { iniciais, FAIXAS_ADULTO } from './dados.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

export function avatar(a, classe = 'avatar') {
  return `<span class="${classe}">${a.foto ? `<img src="${esc(a.foto)}" alt="">` : esc(iniciais(a.nome))}</span>`;
}

const CORES = {
  branca: 'var(--belt-white)', azul: 'var(--belt-blue)', roxa: 'var(--belt-purple)', marrom: 'var(--belt-brown)', preta: 'var(--belt-black)',
  cinza: 'var(--belt-gray)', amarela: 'var(--belt-yellow)', laranja: 'var(--belt-orange)', verde: 'var(--belt-green)',
};

export function faixa(g) {
  if (!g) return '';
  const graus = Array.from({ length: g.graus || 0 }, () => '<i></i>').join('');
  return `<div class="belt${g.faixa === 'preta' ? ' black' : ''}" style="background:${CORES[g.faixa] || 'var(--belt-white)'}" role="img" aria-label="Faixa ${esc(g.faixa)}${g.graus ? `, ${g.graus} ${g.graus === 1 ? 'grau' : 'graus'}` : ''}"><div class="tip">${graus}</div></div>`;
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
  const fechar = () => { wrap.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-fechar]')) fechar(); });
  document.addEventListener('keydown', tecla);
  document.body.appendChild(wrap);
  const primeiro = wrap.querySelector('input, select, textarea');
  if (primeiro) primeiro.focus();
  if (aoMontar) aoMontar(wrap.querySelector('.dialog'), fechar);
  return fechar;
}

export function mascararCelular(input, formatar) {
  input.addEventListener('input', () => {
    const fim = input.selectionStart === input.value.length;
    input.value = formatar(input.value);
    if (fim) input.setSelectionRange(input.value.length, input.value.length);
  });
}

export function marcarAba(nav, rota) {
  $$('a', nav).forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + rota ? 'page' : 'false'));
}
