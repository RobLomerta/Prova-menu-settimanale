import { INGREDIENTS, inSeason } from '../data/ingredients.js';
import { RECIPES, BREAKFASTS } from '../data/recipes.js';

export const PROTEINS = {
  legumi: { label: 'Legumi', color: '#a0703c' },
  pesce: { label: 'Pesce', color: '#2f7fb8' },
  carne_bianca: { label: 'Carne bianca', color: '#d9922e' },
  carne_rossa: { label: 'Carne rossa', color: '#b8433a' },
  uova: { label: 'Uova', color: '#d6b52a' },
  formaggi: { label: 'Formaggi', color: '#8d7bc4' },
  vegetale: { label: 'Tofu, tempeh, seitan', color: '#4c9a5b' },
};

// Frequenze settimanali (14 pasti principali) ispirate alle linee guida
// per una sana alimentazione e alla piramide della dieta mediterranea.
export const REGIMES = {
  mediterranea: {
    label: 'Mediterranea (onnivora)',
    excl: [],
    targets: { legumi: 4, pesce: 3, carne_bianca: 2, carne_rossa: 1, uova: 2, formaggi: 2 },
  },
  flexitariana: {
    label: 'Flexitariana (poca carne)',
    excl: [],
    targets: { legumi: 5, pesce: 2, carne_bianca: 1, uova: 2, formaggi: 2, vegetale: 2 },
  },
  pescetariana: {
    label: 'Pescetariana',
    excl: ['meat'],
    targets: { legumi: 5, pesce: 3, uova: 2, formaggi: 2, vegetale: 2 },
  },
  vegetariana: {
    label: 'Vegetariana',
    excl: ['meat', 'fish'],
    targets: { legumi: 6, uova: 3, formaggi: 3, vegetale: 2 },
  },
  vegana: {
    label: 'Vegana',
    excl: ['meat', 'fish', 'dairy', 'egg', 'honey'],
    targets: { legumi: 8, vegetale: 6 },
  },
};

export const EXCLUSIONS = {
  egg: 'Uova',
  nuts: 'Frutta a guscio',
  mush: 'Funghi',
  pork: 'Maiale',
  shell: 'Crostacei e molluschi',
};

export const PORTIONS = { leggera: 0.85, normale: 1, abbondante: 1.2 };

export const DEFAULT_SETTINGS = {
  regime: 'mediterranea',
  gluten: false,
  lactose: false,
  exclude: [],
  portion: 'normale',
  twoShops: true,
  breakfast: true,
  leftovers: 2,
  month: new Date().getMonth() + 1,
};

const VEGAN_TAGS = new Set(['dairy', 'egg', 'honey']);

function resolveIngredient(id, excluded, vegan, depth = 0) {
  const ing = INGREDIENTS[id];
  if (!ing) throw new Error(`Ingrediente sconosciuto: ${id}`);
  if (depth > 3) return null;
  const bad = (ing.t || []).filter((t) => excluded.has(t));
  if (!bad.length) return id;
  const sub = ing.sub || {};
  if (vegan && sub.vegan && bad.some((t) => VEGAN_TAGS.has(t))) {
    return resolveIngredient(sub.vegan, excluded, vegan, depth + 1);
  }
  if (sub.lactose && bad.includes('lactose')) return resolveIngredient(sub.lactose, excluded, vegan, depth + 1);
  if (sub.gluten && bad.includes('gluten')) return resolveIngredient(sub.gluten, excluded, vegan, depth + 1);
  return null;
}

/** Adatta una ricetta al regime/intolleranze. Restituisce null se incompatibile. */
export function resolveRecipe(recipe, ctx) {
  const ing = [];
  const notes = [];
  const idMap = {};
  for (const [id, q] of Object.entries(recipe.i)) {
    const rid = resolveIngredient(id, ctx.excluded, ctx.vegan);
    if (!rid) return null;
    idMap[id] = rid;
    if (rid !== id) notes.push(`${INGREDIENTS[id].n} → ${INGREDIENTS[rid].n}`);
    const u = INGREDIENTS[rid].u;
    const qty = u === 'pz' ? q : Math.round(q * ctx.factor);
    ing.push({ id: rid, q: qty });
  }
  const pantry = [];
  for (const id of recipe.d || []) {
    const rid = resolveIngredient(id, ctx.excluded, ctx.vegan);
    if (!rid) return null;
    if (rid !== id) notes.push(`${INGREDIENTS[id].n} → ${INGREDIENTS[rid].n}`);
    pantry.push(rid);
  }
  const fish = ing.some(({ id }) => (INGREDIENTS[id].t || []).includes('fish'));
  const outOfSeason = ing.filter(({ id }) => INGREDIENTS[id].f && !inSeason(INGREDIENTS[id], ctx.month)).map(({ id }) => id);
  return { ...recipe, ing, pantry, notes, fish, outOfSeason, idMap };
}

/** Prepara il contesto: ricette compatibili e obiettivi di frequenza. */
export function buildContext(settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const regime = REGIMES[s.regime] || REGIMES.mediterranea;
  const excluded = new Set(regime.excl);
  if (s.gluten) excluded.add('gluten');
  if (s.lactose) excluded.add('lactose');
  for (const e of s.exclude || []) excluded.add(e);
  if (excluded.has('fish')) excluded.add('shell');

  const ctx = {
    settings: s,
    excluded,
    vegan: s.regime === 'vegana',
    factor: PORTIONS[s.portion] || 1,
    month: s.month,
    recipes: {},
    breakfasts: {},
  };
  for (const r of RECIPES) {
    const res = resolveRecipe(r, ctx);
    if (res) ctx.recipes[r.id] = res;
  }
  for (const b of BREAKFASTS) {
    const res = resolveRecipe({ ...b, p: 'colazione', m: 'B' }, { ...ctx, factor: 1 });
    if (res) ctx.breakfasts[b.id] = res;
  }
  ctx.targets = effectiveTargets(regime.targets, ctx.recipes);
  return ctx;
}

/** Se una categoria non ha ricette disponibili (es. uova escluse), ridistribuisce i pasti. */
function effectiveTargets(targets, recipes) {
  const available = new Set(Object.values(recipes).map((r) => r.p));
  const out = {};
  let missing = 0;
  for (const [cat, n] of Object.entries(targets)) {
    if (available.has(cat)) out[cat] = n;
    else missing += n;
  }
  const fallback = ['legumi', 'vegetale', 'uova', 'formaggi', 'carne_bianca', 'pesce'].filter((c) => available.has(c));
  let i = 0;
  while (missing > 0 && fallback.length) {
    const c = fallback[i % Math.min(2, fallback.length)];
    out[c] = (out[c] || 0) + 1;
    missing--;
    i++;
  }
  return out;
}
