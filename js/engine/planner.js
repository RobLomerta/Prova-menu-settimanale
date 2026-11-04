import { INGREDIENTS, isPerishable, inSeason } from '../data/ingredients.js';
import { FRUIT_IDS } from '../data/nutrition.js';
import { resolveIngredient } from './diet.js';
import { parseLine, qtyFor, MEAL_KEYS } from './plan.js';
import { nutrientsOf, nutrientsOfItem } from './nutrition.js';
import { SLOTS, slotDay, slotMeal, isWorkLunch, rng, shopFor } from './common.js';

// ---------------------------------------------------------------------------
// Fabbisogni: quanto serve di ogni ingrediente e da quale spesa
// ---------------------------------------------------------------------------

/** entries: [{ r: ricettaRisolta, day, meal, label? }] */
export function collectNeeds(entries, ctx) {
  const needs = new Map();
  const issues = [];
  for (const e of entries) {
    for (const { id, q } of e.ing ?? e.r.ing) {
      const ing = INGREDIENTS[id];
      const { shop, since } = shopFor(ing, e.day, e.meal, ctx.settings.twoShops);
      if (since > (ing.sh ?? 365)) issues.push({ id, day: e.day, meal: e.meal, r: e.r });
      const key = `${shop}|${id}`;
      let n = needs.get(key);
      if (!n) needs.set(key, (n = { id, shop, q: 0, uses: [] }));
      n.q += q;
      if (e.label) n.uses.push(e.label);
    }
  }
  return { needs, issues };
}

/** Spreco stimato: quota di confezioni deperibili aperte e non finite. */
export function wasteScore(needs) {
  let waste = 0;
  const loose = new Set();
  for (const n of needs.values()) {
    const ing = INGREDIENTS[n.id];
    if (ing.pan || !isPerishable(ing)) continue;
    if (ing.pk > 0) {
      const packs = Math.ceil(n.q / ing.pk - 1e-9);
      waste += (packs * ing.pk - n.q) / ing.pk;
    } else {
      loose.add(n.id);
    }
  }
  return { waste, loose: loose.size };
}

// ---------------------------------------------------------------------------
// Valutazione di un piano (più basso = migliore)
// ---------------------------------------------------------------------------

/** Ricetta mostrata in uno slot (tiene conto dell'alternativa senza pesce). */
export const shownId = (sl) => (sl.useAlt && sl.alt ? sl.alt : sl.r);

/** Ingredienti effettivi di uno slot: modifiche manuali, oppure ricetta porzionata per pranzo/cena. */
export function slotIngredients(sl, s, ctx, { useAlt = true } = {}) {
  const id = useAlt ? shownId(sl) : sl.r;
  if (sl.custom && sl.custom.r === id) return sl.custom.ing;
  const r = ctx.recipes[id];
  const base = r.ingBy?.[slotMeal(s)] || r.ing;
  if (!sl.fit || sl.fit === 1) return base;
  return base.map((x) => {
    const ing = INGREDIENTS[x.id];
    if (ing.ro !== 'carb') return x;
    return { ...x, q: ing.u === 'pz' ? Math.max(0.5, Math.round(x.q * sl.fit * 2) / 2) : Math.round(x.q * sl.fit) };
  });
}

/**
 * Adatta le porzioni di carboidrati di pranzo e cena perché ogni giorno si avvicini
 * all'obiettivo calorico (entro ±40%). Non tocca i pasti modificati a mano.
 */
