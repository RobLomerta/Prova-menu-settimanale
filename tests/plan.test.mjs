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
