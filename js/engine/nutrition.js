import { INGREDIENTS, gramsOf } from '../data/ingredients.js';

export const ZERO = Object.freeze({ kcal: 0, p: 0, c: 0, f: 0 });

/** Valori nutrizionali di una quantità di un ingrediente. */
export function nutrientsOfItem(id, q) {
  const ing = INGREDIENTS[id];
  if (!ing?.nu) return { ...ZERO };
  const g = gramsOf(id, q) / 100;
  const [kcal, p, c, f] = ing.nu;
  return { kcal: kcal * g, p: p * g, c: c * g, f: f * g };
}

/** Somma dei valori di una lista [{id, q}]. */
export function nutrientsOf(items) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const { id, q } of items || []) {
    const n = nutrientsOfItem(id, q);
    t.kcal += n.kcal;
    t.p += n.p;
    t.c += n.c;
    t.f += n.f;
  }
  return t;
}

export function addN(a, b) {
  return { kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f };
}

export function scaleN(a, k) {
  return { kcal: a.kcal * k, p: a.p * k, c: a.c * k, f: a.f * k };
}

/** Ripartizione percentuale dell'energia tra proteine, carboidrati e grassi. */
export function energySplit(n) {
  const p = n.p * 4;
  const c = n.c * 4;
  const f = n.f * 9;
  const tot = p + c + f || 1;
  return { p: (p / tot) * 100, c: (c / tot) * 100, f: (f / tot) * 100 };
}

/** Grammi di B con lo stesso valore (kcal | p | c | f) di q di A. */
export function equivalent(fromId, q, toId, basis = 'kcal') {
  const a = nutrientsOfItem(fromId, q)[basis];
  const per = nutrientsOfItem(toId, INGREDIENTS[toId].u === 'pz' ? 1 : 100)[basis];
  if (!per) return null;
  const r = a / per;
  return INGREDIENTS[toId].u === 'pz' ? r : r * 100;
}

export const fmtN = (x) => Math.round(x).toLocaleString('it-IT');
