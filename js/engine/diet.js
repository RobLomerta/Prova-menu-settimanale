import { INGREDIENTS, inSeason } from '../data/ingredients.js';
import { RECIPES, BREAKFASTS, FREE_MEAL } from '../data/recipes.js';
import { FATTY_FISH } from '../data/nutrition.js';
import { analyzePlan, scaleToPortions } from './plan.js';
import { nutrientsOf } from './nutrition.js';

export const PROTEINS = {
  legumi: { label: 'Legumi', color: '#a0703c' },
  pesce: { label: 'Pesce', color: '#2f7fb8' },
  pesce_azzurro: { label: 'Pesce azzurro', color: '#2f7fb8' },
  pesce_bianco: { label: 'Pesce bianco', color: '#4a90a8' },
  carne_bianca: { label: 'Carne bianca', color: '#d9922e' },
  carne_rossa: { label: 'Carne rossa', color: '#b8433a' },
  affettati: { label: 'Affettati magri', color: '#c2577a' },
  uova: { label: 'Uova', color: '#c9a420' },
  formaggi: { label: 'Formaggi', color: '#8d7bc4' },
  vegetale: { label: 'Tofu, tempeh, seitan', color: '#4c9a5b' },
  libero: { label: 'Pasto libero', color: '#888888' },
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
  kcalTarget: null, // obiettivo calorico manuale (se non c'è un piano)
  usePlan: true, // usa il piano alimentare caricato (se presente)
  twoShops: true,
  breakfast: true,
  breakfastStyle: 'dolce', // dolce | salata | alternata
  leftovers: 2,
  month: new Date().getMonth() + 1,
};

const VEGAN_TAGS = new Set(['dairy', 'egg', 'honey']);
const DEFAULT_OIL = 10; // g di olio a pasto principale se non diversamente indicato

