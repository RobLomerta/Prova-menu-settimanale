import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INGREDIENTS } from '../js/data/ingredients.js';
import { parsePlanText, analyzePlan, parseLine, scaleToPortions } from '../js/engine/plan.js';
import { buildContext } from '../js/engine/diet.js';
import { generatePlan, slotIngredients, fitPlan, extraEntries } from '../js/engine/planner.js';
import { shoppingList } from '../js/engine/shopping.js';
import { mealPrepPlan } from '../js/engine/mealprep.js';
import { weekView } from '../js/engine/week.js';
import { nutrientsOf, equivalent } from '../js/engine/nutrition.js';

const text = fs.readFileSync(new URL('./fixtures/schema-a-scelta.txt', import.meta.url), 'utf8');
const FREQ = { carne_bianca: 2, carne_rossa: 1, pesce_azzurro: 2, pesce_bianco: 2, legumi: 2, uova: 1, formaggi: 1, affettati: 1, vegetale: 1, libero: 1 };

test('ogni ingrediente ha valori nutrizionali plausibili', () => {
  for (const [id, ing] of Object.entries(INGREDIENTS)) {
    if (ing.pan && !ing.nu[0]) continue;
    const [kcal, p, c, f] = ing.nu;
    const calc = p * 4 + c * 4 + f * 9;
    assert.ok(kcal > 0, `${id} senza kcal`);
    assert.ok(Math.abs(calc - kcal) / kcal < 0.35 || Math.abs(calc - kcal) < 25, `${id}: kcal ${kcal} vs macro ${calc}`);
  }
});

test('lettura del piano: pasti, totali, regola dei legumi', () => {
  const plan = parsePlanText(text);
  assert.deepEqual(plan.meals.map((m) => m.key), ['colazione', 'spuntino1', 'pranzo', 'spuntino2', 'cena']);
  assert.deepEqual(plan.targets, { kcal: 1500, p: 105, c: 185, f: 40 });
  assert.equal(plan.legumeRule, 60);
  // la riga spezzata dal cambio pagina viene ricomposta
  assert.ok(plan.meals.find((m) => m.key === 'cena').lines.some((l) => /250\s+grammi di patate americane/.test(l)));
});

test('analisi del piano: porzioni di pranzo e cena e stima calorica', () => {
  const a = analyzePlan(parsePlanText(text));
  const pranzo = a.byKey.pranzo.portions;
  assert.equal(pranzo.prot.carne, 100);
  assert.equal(pranzo.prot.uova, 2);
  assert.equal(pranzo.prot.tofu, 200);
  assert.equal(pranzo.prot.legumi, 60);
  assert.equal(pranzo.oil, 10);
  assert.ok(pranzo.carb > 40 && pranzo.carb < 60, `carboidrati ${pranzo.carb}`);
  assert.ok(a.byKey.cena.warnings.some((w) => /refuso/.test(w)), 'segnala i 6 g di riso');
  assert.ok(Math.abs(a.est.kcal - 1500) < 150, `stima ${a.est.kcal}`);
});

test('parseLine: intervalli, cucchiai, pezzi', () => {
  const l = parseLine('10-15 grammi marmellata o miele / Un cucchiaio d\'olio / 3 uova intere');
  assert.equal(l.options[0].q, 12.5);
  assert.equal(l.options[1].q, 10);
  assert.deepEqual([l.options[2].q, l.options[2].u], [3, 'pz']);
});

test('riproporzionamento: proteine in "porzioni equivalenti", carboidrati per grammi di carboidrati', () => {
  const portions = { carb: 50, prot: { carne: 100, pesce: 100, legumi: 60 }, oil: 10 };
  const out = scaleToPortions([{ id: 'fagioli', q: 60 }, { id: 'tonno', q: 80 }, { id: 'pane', q: 50 }, { id: 'olio', q: 15 }], portions);
  const by = Object.fromEntries(out.map((x) => [x.id, x.q]));
  assert.ok(Math.abs(by.fagioli / 60 + by.tonno / 100 - 1) < 0.1, JSON.stringify(by));
  assert.ok(Math.abs(nutrientsOf([{ id: 'pane', q: by.pane }]).c - 50) < 2);
  assert.equal(by.olio, 10);
});

