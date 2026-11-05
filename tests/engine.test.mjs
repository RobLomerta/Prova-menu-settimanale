import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS } from '../js/data/ingredients.js';
import { RECIPES, BREAKFASTS } from '../js/data/recipes.js';
import { PREP_TASKS } from '../js/data/prep.js';
import { buildContext, REGIMES, REFLUX } from '../js/engine/diet.js';
import { generatePlan, replaceSlot, toggleLeftover, evaluate } from '../js/engine/planner.js';
import { weekView } from '../js/engine/week.js';
import { shoppingList, shoppingText } from '../js/engine/shopping.js';
import { mealPrepPlan } from '../js/engine/mealprep.js';
import { isWorkLunch } from '../js/engine/common.js';

const tagsOf = (r) => r.ing.flatMap(({ id }) => INGREDIENTS[id].t || []).concat(r.pantry.flatMap((id) => INGREDIENTS[id].t || []));

test('dati coerenti: ogni ingrediente, sostituto e attività esiste', () => {
  const ids = new Set();
  for (const r of [...RECIPES, ...BREAKFASTS]) {
    assert.ok(!ids.has(r.id), `id duplicato ${r.id}`);
    ids.add(r.id);
    for (const id of [...Object.keys(r.i), ...(r.d || [])]) assert.ok(INGREDIENTS[id], `${r.id}: ingrediente ${id} mancante`);
    for (const [k, id] of r.mp || []) {
      assert.ok(PREP_TASKS[k], `${r.id}: attività ${k} mancante`);
      assert.ok(id in r.i, `${r.id}: ${id} non è tra gli ingredienti`);
    }
  }
  for (const r of RECIPES) if (r.alt) assert.ok(RECIPES.find((x) => x.id === r.alt), `${r.id}: alt ${r.alt} mancante`);
  for (const [id, ing] of Object.entries(INGREDIENTS)) {
    for (const sub of Object.values(ing.sub || {})) assert.ok(INGREDIENTS[sub], `${id}: sostituto ${sub} mancante`);
    if (ing.prep) assert.ok(PREP_TASKS[ing.prep], `${id}: prep ${ing.prep} mancante`);
  }
});

for (const regime of Object.keys(REGIMES)) {
  for (const month of [1, 7, 11]) {
    test(`piano valido: ${regime}, mese ${month}`, () => {
      const ctx = buildContext({ regime, month });
      const plan = generatePlan(ctx, { seed: 7, iterations: 1500, restarts: 1 });
      assert.equal(plan.slots.length, 14);
      const excluded = new Set(REGIMES[regime].excl);
      const seen = new Set();
      plan.slots.forEach((sl, s) => {
        const r = ctx.recipes[sl.r];
        assert.ok(r, 'ricetta presente');
        for (const t of tagsOf(r)) assert.ok(!excluded.has(t), `${r.id} contiene ${t}`);
        if (isWorkLunch(s)) assert.ok(r.port, `${r.id} non è trasportabile (slot ${s})`);
        if (sl.lo) assert.equal(plan.slots[s - 1].r, sl.r, 'avanzo coerente');
        else {
          assert.ok(!seen.has(sl.r), `${sl.r} ripetuta`);
          seen.add(sl.r);
        }
        if (r.fish) {
          assert.ok(sl.alt, `manca l'alternativa al pesce per ${r.id}`);
          const a = ctx.recipes[sl.alt];
          assert.ok(!a.fish, 'alternativa senza pesce');
          if (isWorkLunch(s)) assert.ok(a.port, 'alternativa trasportabile');
        } else assert.equal(sl.alt, null);
      });
      if (excluded.has('fish')) assert.ok(plan.slots.every((s) => !ctx.recipes[s.r].fish));
    });
  }
}

test('le frequenze proteiche rispettano gli obiettivi (mediterranea)', () => {
  const ctx = buildContext({ regime: 'mediterranea', month: 11 });
  const plan = generatePlan(ctx, { seed: 3 });
  const ev = evaluate(plan.slots, ctx);
  assert.ok(ev.parts.proteine <= 8, `deviazione proteica ${ev.parts.proteine}`);
  assert.equal(ev.counts.carne_rossa || 0, 1);
  assert.ok((ev.counts.pesce || 0) >= 2);
});

test('senza glutine e senza lattosio: nessun ingrediente con quei tag', () => {
  const ctx = buildContext({ regime: 'vegetariana', gluten: true, lactose: true, month: 3 });
  const plan = generatePlan(ctx, { seed: 11, iterations: 1500 });
  for (const sl of plan.slots) {
    const tags = tagsOf(ctx.recipes[sl.r]);
    assert.ok(!tags.includes('gluten') && !tags.includes('lactose'), sl.r);
  }
  const list = shoppingList(plan, ctx);
  const names = list.shops.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.id)));
  assert.ok(!names.includes('pasta') && !names.includes('farro') && !names.includes('mozzarella'));
});