export function resolveIngredient(id, excluded, vegan, depth = 0) {
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

/** Adatta una ricetta al regime/intolleranze (quantità base). Restituisce null se incompatibile. */
export function resolveRecipe(recipe, ctx, { oil = true } = {}) {
  const ing = [];
  const notes = [];
  const idMap = {};
  for (const [id, q] of Object.entries(recipe.i)) {
    const rid = resolveIngredient(id, ctx.excluded, ctx.vegan);
    if (!rid) return null;
    idMap[id] = rid;
    if (rid !== id) notes.push(`${INGREDIENTS[id].n} → ${INGREDIENTS[rid].n}`);
    ing.push({ id: rid, q });
  }
  const pantry = [];
  for (const id of recipe.d || []) {
    const rid = resolveIngredient(id, ctx.excluded, ctx.vegan);
    if (!rid) return null;
    if (rid !== id) notes.push(`${INGREDIENTS[id].n} → ${INGREDIENTS[rid].n}`);
    pantry.push(rid);
  }
  if (oil && pantry.includes('olio')) ing.push({ id: 'olio', q: recipe.oil ?? DEFAULT_OIL });
  const fish = ing.some(({ id }) => (INGREDIENTS[id].t || []).includes('fish'));
  const outOfSeason = ing.filter(({ id }) => INGREDIENTS[id].f && !inSeason(INGREDIENTS[id], ctx.month)).map(({ id }) => id);
  return { ...recipe, ing, pantry, notes, fish, outOfSeason, idMap };
}

/** Moltiplica solo carboidrati, proteine e condimento (le verdure restano libere). */
function scaleMain(items, k) {
  if (k === 1) return items;
  return items.map((x) => {
    const ing = INGREDIENTS[x.id];
    if (!['carb', 'prot', 'fat'].includes(ing.ro)) return x;
    const q = ing.u === 'pz' ? Math.max(ing.ro === 'prot' ? 1 : 0.5, Math.round(x.q * k * 2) / 2) : Math.round(x.q * k);
    return { ...x, q };
  });
}

/** Prepara il contesto: ricette compatibili, porzioni, obiettivi. */
export function buildContext(settings, dietPlan = null) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const regime = REGIMES[s.regime] || REGIMES.mediterranea;
  const excluded = new Set(regime.excl);
  if (s.gluten) excluded.add('gluten');
  if (s.lactose) excluded.add('lactose');
  for (const e of s.exclude || []) excluded.add(e);
  if (excluded.has('fish')) excluded.add('shell');

  const plan = s.usePlan && dietPlan?.meals?.length ? dietPlan : null;
  const analysis = plan ? analyzePlan(plan) : null;

  const ctx = {
    settings: s,
    excluded,
    vegan: s.regime === 'vegana',
    month: s.month,
    plan,
    analysis,
    recipes: {},
    breakfasts: {},
  };

  // Obiettivi nutrizionali
  if (plan) {
    const t = plan.targets || {};
    ctx.nutritionTarget = {
      kcal: t.kcal || Math.round(analysis.est.kcal),
      p: t.p || Math.round(analysis.est.p),
      c: t.c || Math.round(analysis.est.c),
      f: t.f || Math.round(analysis.est.f),
    };
  } else if (s.kcalTarget) {
    ctx.nutritionTarget = { kcal: s.kcalTarget, p: null, c: null, f: null };
  }

  // Frequenze: quelle del piano (se indicate) oppure quelle del regime
  const freq = plan?.freq && Object.values(plan.freq).some((v) => v > 0) ? plan.freq : null;
  ctx.splitFish = !!(freq && (freq.pesce_azzurro != null || freq.pesce_bianco != null));
  ctx.freeSlot = freq?.libero > 0 ? plan.freeSlot ?? 11 : null;

  const portionsFor = (key) => analysis?.byKey[key]?.portions || analysis?.byKey[key === 'cena' ? 'pranzo' : 'cena']?.portions || null;
  const portions = { P: portionsFor('pranzo'), C: portionsFor('cena') };

  // Fattore porzioni senza piano: da obiettivo calorico manuale, altrimenti dalla scelta "porzioni"
  let factor = PORTIONS[s.portion] || 1;

  const resolved = [];
  for (const r of RECIPES) {
    const res = resolveRecipe(r, ctx);
    if (res) resolved.push(res);
  }
  for (const b of BREAKFASTS) {
    const res = resolveRecipe({ ...b, p: 'colazione', m: 'B' }, ctx, { oil: false });
    if (res) ctx.breakfasts[b.id] = res;
  }

  if (!plan && s.kcalTarget) {
    const avgMain = resolved.reduce((a, r) => a + nutrientsOf(r.ing).kcal, 0) / (resolved.length || 1);
    const bfs = Object.values(ctx.breakfasts);
    const avgBf = s.breakfast && bfs.length ? bfs.reduce((a, r) => a + nutrientsOf(r.ing).kcal, 0) / bfs.length : 0;
    const fruit = 150; // 2 porzioni di frutta
    factor = Math.min(1.8, Math.max(0.55, (s.kcalTarget - avgBf - fruit) / (2 * avgMain)));
  }
  ctx.factor = factor;

  for (const r of resolved) {
    const cat = r.p === 'pesce' && ctx.splitFish
      ? r.ing.some((x) => FATTY_FISH.includes(x.id)) ? 'pesce_azzurro' : 'pesce_bianco'
      : r.p;
    const ingBy = plan
      ? { P: scaleToPortions(r.ing, portions.P), C: scaleToPortions(r.ing, portions.C) }
      : { P: scaleMain(r.ing, factor), C: scaleMain(r.ing, factor) };
    ctx.recipes[r.id] = { ...r, cat, base: r.ing, ingBy, ing: ingBy.C };
  }
  if (ctx.freeSlot != null) {
    ctx.recipes.libero = { ...FREE_MEAL, cat: 'libero', ing: [], base: [], ingBy: { P: [], C: [] }, pantry: [], notes: [], fish: false, outOfSeason: [], idMap: {} };
  }

  const baseTargets = freq
    ? Object.fromEntries(Object.entries(freq).filter(([, v]) => v > 0))
    : regime.targets;
  ctx.targets = effectiveTargets(baseTargets, ctx.recipes);
  return ctx;
}

/** Se una categoria non ha ricette disponibili (es. uova escluse), ridistribuisce i pasti. */
function effectiveTargets(targets, recipes) {
  const available = new Set(Object.values(recipes).map((r) => r.cat));
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