test('menù da piano: frequenze, pasto libero, colazioni dal piano, calorie vicine all\'obiettivo', () => {
  const dp = { ...parsePlanText(text), freq: FREQ };
  const ctx = buildContext({ month: 11 }, dp);
  const plan = generatePlan(ctx, { seed: 12 });
  assert.equal(plan.slots[11].r, 'libero');
  const counts = {};
  for (const sl of plan.slots) counts[ctx.recipes[sl.r].cat] = (counts[ctx.recipes[sl.r].cat] || 0) + 1;
  const dev = Object.keys(FREQ).reduce((a, k) => a + Math.abs((counts[k] || 0) - FREQ[k]), 0);
  assert.ok(dev <= 4, `scostamento frequenze ${dev}: ${JSON.stringify(counts)}`);
  const keys = new Set(plan.extras.map((x) => x.key));
  assert.ok(keys.has('colazione') && keys.has('spuntino2'));
  const w = weekView(plan, ctx);
  assert.ok(Math.abs(w.avg.kcal - 1500) < 120, `media ${w.avg.kcal}`);
  const list = shoppingList(plan, ctx);
  assert.ok(list.shops.length >= 1);
  assert.ok(!list.shops.flatMap((s) => s.groups.flatMap((g) => g.items)).some((i) => i.uses.some((u) => u.startsWith('Sab cena'))), 'pasto libero senza spesa');
});

test('modifica manuale di un pasto: si riflette su spesa, meal prep e nutrienti', () => {
  const ctx = buildContext({ month: 11, regime: 'vegetariana' });
  const plan = generatePlan(ctx, { seed: 3 });
  const s = 0;
  const before = nutrientsOf(slotIngredients(plan.slots[s], s, ctx)).kcal;
  plan.slots[s].custom = { r: plan.slots[s].r, ing: [{ id: 'quinoa', q: 80 }, { id: 'ceci', q: 70 }, { id: 'zucca', q: 200 }] };
  fitPlan(plan, ctx);
  assert.deepEqual(slotIngredients(plan.slots[s], s, ctx).map((x) => x.id), ['quinoa', 'ceci', 'zucca']);
  const w = weekView(plan, ctx);
  assert.notEqual(Math.round(w.days[0].meals.find((m) => m.slot === 0).n.kcal), Math.round(before));
  const ids = shoppingList(plan, ctx).shops.flatMap((x) => x.groups.flatMap((g) => g.items.map((i) => i.id)));
  assert.ok(ids.includes('quinoa'));
  const prep = mealPrepPlan(plan, ctx);
  assert.ok(prep.sessions.some((x) => x.tasks.some((t) => t.items.some((i) => i.name === 'Quinoa' && i.uses.includes('Lun pranzo')))));
});

test('obiettivo calorico manuale senza piano', () => {
  const ctx = buildContext({ month: 4, kcalTarget: 1800 });
  const plan = generatePlan(ctx, { seed: 8 });
  const w = weekView(plan, ctx);
  assert.ok(Math.abs(w.avg.kcal - 1800) < 150, `media ${w.avg.kcal}`);
  assert.ok(extraEntries(plan, ctx).length >= 7);
});

test('equivalenze tra alimenti', () => {
  assert.equal(Math.round(equivalent('pollo', 100, 'pollo', 'kcal')), 100);
  const lent = equivalent('pollo', 100, 'lenticchie', 'p');
  assert.ok(lent > 95 && lent < 110);
});

