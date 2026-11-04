import { INGREDIENTS, isPerishable } from '../data/ingredients.js';
import { SLOTS, slotDay, slotMeal, isWorkLunch, rng, shopFor } from './common.js';

// ---------------------------------------------------------------------------
// Fabbisogni: quanto serve di ogni ingrediente e da quale spesa
// ---------------------------------------------------------------------------

/** entries: [{ r: ricettaRisolta, day, meal, label? }] */
export function collectNeeds(entries, ctx) {
  const needs = new Map();
  const issues = [];
  for (const e of entries) {
    for (const { id, q } of e.r.ing) {
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

export function slotEntries(slots, ctx, { useAlt = false } = {}) {
  return slots.map((sl, s) => ({
    r: ctx.recipes[useAlt && sl.useAlt && sl.alt ? sl.alt : sl.r],
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
    counts[r.p] = (counts[r.p] || 0) + 1;
    if (sl.lo) pairs++;
    else {
      if (seen.has(r.id)) parts.varieta += 15;
      seen.add(r.id);
      bases[r.b] = (bases[r.b] || 0) + 1;
    }
    if (meal === 'C') {
      const lunch = R[slots[s - 1].r];
      if (lunch.p === r.p) parts.varieta += 3;
      if (lunch.b === r.b) parts.varieta += 2;
      if (day < 5 && !r.ahead && r.t > 40) parts.praticita += 1.5;
    } else if (s > 0 && !sl.lo) {
      if (R[slots[s - 1].r].p === r.p) parts.varieta += 1.5;
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
    const meal = slotMeal(s);
    const work = isWorkLunch(s);
    return Object.values(ctx.recipes)
      .filter((r) => r.m.includes(meal) && (!work || r.port))
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
  const fx = Array.from({ length: SLOTS }, (_, s) => (fixed[s] && ctx.recipes[fixed[s].r] ? fixed[s] : null));
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
    slots: best.map((x) => ({ r: x.r, lo: !!x.lo, locked: !!x.locked, alt: null, useAlt: false })),
    breakfast: [],
  };
  assignAlternatives(plan, ctx, rand);
  plan.breakfast = ctx.settings.breakfast ? chooseBreakfasts(plan, ctx, rand) : [];
  return plan;
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
// Colazioni: due proposte alternate, scelte per minimizzare gli sprechi
// ---------------------------------------------------------------------------

export function breakfastEntries(plan, ctx) {
  if (!plan.breakfast?.length) return [];
  return Array.from({ length: 7 }, (_, day) => ({
    r: ctx.breakfasts[plan.breakfast[day % plan.breakfast.length]],
    day,
    meal: 'B',
  })).filter((e) => e.r);
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
      const trial = { ...plan, breakfast: [ids[i], ids[j]] };
      const { needs, issues } = collectNeeds([...base, ...breakfastEntries(trial, ctx)], ctx);
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
    slots[s] = { ...slots[s], r: id, lo: false, useAlt: false };
    if (s % 2 === 1 && slots[s + 1]?.lo) slots[s + 1].lo = false;
    scored.push({ id, slots, score: evaluate(slots, ctx).total + rand() * 2 });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => a.score - b.score);
  const pick = scored[0];
  const next = { ...plan, slots: pick.slots };
  assignAlternatives(next, ctx, rng(Date.now() & 0xffff), plan.slots);
  if (ctx.settings.breakfast) next.breakfast = plan.breakfast?.length ? plan.breakfast : chooseBreakfasts(next, ctx);
  return { plan: next, id: pick.id };
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
      t[s] = { ...t[s], r: id, lo: false };
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
  slots[s] = { ...slots[s], r: dinner.id, lo: true, useAlt: false };
  return finalizeEdit(plan, slots, ctx);
}

function finalizeEdit(plan, slots, ctx) {
  const next = { ...plan, slots };
  assignAlternatives(next, ctx, rng(Date.now() & 0xffff), plan.slots);
  return next;
}

export const canBecomeLeftover = (plan, s, ctx) =>
  s % 2 === 0 && s >= 2 && slotDay(s) <= 4 && canPair(ctx.recipes[plan.slots[s - 1].r]);
