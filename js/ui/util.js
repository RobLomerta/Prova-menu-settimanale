import { INGREDIENTS, CATEGORIES, CATEGORY_ORDER } from '../data/ingredients.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const r0 = (x) => Math.round(x).toLocaleString('it-IT');
export const shortName = (id) => INGREDIENTS[id].n.replace(/ \(.*\)$/, '');

export function macroLine(n, { kcal = true } = {}) {
  return `${kcal ? `<strong>${r0(n.kcal)} kcal</strong> · ` : ''}<span class="m-p">P ${r0(n.p)}</span> · <span class="m-c">C ${r0(n.c)}</span> · <span class="m-f">G ${r0(n.f)}</span>`;
}

/** <option> di tutti gli ingredienti, raggruppati per reparto. */
export function ingredientOptions(selected) {
  return CATEGORY_ORDER.map((cat) => {
    const items = Object.entries(INGREDIENTS)
      .filter(([, i]) => i.c === cat && (!i.pan || i.nu?.[0] > 0))
      .sort((a, b) => a[1].n.localeCompare(b[1].n, 'it'));
    if (!items.length) return '';
    return `<optgroup label="${esc(CATEGORIES[cat])}">${items
      .map(([id, i]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${esc(i.n)}</option>`)
      .join('')}</optgroup>`;
  }).join('');
}

export function unitOf(id) {
  return INGREDIENTS[id].u;
}

export function deltaHtml(a, b, unit = '') {
  const d = Math.round(b - a);
  if (!d) return '<span class="delta zero">=</span>';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('it-IT')}${unit}</span>`;
}

/** Tooltip condiviso per gli elementi con data-tip (mouse e tocco). */
export function installTooltip() {
  const tip = document.createElement('div');
  tip.className = 'viz-tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  const show = (el, x, y) => {
    tip.innerHTML = el.dataset.tip;
    tip.hidden = false;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2))}px`;
    tip.style.top = `${Math.max(8, y - h - 14)}px`;
  };
  document.addEventListener('mousemove', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el) show(el, e.clientX, e.clientY);
    else tip.hidden = true;
  });
  document.addEventListener('touchstart', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el) {
      const t = e.touches[0];
      show(el, t.clientX, t.clientY);
    } else tip.hidden = true;
  }, { passive: true });
  document.addEventListener('scroll', () => (tip.hidden = true), { passive: true });
}