test('colazione dolce, salata o alternata (con e senza piano)', async () => {
  const { breakfastStyle } = await import('../js/engine/planner.js');
  const SAVORY = ['uova', 'albumi', 'bresaola', 'fesa_affettata', 'prosciutto_cotto', 'tofu', 'ricotta', 'ceci'];
  const SWEET = ['marmellata', 'miele', 'proteine_polvere'];
  for (const dp of [{ ...parsePlanText(text), freq: FREQ }, null]) {
    for (const style of ['dolce', 'salata', 'alternata']) {
      const ctx = buildContext({ month: 11, breakfastStyle: style }, dp);
      const plan = generatePlan(ctx, { seed: 2, iterations: 800, restarts: 1 });
      for (const e of extraEntries(plan, ctx).filter((x) => x.key === 'colazione')) {
        const st = breakfastStyle(plan, ctx, e.day);
        assert.equal(st, style === 'alternata' ? (e.day % 2 ? 'salata' : 'dolce') : style);
        const ids = e.ing.map((x) => x.id);
        if (st === 'salata') {
          assert.ok(ids.some((id) => SAVORY.includes(id)), `${e.name} non è salata`);
          assert.ok(!ids.some((id) => SWEET.includes(id)), `${e.name} contiene dolci`);
        } else assert.ok(!ids.some((id) => ['uova', 'albumi', 'bresaola', 'fesa_affettata', 'prosciutto_cotto'].includes(id)), `${e.name} non è dolce`);
      }
      // scelta del singolo giorno
      plan.bfStyle = ['salata', null, null, null, null, null, null];
      if (style === 'dolce') assert.equal(breakfastStyle(plan, ctx, 0), 'salata');
    }
  }
});

test('una modifica manuale non viene compensata in automatico (salvo "riequilibra")', async () => {
  const { setExtraDay, dayHasEdits } = await import('../js/engine/planner.js');
  const dp = { ...parsePlanText(text), freq: FREQ };
  const ctx = buildContext({ month: 11 }, dp);
  const plan = generatePlan(ctx, { seed: 21 });
  const before = weekView(plan, ctx).days[0];
  const lunchBefore = before.meals.find((m) => m.slot === 0);
  const dinnerBefore = before.meals.find((m) => m.slot === 1);
  // raddoppio la colazione del lunedì
  const bf = extraEntries(plan, ctx).find((e) => e.key === 'colazione' && e.day === 0);
  setExtraDay(plan, 'colazione', 0, { custom: bf.ing.map((x) => ({ ...x, q: x.q * 2 })) });
  fitPlan(plan, ctx);
  assert.ok(dayHasEdits(plan, ctx, 0));
  const after = weekView(plan, ctx).days[0];
  assert.ok(after.total.kcal > before.total.kcal + 50, `${before.total.kcal} → ${after.total.kcal}`);
  // pranzo e cena non cambiano di nascosto
  assert.equal(Math.round(after.meals.find((m) => m.slot === 0).n.kcal), Math.round(lunchBefore.n.kcal));
  assert.equal(Math.round(after.meals.find((m) => m.slot === 1).n.kcal), Math.round(dinnerBefore.n.kcal));
  // riequilibrio su richiesta
  plan.rebalance = { 0: true };
  fitPlan(plan, ctx);
  const reb = weekView(plan, ctx).days[0];
  assert.ok(Math.abs(reb.total.kcal - 1500) < Math.abs(after.total.kcal - 1500), `riequilibrio ${reb.total.kcal}`);
  // annullando il riequilibrio si torna esattamente a prima
  delete plan.rebalance[0];
  fitPlan(plan, ctx);
  assert.equal(Math.round(weekView(plan, ctx).days[0].total.kcal), Math.round(after.total.kcal));
  // tolta la modifica, il giorno torna ad adattarsi da solo
  setExtraDay(plan, 'colazione', 0, { custom: null });
  fitPlan(plan, ctx);
  assert.equal(Math.round(weekView(plan, ctx).days[0].total.kcal), Math.round(before.total.kcal));
});

test('meal prep: tiene conto delle modifiche e di colazioni e spuntini', async () => {
  const { setExtraDay } = await import('../js/engine/planner.js');
  const ctx = buildContext({ month: 11 });
  const plan = generatePlan(ctx, { seed: 4 });
  const sumFarro = (mp) => mp.sessions.flatMap((x) => x.tasks).filter((t) => t.key === 'cereali').flatMap((t) => t.items).filter((i) => i.name === 'Farro perlato').map((i) => parseInt(i.qty, 10)).reduce((a, b) => a + b, 0);
  const before = sumFarro(mealPrepPlan(plan, ctx));
  plan.slots[0].custom = { r: plan.slots[0].r, ing: [{ id: 'farro', q: 100 }, { id: 'ceci', q: 60 }, { id: 'zucca', q: 200 }] };
  assert.equal(sumFarro(mealPrepPlan(plan, ctx)), before + 100);
  setExtraDay(plan, 'colazione', 1, { custom: [{ id: 'pane', q: 60 }, { id: 'ceci', q: 30 }, { id: 'tahina', q: 10 }] });
  const mp = mealPrepPlan(plan, ctx);
  const uses = mp.sessions.flatMap((x) => x.tasks).flatMap((t) => t.items).flatMap((i) => i.uses);
  assert.ok(uses.includes('Mar colazione'), 'i ceci della colazione entrano nel meal prep');
});