export function fitPlan(plan, ctx) {
  const target = ctx.nutritionTarget?.kcal;
  for (const sl of plan.slots) sl.fit = 1;
  if (!target || ctx.settings.fitPortions === false) return plan;
  const extras = extraEntries(plan, ctx);
  for (let day = 0; day < 7; day++) {
    const ss = [day * 2, day * 2 + 1];
    if (ss.some((s) => plan.slots[s].r === 'libero' || shownId(plan.slots[s]) === 'libero')) continue;
    // con un piano alimentare le verdure sono "libere": non contano per l'obiettivo, come nel piano
    const counted = (items) => (ctx.plan ? items.filter((x) => INGREDIENTS[x.id].ro !== 'veg') : items);
    let total = extras.filter((e) => e.day === day).reduce((a, e) => a + nutrientsOf(counted(e.ing)).kcal, 0);
    let carbK = 0;
    for (const s of ss) {
      const sl = plan.slots[s];
      const items = slotIngredients(sl, s, ctx);
      total += nutrientsOf(counted(items)).kcal;
      if (!(sl.custom && sl.custom.r === shownId(sl))) {
        carbK += items.filter((x) => INGREDIENTS[x.id].ro === 'carb').reduce((a, x) => a + nutrientsOfItem(x.id, x.q).kcal, 0);
      }
    }
    if (carbK <= 0) continue;
    const k = Math.min(1.4, Math.max(0.6, 1 + (target - total) / carbK));
    for (const s of ss) plan.slots[s].fit = Math.round(k * 100) / 100;
  }
  return plan;
}

export function slotEntries(slots, ctx, { useAlt = false } = {}) {
  return slots.map((sl, s) => ({
    r: ctx.recipes[useAlt ? shownId(sl) : sl.r],
    ing: slotIngredients(sl, s, ctx, { useAlt }),
    day: slotDay(s),
    meal: slotMeal(s),
  }));
}

export function evaluate(slots, ctx) {
  const R = ctx.recipes;
  const parts = { proteine: 0, varieta: 0, stagione: 0, freschezza: 0, spreco: 0, praticita: 0, avanzi: 0 };
  const counts = {};
  const seen = new Set();
  const bases = {};
  let pairs = 0;

  for (let s = 0; s < SLOTS; s++) {
    const sl = slots[s];
    const r = R[sl.r];
    const day = slotDay(s);
    const meal = slotMeal(s);
    counts[r.cat] = (counts[r.cat] || 0) + 1;
    if (sl.lo) pairs++;
    else {
      if (seen.has(r.id)) parts.varieta += 15;
      seen.add(r.id);
      if (r.b !== 'libero') bases[r.b] = (bases[r.b] || 0) + 1;
    }
    if (meal === 'C') {
      const lunch = R[slots[s - 1].r];
      if (lunch.cat === r.cat && r.cat !== 'libero') parts.varieta += 3;
      if (lunch.b === r.b && r.b !== 'libero') parts.varieta += 2;
      if (day < 5 && !r.ahead && r.t > 40) parts.praticita += 1.5;
    } else if (s > 0 && !sl.lo) {
      if (R[slots[s - 1].r].cat === r.cat) parts.varieta += 1.5;
    }
    if (isWorkLunch(s) && r.t > 25 && !r.ahead && !sl.lo) parts.praticita += 1;
    parts.stagione += r.outOfSeason.length * 3;
  }

  const cats = new Set([...Object.keys(ctx.targets), ...Object.keys(counts)]);
  for (const c of cats) parts.proteine += Math.abs((counts[c] || 0) - (ctx.targets[c] || 0)) * 4;
  for (const n of Object.values(bases)) if (n > 3) parts.varieta += (n - 3) * 1.5;
  parts.avanzi = Math.abs(pairs - (ctx.settings.leftovers || 0)) * 2.5;

  const { needs, issues } = collectNeeds(slotEntries(slots, ctx), ctx);
  for (const is of issues) parts.freschezza += INGREDIENTS[is.id].frz ? 1.5 : 5;
  const w = wasteScore(needs);
  parts.spreco = w.waste * 3 + w.loose * 0.25;

  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total, parts, counts, pairs };
}

// ---------------------------------------------------------------------------
// Ottimizzazione (simulated annealing)
// ---------------------------------------------------------------------------

export function candidatesFor(ctx) {
  return Array.from({ length: SLOTS }, (_, s) => {
    if (s === ctx.freeSlot) return ['libero'];
    const meal = slotMeal(s);
    const work = isWorkLunch(s);
    return Object.values(ctx.recipes)
      .filter((r) => r.id !== 'libero' && r.m.includes(meal) && (!work || r.port))
      .map((r) => r.id);
  });
}

const canPair = (r) => r && r.batch && r.port;

