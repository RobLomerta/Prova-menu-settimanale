import { slotMeal } from './common.js';
import { slotIngredients, shownId, extraEntries, slotName } from './planner.js';
import { nutrientsOf, addN, ZERO } from './nutrition.js';
import { INGREDIENTS } from '../data/ingredients.js';

/** Valori di una lista di ingredienti come li conta il piano: con un piano le verdure sono "libere". */
export function countedNutrients(items, ctx) {
  return nutrientsOf(ctx.plan ? items.filter((x) => INGREDIENTS[x.id].ro !== 'veg') : items);
}

const ORDER = { colazione: 0, spuntino1: 1, P: 2, spuntino2: 3, C: 4, spuntino3: 5 };

/**
 * Vista completa della settimana: per ogni giorno tutti i pasti (colazione, spuntini, pranzo, cena)
 * con gli ingredienti effettivi e i valori nutrizionali.
 */
export function weekView(plan, ctx) {
  const days = Array.from({ length: 7 }, (_, day) => ({ day, meals: [], total: { ...ZERO }, free: false }));
  plan.slots.forEach((sl, s) => {
    const day = Math.floor(s / 2);
    const r = ctx.recipes[shownId(sl)];
    const ing = slotIngredients(sl, s, ctx);
    const free = r.id === 'libero';
    const n = free ? { ...ZERO } : countedNutrients(ing, ctx);
    days[day].meals.push({ key: slotMeal(s), label: slotMeal(s) === 'P' ? 'Pranzo' : 'Cena', name: free ? r.n : slotName(sl, s, ctx), ing, n, slot: s, free, custom: !!(sl.custom && sl.custom.r === r.id) });
    if (free) days[day].free = true;
  });
  for (const e of extraEntries(plan, ctx)) {
    days[e.day].meals.push({
      key: e.key, label: e.label, name: e.name, ing: e.ing, orig: e.orig, style: e.style, locked: e.locked,
      custom: e.custom, day: e.day, n: countedNutrients(e.ing, ctx), extra: true,
    });
  }
  for (const d of days) {
    d.meals.sort((a, b) => (ORDER[a.key] ?? 9) - (ORDER[b.key] ?? 9));
    d.total = d.meals.reduce((a, m) => addN(a, m.n), { ...ZERO });
    d.vegKcal = d.meals.reduce((a, m) => a + nutrientsOf(m.ing.filter((x) => INGREDIENTS[x.id].ro === 'veg')).kcal, 0);
  }
  const counted = days.filter((d) => !d.free);
  const avg = counted.reduce((a, d) => addN(a, d.total), { ...ZERO });
  const k = counted.length || 1;
  const vegKcal = counted.reduce((a, d) => a + d.vegKcal, 0) / k;
  return { days, avg: { kcal: avg.kcal / k, p: avg.p / k, c: avg.c / k, f: avg.f / k }, vegKcal };
}