test('il nome del pasto segue gli ingredienti modificati', async () => {
  const { setExtraDay, slotName, variantName } = await import('../js/engine/planner.js');
  const dp = { ...parsePlanText(text), freq: FREQ };
  const ctx = buildContext({ month: 11, breakfastStyle: 'dolce' }, dp);
  const plan = generatePlan(ctx, { seed: 3 });
  setExtraDay(plan, 'colazione', 0, { custom: [{ id: 'pane', q: 50 }, { id: 'mela', q: 100 }, { id: 'fesa_affettata', q: 100 }] });
  const bf = extraEntries(plan, ctx).find((e) => e.key === 'colazione' && e.day === 0);
  assert.equal(bf.style, 'salata');
  assert.match(bf.name, /fesa di tacchino/i);
  assert.doesNotMatch(bf.name, /fette biscottate|banan/i);
  assert.equal(variantName('Pollo al curry', [{ id: 'pollo', q: 100 }, { id: 'riso', q: 60 }], [{ id: 'tonno', q: 80 }, { id: 'riso', q: 60 }]), 'Pollo al curry · con tonno al posto di pollo');
  assert.equal(variantName('Pollo al curry', [{ id: 'pollo', q: 100 }, { id: 'riso', q: 60 }], [{ id: 'pollo', q: 150 }, { id: 'riso', q: 60 }]), 'Pollo al curry');
  plan.slots[0].custom = { r: plan.slots[0].r, ing: [{ id: 'quinoa', q: 70 }] };
  assert.match(slotName(plan.slots[0], 0, ctx), /·/);
  assert.match(weekView(plan, ctx).days[0].meals.find((m) => m.slot === 0).name, /·/);
});

test('menù anti bruciore di stomaco: niente pomodoro, agrumi, cipolla, aglio, piccante', async () => {
  const { INGREDIENTS: I } = await import('../js/data/ingredients.js');
  const BAD = ['pelati', 'pomodori', 'pomodorini', 'arance', 'mandarini', 'limone', 'cipolla', 'aglio', 'peperoncino', 'paprika', 'curry', 'macinato', 'feta', 'peperoni'];
  for (const dp of [null, { ...parsePlanText(text), freq: FREQ }]) {
    for (const month of [1, 7]) {
      const ctx = buildContext({ month, menuType: 'reflusso', breakfastStyle: 'alternata' }, dp);
      const plan = generatePlan(ctx, { seed: 6, iterations: 1500 });
      const w = weekView(plan, ctx);
      for (const d of w.days) for (const m of d.meals) {
        for (const x of m.ing) assert.ok(!BAD.includes(x.id), `${m.name}: contiene ${x.id}`);
        assert.doesNotMatch(m.name, /pomodor|aranc|limon|cipoll|peperoncin|curry/i, m.name);
      }
      for (const sl of plan.slots) for (const id of ctx.recipes[sl.r].pantry) assert.ok(!BAD.includes(id), `${sl.r}: dispensa ${id}`);
      const ids = shoppingList(plan, ctx).shops.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.id)));
      assert.ok(!ids.some((id) => BAD.includes(id)), 'lista della spesa');
      assert.ok(I);
    }
  }
  // il menù normale resta invariato
  const normal = buildContext({ month: 7 });
  assert.ok(normal.recipes.farro_caprese && normal.recipes.pasta_ceci);
});