test('esclusioni (uova, frutta a guscio) rispettate anche nelle colazioni', () => {
  const ctx = buildContext({ regime: 'vegetariana', exclude: ['egg', 'nuts'], month: 5 });
  const plan = generatePlan(ctx, { seed: 5, iterations: 1500 });
  const list = shoppingList(plan, ctx);
  const ids = list.shops.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.id)));
  assert.ok(!ids.includes('uova') && !ids.includes('noci'));
});

test('lista della spesa: le alternative scelte sostituiscono il pesce', () => {
  const ctx = buildContext({ regime: 'mediterranea', month: 11 });
  const plan = generatePlan(ctx, { seed: 21 });
  plan.slots.forEach((s) => { if (s.alt) s.useAlt = true; });
  const list = shoppingList(plan, ctx);
  const fishItems = list.shops.flatMap((s) => s.groups.flatMap((g) => g.items)).filter((i) => (INGREDIENTS[i.id].t || []).includes('fish'));
  assert.deepEqual(fishItems, []);
  assert.match(shoppingText(list), /Frutta di stagione/);
});

test('due spese: il pesce del weekend non viene comprato 5 giorni prima', () => {
  const ctx = buildContext({ regime: 'pescetariana', twoShops: true, month: 11 });
  const plan = generatePlan(ctx, { seed: 9 });
  const list = shoppingList(plan, ctx);
  for (const w of list.warnings) assert.ok(INGREDIENTS[w.id].frz, `avviso non congelabile: ${w.text}`);
});

test('sostituzione, avanzi e meal prep', () => {
  const ctx = buildContext({ regime: 'mediterranea', month: 11, leftovers: 2 });
  const plan = generatePlan(ctx, { seed: 1 });
  const res = replaceSlot(plan, 3, ctx);
  assert.ok(res && res.plan.slots[3].r !== plan.slots[3].r);

  const mp = mealPrepPlan(res.plan, ctx);
  assert.equal(mp.evenings.length, 5);
  assert.ok(mp.sessions.length >= 1);

  const lunch = res.plan.slots.findIndex((s, i) => s.lo && i % 2 === 0);
  if (lunch > 0) {
    const t = toggleLeftover(res.plan, lunch, ctx);
    assert.ok(t && !t.slots[lunch].lo);
  }
});

for (const regime of Object.keys(REGIMES)) {
  for (const month of [1, 7, 11]) {
    test(`menù anti-bruciore: ${regime}, mese ${month}`, () => {
      const ctx = buildContext({ regime, month, menuType: 'antibruciore' }, null);
      const plan = generatePlan(ctx, { seed: 11 });
      assert.equal(plan.slots.length, 14);
      const items = weekView(plan, ctx).days.flatMap((d) => d.meals.flatMap((m) => m.ing));
      const used = new Set([...items.map((x) => x.id), ...plan.slots.flatMap((s) => {
        const r = ctx.recipes[s.r];
        return [...r.ing.map((x) => x.id), ...r.pantry];
      })]);
      for (const id of Object.keys(REFLUX)) assert.ok(!used.has(id), `${regime}/${month}: contiene ${id}`);
      const list = shoppingList(plan, ctx);
      const bought = list.shops.flatMap((sh) => sh.groups.flatMap((g) => g.items.map((x) => x.id))).concat(list.pantry.map((x) => x.id));
      for (const id of Object.keys(REFLUX)) assert.ok(!bought.includes(id), `${regime}/${month}: in spesa ${id}`);
      assert.doesNotMatch(list.fruit.suggestions, /arance|mandarini|pompelmi|kiwi/);
    });
  }
}

test('menù anti-bruciore: sostituzioni, nomi e piatti al sugo esclusi', () => {
  const normal = buildContext({ month: 11 });
  const ctx = buildContext({ month: 11, menuType: 'antibruciore' });
  assert.ok(!normal.excluded.has('reflux'));
  assert.ok(!Object.values(ctx.recipes).some((r) => r.ing.some((x) => x.id === 'pelati')));
  const caprese = ctx.recipes.farro_caprese;
  assert.ok(caprese.ing.some((x) => x.id === 'cetrioli'));
  assert.doesNotMatch(caprese.n, /pomodor/i);
  assert.match(ctx.recipes.pollo_curry.n, /curcuma/);
  assert.ok(Object.values(ctx.recipes).every((r) => !/pomodor|arance|limone|curry|feta/i.test(r.n)), 'nomi da aggiornare');
  assert.ok(Object.keys(ctx.recipes).length >= 45, 'restano abbastanza ricette');
});