function isValid(slots, ctx, candSets) {
  for (let s = 0; s < SLOTS; s++) {
    const sl = slots[s];
    if (!candSets[s].has(sl.r) && !sl.locked) return false;
    if (sl.lo) {
      if (s % 2 !== 0 || s < 2 || slotDay(s) > 4) return false;
      if (slots[s - 1].r !== sl.r || !canPair(ctx.recipes[sl.r])) return false;
    }
  }
  return true;
}

function randomMove(slots, cand, ctx, rand) {
  const next = slots.map((x) => ({ ...x }));
  const free = [];
  for (let s = 0; s < SLOTS; s++) if (!slots[s].locked) free.push(s);
  if (!free.length) return null;
  const k = rand();

  if (k < 0.6) {
    const s = rand.pick(free);
    const r = rand.pick(cand[s]);
    if (r === slots[s].r) return null;
    if (s % 2 === 1 && s + 1 < SLOTS && slots[s + 1].lo) {
      if (slots[s + 1].locked) return null;
      next[s + 1].lo = false; // la cena cambia: il pranzo resta, non più come avanzo
    }
    next[s] = { r, lo: false };
    return next;
  }
  if (k < 0.8) {
    const a = rand.pick(free);
    const b = rand.pick(free);
    if (a === b || slots[a].lo || slots[b].lo) return null;
    if ((a % 2 && slots[a + 1]?.lo) || (b % 2 && slots[b + 1]?.lo)) return null;
    next[a] = { r: slots[b].r, lo: false };
    next[b] = { r: slots[a].r, lo: false };
    return next;
  }
  // crea / rompi una coppia "cena → pranzo del giorno dopo"
  const d = Math.floor(rand() * 4); // cene lun-gio → pranzi mar-ven
  const s = d * 2 + 1;
  const l = s + 1;
  if (slots[l].locked) return null;
  if (slots[l].lo) {
    next[l] = { r: rand.pick(cand[l]), lo: false };
  } else if (canPair(ctx.recipes[slots[s].r])) {
    next[l] = { r: slots[s].r, lo: true };
  } else return null;
  return next;
}

function initialSlots(cand, fixed, rand) {
  return Array.from({ length: SLOTS }, (_, s) =>
    fixed[s] ? { r: fixed[s].r, lo: !!fixed[s].lo, locked: true } : { r: rand.pick(cand[s]), lo: false },
  );
}

/**
 * Genera il piano settimanale.
 * @param ctx      contesto da buildContext()
 * @param options  { seed, fixed: array di 14 elementi (slot bloccati o null), iterations }
 */
export function generatePlan(ctx, { seed = Date.now(), fixed = [], iterations = 3500, restarts = 3 } = {}) {
  const rand = rng(seed);
  const cand = candidatesFor(ctx);
  cand.forEach((c, s) => {
    if (!c.length) throw new Error('Non ci sono abbastanza ricette compatibili con le scelte fatte. Prova a ridurre le esclusioni.');
  });
  const candSets = cand.map((c) => new Set(c));
  const fx = Array.from({ length: SLOTS }, (_, s) => (fixed[s] && candSets[s].has(fixed[s].r) ? fixed[s] : null));
  // un pranzo-avanzo bloccato ha senso solo se è bloccata anche la cena
  for (let s = 0; s < SLOTS; s++) if (fx[s]?.lo && !fx[s - 1]) fx[s] = { ...fx[s], lo: false };

  let best = null;
  let bestScore = Infinity;
  for (let rs = 0; rs < restarts; rs++) {
    let slots = initialSlots(cand, fx, rand);
    let cur = evaluate(slots, ctx).total;
    const T0 = 4;
    const T1 = 0.02;
    for (let it = 0; it < iterations; it++) {
      const T = T0 * Math.pow(T1 / T0, it / iterations);
      const next = randomMove(slots, cand, ctx, rand);
      if (!next) continue;
      for (let s = 0; s < SLOTS; s++) next[s].locked = slots[s].locked;
      if (!isValid(next, ctx, candSets)) continue;
      const e = evaluate(next, ctx).total;
      if (e <= cur || rand() < Math.exp((cur - e) / T)) {
        slots = next;
        cur = e;
        if (cur < bestScore) {
          bestScore = cur;
          best = slots;
        }
      }
    }
    if (!best || cur < bestScore) {
      bestScore = cur;
      best = slots;
    }
  }

  const plan = {
    seed,
    slots: best.map((x, s) => ({ r: x.r, lo: !!x.lo, locked: !!x.locked, alt: null, useAlt: false, custom: fx[s]?.custom || null })),
    extras: [],
  };
  assignAlternatives(plan, ctx, rand);
  plan.extras = buildExtras(plan, ctx, rand);
  return fitPlan(plan, ctx);
}

