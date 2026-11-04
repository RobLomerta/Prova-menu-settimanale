import { INGREDIENTS } from '../data/ingredients.js';
import { PREP_TASKS } from '../data/prep.js';
import { DAYS, DAYS_SHORT, slotDay, slotMeal, slotLabel, isWorkLunch } from './common.js';
import { fmtQty } from './shopping.js';
import { slotIngredients, shownId, extraEntries } from './planner.js';

const SESSIONS = [
  { key: 'dom', title: 'Domenica', subtitle: 'Sessione principale · circa 1 h 30', start: -1 },
  { key: 'mer', title: 'Mercoledì sera', subtitle: 'Mini sessione · circa 30-40 min', start: 2 },
];

/** Sessione in cui preparare qualcosa che serve il giorno `day` e si conserva `keep` giorni. */
function sessionFor(day, keep) {
  if (day + 1 <= keep) return 'dom';
  if (day >= 2 && day - 2 <= keep) return 'mer';
  return null; // si prepara il giorno stesso
}

/**
 * Piano di meal prep: cosa cucinare in anticipo, in quale sessione, per quali pasti,
 * e cosa assemblare ogni sera per il pranzo del giorno dopo.
 */
export function mealPrepPlan(plan, ctx) {
  const tasks = {}; // session -> taskKey -> { items: Map(ingId -> {q, uses}) }
  const dishes = { dom: [], mer: [] };

  const add = (session, key, id, q, use) => {
    tasks[session] ??= {};
    tasks[session][key] ??= new Map();
    const m = tasks[session][key];
    const it = m.get(id) || { q: 0, uses: [] };
    it.q += q;
    it.uses.push(use);
    m.set(id, it);
  };

  plan.slots.forEach((sl, s) => {
    if (sl.lo) return; // è la seconda porzione della cena precedente
    const r = ctx.recipes[shownId(sl)];
    if (r.id === 'libero') return;
    const items = slotIngredients(sl, s, ctx);
    const day = slotDay(s);
    const use = slotLabel(s);
    const double = plan.slots[s + 1]?.lo ? 2 : 1;

    for (const { id, q } of items) {
      const key = INGREDIENTS[id].prep;
      if (!key) continue;
      const def = PREP_TASKS[key];
      const keep = def.keepBy?.[id] ?? def.keep;
      const ses = sessionFor(day, keep);
      if (ses) add(ses, key, id, q * double, use);
    }
    for (const [key, orig] of r.mp || []) {
      const id = r.idMap[orig] || orig;
      const entry = items.find((x) => x.id === id);
      const ses = sessionFor(day, PREP_TASKS[key].keep);
      if (ses && entry) add(ses, key, id, entry.q * double, use);
    }
    // piatti interi da cucinare in anticipo: pranzi di lavoro e cene feriali lunghe
    const worthIt = isWorkLunch(s) || (slotMeal(s) === 'C' && day < 5 && r.t >= 30);
    if (r.ahead && worthIt) {
      const ses = sessionFor(day, r.keep || 2);
      const main = items
        .filter((x) => ['carb', 'prot', 'veg'].includes(INGREDIENTS[x.id].ro))
        .map((x) => `${INGREDIENTS[x.id].n.replace(/ \(.*\)$/, '').toLowerCase()} ${fmtQty(x.q * double, INGREDIENTS[x.id].u)}`);
      const custom = !!(sl.custom && sl.custom.r === r.id);
      if (ses) dishes[ses].push({ name: r.n, use, portions: double, keep: r.keep, fz: r.fz, items: main.join(', '), custom });
    }
  });

  // colazioni e spuntini: legumi, cereali e verdure da preparare in anticipo
  for (const e of extraEntries(plan, ctx)) {
    const use = `${DAYS_SHORT[e.day]} ${e.label.toLowerCase()}`;
    for (const { id, q } of e.ing) {
      const key = INGREDIENTS[id].prep;
      if (!key) continue;
      const def = PREP_TASKS[key];
      const ses = sessionFor(e.day, def.keepBy?.[id] ?? def.keep);
      if (ses) add(ses, key, id, q, use);
    }
    if (e.ing.some((x) => x.id === 'ceci') && e.ing.some((x) => x.id === 'tahina')) {
      const ceci = e.ing.find((x) => x.id === 'ceci');
      const ses = sessionFor(e.day, PREP_TASKS.hummus.keep);
      if (ses) add(ses, 'hummus', 'ceci', ceci.q, use);
    }
  }

  const sessions = SESSIONS.map((ses) => {
    const t = tasks[ses.key] || {};
    const list = Object.keys(PREP_TASKS)
      .filter((k) => t[k])
      .map((k) => {
        const def = PREP_TASKS[k];
        return {
          key: k,
          title: def.title,
          icon: def.icon,
          intro: def.intro,
          fallback: def.fallback,
          items: [...t[k].entries()].map(([id, it]) => {
            const ing = INGREDIENTS[id];
            const cooked = k === 'legumi' || k === 'cereali' ? ` → circa ${fmtQty(Math.round(it.q * 2.5 / 10) * 10, ing.u)} cotti` : '';
            return {
              name: ing.n,
              qty: fmtQty(it.q, ing.u) + (k === 'legumi' || k === 'cereali' ? ' (a crudo)' : '') + cooked,
              how: def.how?.[id] || def.how?.[Object.keys(def.how || {}).find((h) => id.startsWith(h))],
              uses: it.uses,
            };
          }),
        };
      });
    return { ...ses, tasks: list, dishes: dishes[ses.key] };
  }).filter((s) => s.tasks.length || s.dishes.length);

  // Assemblaggio serale dei pranzi da portare al lavoro
  const evenings = [];
  for (let d = 0; d < 5; d++) {
    const s = d * 2;
    const sl = plan.slots[s];
    const r = ctx.recipes[shownId(sl)];
    evenings.push({
      when: d === 0 ? 'Domenica sera' : `${DAYS[d - 1]} sera`,
      forDay: DAYS[d],
      name: r.n,
      leftover: sl.lo,
      tip: sl.lo ? 'Cucina doppia porzione a cena e metti subito da parte la seconda nel contenitore.' : r.tip,
    });
  }

  const lunches = plan.slots.filter((_, s) => isWorkLunch(s)).length;
  return {
    sessions,
    evenings,
    gear: `Ti servono ${lunches} contenitori ermetici (meglio in vetro, adatti al microonde), 2-3 barattolini per condimenti e una borsa termica.`,
  };
}