test('ricette personali: entrano nel ricettario e nei menù', () => {
  const mine = [{ id: 'u_test', user: true, n: 'Riso di nonna con ceci', p: 'legumi', m: 'PC', port: 1, b: 'riso', t: 20, i: { riso: 70, ceci: 60, zucchine: 150 }, d: ['olio', 'sale_pepe'], oil: 10, s: 'Ricetta personale.' }];
  const ctx = buildContext({ month: 11 }, null, mine);
  assert.ok(ctx.recipes.u_test, 'presente nel contesto');
  assert.ok(ctx.recipes.u_test.ing.some((x) => x.id === 'olio' && x.q === 10));
  const ctxVegan = buildContext({ month: 11, regime: 'vegana' }, null, mine);
  assert.ok(ctxVegan.recipes.u_test);
  const bf = [{ id: 'u_bf', user: true, m: 'B', n: 'Pane e ricotta della nonna', style: 'salata', i: { pane: 60, ricotta: 80 }, d: [] }];
  assert.ok(buildContext({ month: 11 }, null, bf).breakfasts.u_bf);
});

test('numero di persone: spesa e meal prep moltiplicati, valori nutrizionali a persona', () => {
  const one = buildContext({ month: 11, people: 1 });
  const three = buildContext({ month: 11, people: 3 });
  const plan = generatePlan(one, { seed: 9 });
  const total = (ctx) => shoppingList(plan, ctx).shops.flatMap((s) => s.groups.flatMap((g) => g.items)).filter((i) => !INGREDIENTS[i.id].pk).reduce((a, i) => a + i.need, 0);
  assert.ok(Math.abs(total(three) - 3 * total(one)) < 1, `${total(one)} → ${total(three)}`);
  assert.equal(Math.round(weekView(plan, three).avg.kcal), Math.round(weekView(plan, one).avg.kcal));
  const grains = (ctx) => mealPrepPlan(plan, ctx).sessions.flatMap((x) => x.tasks).filter((t) => t.key === 'cereali').flatMap((t) => t.items).map((i) => parseInt(i.qty, 10)).reduce((a, b) => a + b, 0);
  assert.equal(grains(three), 3 * grains(one));
  assert.match(mealPrepPlan(plan, three).gear, /15 contenitori/);
});

test('anti bruciore: caffè, cioccolato e menta esclusi anche dal piano alimentare', () => {
  const custom = `Colazione
- 50 g avena / 100 g pane integrale
- 150 g yogurt greco
- 20 g cioccolato fondente / 100 g mele
Snack
- 1 caffè 30 ml / 150 g pere
Pranzo
- 70 g riso
- 100 g pollo
- 10 g olio
Cena
- 100 g merluzzo
- 80 g pane integrale
- 10 g olio`;
  const dp = parsePlanText(custom);
  const line = parseLine('20 g cioccolato fondente / 1 caffè / foglie di menta');
  assert.deepEqual(line.options.map((o) => o.foods[0]), ['cioccolato', 'caffe', 'menta']);
  const BAD = ['caffe', 'cioccolato', 'menta'];
  for (let seed = 1; seed <= 4; seed++) {
    const ctx = buildContext({ month: 11, menuType: 'reflusso' }, dp);
    const plan = generatePlan(ctx, { seed, iterations: 600, restarts: 1 });
    for (const e of extraEntries(plan, ctx)) assert.ok(!e.ing.some((x) => BAD.includes(x.id)), e.name);
  }
  // nel menù normale restano ammessi
  const normal = buildContext({ month: 11 }, dp);
  const seen = new Set();
  for (let seed = 1; seed <= 6; seed++) for (const e of extraEntries(generatePlan(normal, { seed, iterations: 300, restarts: 1 }), normal)) e.ing.forEach((x) => seen.add(x.id));
  assert.ok(seen.has('cioccolato') || seen.has('caffe'), 'ammessi nel menù normale');
  // una ricetta personale con il cioccolato non viene proposta nel menù anti bruciore
  const mine = [{ id: 'u_c', user: true, n: 'Crema di ricotta e cacao', p: 'formaggi', m: 'C', i: { ricotta: 100, cioccolato: 20, pane: 50 }, d: [] }];
  assert.ok(buildContext({ month: 11 }, null, mine).recipes.u_c);
  assert.ok(!buildContext({ month: 11, menuType: 'reflusso' }, null, mine).recipes.u_c);
});