// ---------------------------------------------------------------------------
// Alternative senza pesce
// ---------------------------------------------------------------------------

export function assignAlternatives(plan, ctx, rand = rng(plan.seed || 1), previous = []) {
  const cand = candidatesFor(ctx);
  const inPlan = new Set(plan.slots.map((x) => x.r));
  const used = new Set();
  const planIng = new Set();
  for (const sl of plan.slots) for (const { id } of ctx.recipes[sl.r].ing) if (isPerishable(INGREDIENTS[id])) planIng.add(id);

  plan.slots.forEach((sl, s) => {
    const r = ctx.recipes[sl.r];
    if (!r.fish) {
      sl.alt = null;
      sl.useAlt = false;
      return;
    }
    const prev = previous[s];
    let bestId = null;
    let best = Infinity;
    for (const id of cand[s]) {
      const a = ctx.recipes[id];
      if (a.fish) continue;
      let sc = rand() * 0.5;
      if (inPlan.has(id)) sc += 20;
      if (used.has(id)) sc += 20;
      if (id === r.alt) sc -= 3;
      if (prev && prev.r === sl.r && prev.alt === id) sc -= 10; // stabilità
      sc += a.outOfSeason.length * 3;
      for (const { id: iid } of a.ing) if (planIng.has(iid)) sc -= 1;
      if (a.b === r.b) sc -= 0.5;
      if (sc < best) {
        best = sc;
        bestId = id;
      }
    }
    sl.alt = bestId;
    if (!(prev && prev.r === sl.r && prev.useAlt)) sl.useAlt = false;
    else sl.useAlt = true;
    if (bestId) used.add(bestId);
  });
  return plan;
}

// ---------------------------------------------------------------------------
// Colazioni e spuntini
// ---------------------------------------------------------------------------
//
// plan.extras = [{ key, label, combos: [{ n, ing }] }]  — il giorno d usa combos[d % combos.length]

/** Voci dei pasti extra per ogni giorno (colazione, spuntini). */
export function extraEntries(plan, ctx) {
  const out = [];
  for (const ex of plan.extras || []) {
    if (!ex.combos?.length) continue;
    for (let day = 0; day < 7; day++) {
      const c = ex.combos[day % ex.combos.length];
      out.push({ key: ex.key, label: ex.label, name: c.n, ing: c.ing, r: { n: c.n, ing: c.ing, pantry: c.pantry || [] }, day, meal: 'B' });
    }
  }
  return out;
}

/** Mantengo il vecchio nome per compatibilità. */
export const breakfastEntries = extraEntries;

const BREAKFAST_CARBS = ['avena', 'avena_gf', 'fette_biscottate', 'gallette', 'pane', 'pane_gf'];

function concreteChoices(food, ctx, kind) {
  const all = rawChoices(food, ctx, kind);
  if (kind === 'colazione' && INGREDIENTS[food]?.ro === 'carb' && !BREAKFAST_CARBS.includes(food)) return [];
  return all;
}

function rawChoices(food, ctx, kind) {
  const ok = (id) => INGREDIENTS[id] && resolveIngredient(id, ctx.excluded, ctx.vegan);
  const seasonal = (ids) => {
    const r = ids.filter((id) => ok(id));
    const s = r.filter((id) => inSeason(INGREDIENTS[id], ctx.month));
    return s.length ? s : r;
  };
  if (food === 'FRUTTA') return seasonal(FRUIT_IDS.filter((f) => f !== 'frutta_mista'));
  if (food === 'AFFETTATI') return seasonal(['bresaola', 'fesa_affettata', 'prosciutto_cotto']);
  if (food === 'CARNE') return seasonal(kind === 'snack' ? ['fesa_affettata'] : ['pollo', 'tacchino']);
  if (food === 'PESCE') return seasonal(kind === 'snack' ? ['tonno'] : ['tonno', 'salmone']);
  if (kind === 'snack' && ['salmone', 'merluzzo', 'orata', 'pollo', 'tacchino', 'manzo'].includes(food)) return [];
  if (food === 'LEGUMI') return seasonal(['ceci', 'lenticchie']);
  if (food === 'VERDURE') return [];
  const rid = ok(food);
  if (!rid) return [];
  if (INGREDIENTS[rid].f && !inSeason(INGREDIENTS[rid], ctx.month)) return [];
  return [rid];
}

/** Una combinazione: un'opzione per ogni riga del pasto del piano. */
function planCombo(lines, ctx, rand, kind) {
  const ing = [];
  const names = [];
  for (const line of lines) {
    const viable = line.options
      .filter((o) => o.q != null)
      .map((o) => ({ o, choices: o.foods.flatMap((f) => concreteChoices(f, ctx, kind)) }))
      .filter((x) => x.choices.length);
    if (!viable.length) continue;
    // in uno spuntino marmellata o miele da soli sono l'ultima scelta
    const weight = (x) => (kind === 'snack' && x.choices.every((id) => ['marmellata', 'miele'].includes(id)) ? 0.25 : 1);
    const tot = viable.reduce((a, x) => a + weight(x), 0);
    let r = rand() * tot;
    let pick = viable[0];
    for (const x of viable) {
      r -= weight(x);
      if (r <= 0) { pick = x; break; }
    }
    const id = pick.choices[Math.floor(rand() * pick.choices.length)];
    const q = qtyFor(id, pick.o.q, pick.o.u);
    const unit = INGREDIENTS[id].u;
    ing.push({ id, q: unit === 'pz' ? Math.max(1, Math.round(q)) : Math.round(q) });
    names.push(INGREDIENTS[id].n.replace(/ \(.*\)$/, '').toLowerCase());
  }
  if (!ing.length) return null;
  const n = names.join(' + ');
  return { n: n[0].toUpperCase() + n.slice(1), ing };
}

function extrasFromPlan(ctx, rand) {
  const out = [];
  for (const meal of ctx.plan.meals) {
    if (meal.key === 'pranzo' || meal.key === 'cena') continue;
    const lines = meal.lines.map(parseLine).filter((l) => l.role !== 'veg');
    const k = meal.key === 'colazione' ? 2 : 3;
    const combos = [];
    const sigs = new Set();
    for (let t = 0; t < 30 && combos.length < k; t++) {
      const c = planCombo(lines, ctx, rand, meal.key === 'colazione' ? 'colazione' : 'snack');
      if (!c) break;
      const sig = c.ing.map((x) => x.id).sort().join();
      if (sigs.has(sig) && t < 25) continue;
      sigs.add(sig);
      combos.push(c);
    }
    if (combos.length) out.push({ key: meal.key, label: meal.label || MEAL_KEYS[meal.key], combos });
  }
  return out;
}

function extrasDefault(plan, ctx, rand) {
  const out = [];
  if (ctx.settings.breakfast) {
    const ids = chooseBreakfasts(plan, ctx, rand);
    const combos = ids.map((id) => {
      const b = ctx.breakfasts[id];
      return { n: b.n, ing: b.ing.map((x) => ({ ...x })), pantry: b.pantry };
    });
    if (combos.length) out.push({ key: 'colazione', label: 'Colazione', combos });
  }
  out.push({ key: 'spuntino2', label: 'Frutta (spuntini)', combos: [{ n: '2 porzioni di frutta di stagione', ing: [{ id: 'frutta_mista', q: 300 }] }] });
  return out;
}

/** Costruisce colazioni e spuntini, scegliendo le combinazioni che sprecano meno. */
export function buildExtras(plan, ctx, rand = Math.random) {
  if (!ctx.plan) return extrasDefault(plan, ctx, rand);
  const base = slotEntries(plan.slots, ctx, { useAlt: true });
  let best = null;
  let bestScore = Infinity;
  for (let t = 0; t < 25; t++) {
    const extras = extrasFromPlan(ctx, rand);
    const { needs, issues } = collectNeeds([...base, ...extraEntries({ extras }, ctx)], ctx);
    const sc = wasteScore(needs).waste * 3 + issues.length * 2 + rand();
    if (sc < bestScore) {
      bestScore = sc;
      best = extras;
    }
  }
  return best || [];
}

export function chooseBreakfasts(plan, ctx, rand = Math.random) {
  const ids = Object.keys(ctx.breakfasts);
  if (!ids.length) return [];
  if (ids.length === 1) return [ids[0]];
  const base = slotEntries(plan.slots, ctx, { useAlt: true });
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const extras = [{ key: 'colazione', combos: [ids[i], ids[j]].map((id) => ({ n: id, ing: ctx.breakfasts[id].ing })) }];
      const { needs, issues } = collectNeeds([...base, ...extraEntries({ extras }, ctx)], ctx);
      const sc = wasteScore(needs).waste * 3 + issues.length * 2 + rand() * 0.8;
      if (sc < bestScore) {
        bestScore = sc;
        best = [ids[i], ids[j]];
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Sostituzione di un singolo pasto
// ---------------------------------------------------------------------------

/** Restituisce un nuovo piano con il pasto `s` sostituito dalla migliore alternativa non ancora provata. */
export function replaceSlot(plan, s, ctx, tried = new Set(), rand = Math.random) {
  const cand = candidatesFor(ctx)[s];
  const scored = [];
  for (const id of cand) {
    if (id === plan.slots[s].r || tried.has(id)) continue;
    const slots = plan.slots.map((x) => ({ ...x }));
    slots[s] = { ...slots[s], r: id, lo: false, useAlt: false, custom: null };
    if (s % 2 === 1 && slots[s + 1]?.lo) slots[s + 1].lo = false;
    scored.push({ id, slots, score: evaluate(slots, ctx).total + rand() * 2 });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => a.score - b.score);
  const pick = scored[0];
  const next = { ...plan, slots: pick.slots };
  assignAlternatives(next, ctx, rng(Date.now() & 0xffff), plan.slots);
  return { plan: fitPlan(next, ctx), id: pick.id };
}

/** Trasforma il pranzo `s` nell'avanzo della cena precedente (o viceversa). */
export function toggleLeftover(plan, s, ctx) {
  const sl = plan.slots[s];
  const slots = plan.slots.map((x) => ({ ...x }));
  if (sl.lo) {
    const cand = candidatesFor(ctx)[s].filter((id) => !plan.slots.some((x) => x.r === id));
    let best = null;
    let bestScore = Infinity;
    for (const id of cand) {
      const t = slots.map((x) => ({ ...x }));
      t[s] = { ...t[s], r: id, lo: false, custom: null };
      const sc = evaluate(t, ctx).total;
      if (sc < bestScore) {
        bestScore = sc;
        best = t;
      }
    }
    if (!best) return null;
    return finalizeEdit(plan, best, ctx);
  }
  const dinner = ctx.recipes[plan.slots[s - 1]?.r];
  if (s % 2 !== 0 || slotDay(s) > 4 || s < 2 || !canPair(dinner)) return null;
  slots[s] = { ...slots[s], r: dinner.id, lo: true, useAlt: false, custom: slots[s - 1].custom || null };
  return finalizeEdit(plan, slots, ctx);
}

function finalizeEdit(plan, slots, ctx) {
  const next = { ...plan, slots };
  assignAlternatives(next, ctx, rng(Date.now() & 0xffff), plan.slots);
  return fitPlan(next, ctx);
}

export const canBecomeLeftover = (plan, s, ctx) =>
  s % 2 === 0 && s >= 2 && slotDay(s) <= 4 && canPair(ctx.recipes[plan.slots[s - 1].r]);
