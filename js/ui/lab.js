// Tab "Laboratorio": modifica degli ingredienti di un pasto con impatto nutrizionale in tempo reale,
// e calcolatore di equivalenze tra alimenti.
import { INGREDIENTS } from '../data/ingredients.js';
import { nutrientsOf, nutrientsOfItem, energySplit, equivalent } from '../engine/nutrition.js';
import { slotIngredients, shownId, fitPlan, extraEntries, setExtraDay, dayHasEdits } from '../engine/planner.js';
import { weekView, countedNutrients } from '../engine/week.js';
import { slotMeal, DAYS, DAYS_SHORT } from '../engine/common.js';
import { $, esc, r0, ingredientOptions, deltaHtml, shortName, macroLine } from './util.js';

const BASIS = { kcal: 'calorie', p: 'proteine', c: 'carboidrati', f: 'grassi', g: 'grammi' };
const clone = (items) => items.map((x) => ({ ...x }));

export function openLab(app, s) {
  const { plan, ctx } = app.state;
  const sl = plan.slots[s];
  app.state.lab = {
    ...(app.state.lab || {}),
    slot: s,
    extra: null,
    recipeId: null,
    day: Math.floor(s / 2),
    draft: clone(slotIngredients(sl, s, ctx)),
    orig: clone(slotIngredients({ ...sl, custom: null }, s, ctx)),
  };
}

const findExtra = (app, key, day) => extraEntries(app.state.plan, app.state.ctx).find((e) => e.key === key && e.day === day);

export function openExtra(app, key, day) {
  const e = findExtra(app, key, day);
  if (!e) return false;
  app.state.lab = { ...(app.state.lab || {}), slot: null, extra: { key, day }, recipeId: null, day, draft: clone(e.ing), orig: clone(e.orig) };
  return true;
}

function openRecipe(app, id) {
  const r = app.state.ctx.recipes[id];
  app.state.lab = { ...(app.state.lab || {}), slot: null, extra: null, recipeId: id, draft: clone(r.ingBy?.C || r.ing), orig: clone(r.ingBy?.C || r.ing) };
}

/** Pasti selezionabili di un giorno, nell'ordine della giornata. */
function mealsOfDay(app, day) {
  const d = weekView(app.state.plan, app.state.ctx).days[day];
  return d.meals.filter((m) => !m.free).map((m) => ({
    id: m.extra ? `x:${m.key}` : `s:${m.slot}`,
    label: m.extra ? m.label.replace(/ \(.*\)$/, '') : m.label,
    name: m.name,
    custom: m.custom,
    n: m.n,
    m,
  }));
}

function selectMeal(app, day, id) {
  if (id.startsWith('s:')) openLab(app, Number(id.slice(2)));
  else if (!openExtra(app, id.slice(2), day)) return false;
  return true;
}

function currentMealId(lab) {
  if (lab.slot != null) return `s:${lab.slot}`;
  if (lab.extra) return `x:${lab.extra.key}`;
  return null;
}

function ensureLab(app) {
  const { plan, ctx } = app.state;
  const lab = app.state.lab;
  if (lab?.draft) {
    if (lab.recipeId && ctx.recipes[lab.recipeId]) return;
    if (lab.extra && findExtra(app, lab.extra.key, lab.extra.day)) return;
    if (lab.slot != null && plan.slots[lab.slot] && shownId(plan.slots[lab.slot]) !== 'libero') return;
  }
  const first = mealsOfDay(app, 0)[0];
  if (first) selectMeal(app, 0, first.id);
}

function mealTarget(app) {
  const { ctx, lab } = app.state;
  const key = lab.extra ? lab.extra.key : lab.slot != null && slotMeal(lab.slot) === 'P' ? 'pranzo' : 'cena';
  const est = ctx.analysis?.byKey[key]?.est;
  const label = { pranzo: 'il pranzo', cena: 'la cena', colazione: 'la colazione', spuntino1: 'lo spuntino', spuntino2: 'lo spuntino', spuntino3: 'lo spuntino' }[key];
  if (est?.kcal) return { ...est, source: `stima del piano per ${label}` };
  const share = lab.extra ? (key === 'colazione' ? 0.2 : 0.08) : 0.35;
  if (ctx.nutritionTarget?.kcal) return { kcal: ctx.nutritionTarget.kcal * share, source: `${Math.round(share * 100)}% dell’obiettivo giornaliero` };
  return null;
}

function splitBar(label, n) {
  const sp = energySplit(n);
  const seg = (k, cls, name) => `<span class="split-seg ${cls}" style="width:${sp[k]}%" data-tip="<b>${name}</b><br>${r0(sp[k])}% dell’energia">${sp[k] >= 12 ? `${r0(sp[k])}%` : ''}</span>`;
  return `<div class="split-row"><span class="split-label">${esc(label)}</span><span class="split-bar">${seg('p', 'm-p-bg', 'Proteine')}${seg('c', 'm-c-bg', 'Carboidrati')}${seg('f', 'm-f-bg', 'Grassi')}</span></div>`;
}

function summaryHtml(app) {
  const { lab, plan, ctx } = app.state;
  const a = nutrientsOf(lab.orig);
  const b = nutrientsOf(lab.draft);
  const target = mealTarget(app);
  let day = '';
  if (lab.slot != null || lab.extra) {
    const w = weekView(plan, ctx);
    const d = w.days[lab.day];
    const cur = lab.extra ? d.meals.find((m) => m.extra && m.key === lab.extra.key) : d.meals.find((m) => m.slot === lab.slot);
    const newTotal = d.total.kcal - cur.n.kcal + countedNutrients(lab.draft, ctx).kcal;
    const dt = ctx.nutritionTarget?.kcal;
    const edits = dayHasEdits(plan, ctx, lab.day);
    const reb = !!plan.rebalance?.[lab.day];
    const off = dt && Math.abs(d.total.kcal - dt) / dt > 0.02;
    const rebalanceHtml = !dt || ctx.settings.fitPortions === false ? '' : reb
      ? `<p class="small ok-note">⚖️ Giorno riequilibrato: i carboidrati degli altri pasti sono stati adattati per restare vicino a ${r0(dt)} kcal. <button class="link-btn" data-action="lab-rebalance" data-on="0">Annulla</button></p>`
      : edits && off
        ? `<p class="small muted">Le tue modifiche sono rispettate così come sono: il giorno è a ${r0(d.total.kcal)} kcal.</p>
           <button class="btn small" data-action="lab-rebalance" data-on="1">⚖️ Riequilibra il giorno (adatta i carboidrati degli altri pasti)</button>`
        : '';
    day = `<p class="small">Totale del giorno: <strong>${r0(d.total.kcal)} → ${r0(newTotal)} kcal</strong>${dt ? ` <span class="muted">(obiettivo ${r0(dt)}${ctx.plan ? ', verdure libere escluse come nel piano' : ''})</span>` : ''}</p>${rebalanceHtml}`;
  }
  const row = (k, l) => `<tr><th>${l}</th><td>${r0(a[k])}</td><td><strong>${r0(b[k])}</strong></td><td>${deltaHtml(a[k], b[k])}</td></tr>`;
  const sp = energySplit(b);
  return `
    <h3>Valori del pasto</h3>
    <div class="kcal-hero"><span class="kcal-n">${r0(b.kcal)}</span> kcal ${deltaHtml(a.kcal, b.kcal, ' kcal')}</div>
    ${target ? `<p class="small muted">Obiettivo del pasto ≈ ${r0(target.kcal)} kcal (${esc(target.source)})</p>
      <div class="meter"><span class="meter-fill" style="width:${Math.min(100, (b.kcal / target.kcal) * 100)}%"></span><span class="meter-mark" style="left:${Math.min(100, (target.kcal / Math.max(b.kcal, target.kcal)) * 100)}%"></span></div>` : ''}
    <table class="lab-macros">
      <thead><tr><th></th><th>Originale</th><th>Modificato</th><th>Δ</th></tr></thead>
      <tbody>${row('p', '<span class="dot m-p-bg"></span>Proteine (g)')}${row('c', '<span class="dot m-c-bg"></span>Carboidrati (g)')}${row('f', '<span class="dot m-f-bg"></span>Grassi (g)')}</tbody>
    </table>
    <p class="small muted">Energia da: proteine ${r0(sp.p)}% · carboidrati ${r0(sp.c)}% · grassi ${r0(sp.f)}%</p>
    <div class="split">
      ${splitBar('Originale', a)}
      ${splitBar('Modificato', b)}
      ${ctx.nutritionTarget?.p ? splitBar('Obiettivo piano', ctx.nutritionTarget) : ''}
    </div>
    <div class="split-legend small"><span><span class="dot m-p-bg"></span>Proteine</span><span><span class="dot m-c-bg"></span>Carboidrati</span><span><span class="dot m-f-bg"></span>Grassi</span></div>
    ${day}
    ${lab.slot != null || lab.extra ? `
      <div class="settings-actions">
        <button class="btn primary" data-action="lab-apply">✅ Applica al menù</button>
        <button class="btn" data-action="lab-reset">↺ ${lab.extra ? 'Combinazione originale' : 'Ricetta originale'}</button>
      </div>
      <p class="small muted">Applicando, si aggiornano lista della spesa, meal prep e riepilogo.</p>` : '<p class="small muted">Stai esplorando una ricetta del ricettario: le modifiche non toccano il menù.</p>'}`;
}

function rowCells(x) {
  const n = nutrientsOfItem(x.id, x.q);
  return `${r0(n.kcal)} kcal<br><span class="muted">P ${r0(n.p)} · C ${r0(n.c)} · G ${r0(n.f)}</span>`;
}

function rangeFor(x, orig) {
  const ing = INGREDIENTS[x.id];
  if (ing.u === 'pz') return { max: 6, step: 0.5 };
  const o = orig.find((y) => y.id === x.id)?.q || x.q || 50;
  const max = Math.max(50, Math.ceil((Math.max(o * 2.5, x.q * 1.2)) / 10) * 10);
  return { max, step: max > 200 ? 5 : 1 };
}

function equivalenceHtml(app) {
  const eq = (app.state.lab.eq ??= { from: 'pollo', q: 100, to: 'lenticchie' });
  const res = ['kcal', 'p', 'c', 'f'].map((b) => {
    const v = equivalent(eq.from, eq.q, eq.to, b);
    const u = INGREDIENTS[eq.to].u;
    const fromV = nutrientsOfItem(eq.from, eq.q)[b];
    return `<tr><th>A parità di ${BASIS[b]}</th><td>${v == null || !fromV ? '—' : `<strong>${u === 'pz' ? (Math.round(v * 10) / 10).toLocaleString('it-IT') + ' pz' : r0(v) + ` ${u}`}</strong>`}</td><td class="muted">${r0(fromV)} ${b === 'kcal' ? 'kcal' : 'g'}</td></tr>`;
  }).join('');
  return `
    <h3>⚖️ Equivalenze tra alimenti</h3>
    <p class="small muted">Utile per le sostituzioni del piano: quanto di un alimento “vale” un altro.</p>
    <div class="eq-row">
      <span class="input-unit"><input type="number" min="0" id="eq-q" value="${eq.q}"><em>${INGREDIENTS[eq.from].u}</em></span>
      <select id="eq-from">${ingredientOptions(eq.from)}</select>
      <span>equivalgono a</span>
      <select id="eq-to">${ingredientOptions(eq.to)}</select>
    </div>
    <table class="lab-macros eq-table"><tbody>${res}</tbody></table>`;
}

export function renderLab(app) {
  const el = $('#tab-lab');
  const { plan, ctx } = app.state;
  if (!plan) return (el.innerHTML = '');
  ensureLab(app);
  const lab = app.state.lab;
  lab.basis ??= 'kcal';
  const day = lab.day ?? 0;
  const meals = mealsOfDay(app, day);
  const curId = currentMealId(lab);
  const cur = meals.find((m) => m.id === curId);
  const recOpts = Object.values(ctx.recipes)
    .filter((r) => r.id !== 'libero')
    .sort((a, b) => a.n.localeCompare(b.n, 'it'))
    .map((r) => `<option value="${r.id}" ${lab.recipeId === r.id ? 'selected' : ''}>${esc(r.n)}</option>`)
    .join('');

  el.innerHTML = `
    <section class="panel lab-picker">
      <h3>Pasto da analizzare</h3>
      <div class="seg-label small muted">Giorno</div>
      <div class="seg" role="group" aria-label="Giorno">${DAYS_SHORT.map((d, i) => `<button class="seg-btn ${!lab.recipeId && day === i ? 'on' : ''}" data-action="lab-day" data-day="${i}" title="${DAYS[i]}">${d}</button>`).join('')}</div>
      <div class="seg-label small muted">Pasto</div>
      <div class="seg wrap" role="group" aria-label="Pasto">${meals.map((m) => `<button class="seg-btn ${!lab.recipeId && m.id === curId ? 'on' : ''}" data-action="lab-meal" data-meal="${m.id}">${esc(m.label)}${m.custom ? ' ✏️' : ''}</button>`).join('')}
        ${mealsOfDay(app, day).length < weekView(plan, ctx).days[day].meals.length ? '<span class="small muted seg-note">🎉 pasto libero</span>' : ''}</div>
      ${lab.recipeId
        ? `<p class="lab-current">🔎 Ricettario: <strong>${esc(ctx.recipes[lab.recipeId].n)}</strong> <span class="small muted">(solo simulazione)</span></p>`
        : cur ? `<p class="lab-current"><strong>${esc(DAYS[day])} · ${esc(cur.label)}:</strong> ${esc(cur.name)}</p>` : ''}
      <details class="small" ${lab.recipeId ? 'open' : ''}>
        <summary>…oppure esplora una ricetta del ricettario</summary>
        <select id="lab-recipe"><option value="">Scegli una ricetta…</option>${recOpts}</select>
      </details>
    </section>
    <div class="lab-grid">
      <section class="panel">
        <h3>Ingredienti</h3>
        <label class="field inline"><span>Quando sostituisci un ingrediente, mantieni uguali le</span>
          <select id="lab-basis">${Object.entries(BASIS).map(([k, l]) => `<option value="${k}" ${lab.basis === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </label>
        <div class="lab-rows">
          ${lab.draft.map((x, i) => {
            const rg = rangeFor(x, lab.orig);
            const u = INGREDIENTS[x.id].u;
            return `
            <div class="lab-row" data-row="${i}">
              <select data-lab-sub="${i}" aria-label="Ingrediente">${ingredientOptions(x.id)}</select>
              <div class="lab-qty">
                <input type="range" min="0" max="${rg.max}" step="${rg.step}" value="${x.q}" data-lab-range="${i}" aria-label="Quantità di ${esc(shortName(x.id))}">
                <span class="input-unit"><input type="number" min="0" step="${u === 'pz' ? 0.5 : 1}" value="${x.q}" data-lab-q="${i}"><em>${u}</em></span>
              </div>
              <div class="lab-row-n small" data-lab-n="${i}">${rowCells(x)}</div>
              <button class="icon-btn" data-action="lab-del" data-row="${i}" title="Togli ingrediente">✖</button>
            </div>`;
          }).join('')}
        </div>
        <div class="eq-row">
          <select id="lab-add-id">${ingredientOptions('zucchine')}</select>
          <button class="btn small" data-action="lab-add">＋ Aggiungi</button>
        </div>
      </section>
      <section class="panel lab-summary" id="lab-summary">${summaryHtml(app)}</section>
    </div>
    <section class="panel" id="lab-eq">${equivalenceHtml(app)}</section>`;
}

function live(app, i) {
  const lab = app.state.lab;
  const cell = document.querySelector(`[data-lab-n="${i}"]`);
  if (cell) cell.innerHTML = rowCells(lab.draft[i]);
  $('#lab-summary').innerHTML = summaryHtml(app);
}

export const labActions = (app) => ({
  edit: (el) => {
    openLab(app, Number(el.dataset.slot));
    app.setTab('lab');
  },
  'lab-del': (el) => {
    app.state.lab.draft.splice(Number(el.dataset.row), 1);
    renderLab(app);
  },
  'lab-add': () => {
    const id = $('#lab-add-id').value;
    const ing = INGREDIENTS[id];
    app.state.lab.draft.push({ id, q: ing.u === 'pz' ? 1 : ing.ro === 'fat' ? 5 : 50 });
    renderLab(app);
  },
  'lab-day': (el) => {
    const lab = app.state.lab;
    const day = Number(el.dataset.day);
    const prev = currentMealId(lab);
    const meals = mealsOfDay(app, day);
    // stesso tipo di pasto nel nuovo giorno, se c'è
    const want = prev?.startsWith('s:') ? `s:${day * 2 + (Number(prev.slice(2)) % 2)}` : prev;
    const pick = meals.find((m) => m.id === want) || meals[0];
    if (pick) selectMeal(app, day, pick.id);
    renderLab(app);
  },
  'lab-meal': (el) => {
    selectMeal(app, app.state.lab.day ?? 0, el.dataset.meal);
    renderLab(app);
  },
  'x-edit': (el) => {
    openExtra(app, el.dataset.key, Number(el.dataset.day));
    app.setTab('lab');
  },
  'lab-apply': () => {
    const { lab, plan, ctx } = app.state;
    if (lab.extra) {
      const items = lab.draft.filter((x) => x.q > 0).map((x) => ({ id: x.id, q: x.q }));
      const same = JSON.stringify(items) === JSON.stringify(lab.orig);
      setExtraDay(plan, lab.extra.key, lab.extra.day, { custom: same ? null : items });
      fitPlan(plan, ctx);
      openExtra(app, lab.extra.key, lab.extra.day);
      app.save();
      app.rerender();
      return app.toast(same ? 'Combinazione originale' : 'Pasto aggiornato: menù, spesa, meal prep e nutrienti');
    }
    const sl = plan.slots[lab.slot];
    const items = lab.draft.filter((x) => x.q > 0).map((x) => ({ id: x.id, q: x.q }));
    const same = JSON.stringify(items) === JSON.stringify(lab.orig);
    sl.custom = same ? null : { r: shownId(sl), ing: items };
    // l'avanzo del giorno dopo è la stessa preparazione
    if (lab.slot % 2 === 1 && plan.slots[lab.slot + 1]?.lo) plan.slots[lab.slot + 1].custom = sl.custom;
    fitPlan(plan, ctx);
    lab.orig = clone(slotIngredients({ ...sl, custom: null }, lab.slot, ctx));
    lab.draft = clone(slotIngredients(sl, lab.slot, ctx));
    app.save();
    app.rerender();
    app.toast(same ? 'Ricetta originale' : 'Pasto aggiornato: menù, spesa, meal prep e nutrienti');
  },
  'lab-rebalance': (el) => {
    const { lab, plan, ctx } = app.state;
    plan.rebalance ??= {};
    if (el.dataset.on === '1') plan.rebalance[lab.day] = true;
    else delete plan.rebalance[lab.day];
    fitPlan(plan, ctx);
    if (lab.extra) openExtra(app, lab.extra.key, lab.extra.day);
    else if (lab.slot != null) {
      const draft = lab.draft;
      openLab(app, lab.slot);
      app.state.lab.draft = draft;
    }
    app.save();
    app.rerender();
    app.toast(el.dataset.on === '1' ? 'Giorno riequilibrato sull’obiettivo calorico' : 'Riequilibrio annullato');
  },
  'lab-reset': () => {
    const { lab, plan, ctx } = app.state;
    if (lab.extra) {
      setExtraDay(plan, lab.extra.key, lab.extra.day, { custom: null });
      fitPlan(plan, ctx);
      openExtra(app, lab.extra.key, lab.extra.day);
      app.save();
      app.rerender();
      return app.toast('Ripristinata la combinazione originale');
    }
    const sl = plan.slots[lab.slot];
    sl.custom = null;
    if (lab.slot % 2 === 1 && plan.slots[lab.slot + 1]?.lo) plan.slots[lab.slot + 1].custom = null;
    fitPlan(plan, ctx);
    openLab(app, lab.slot);
    app.save();
    app.rerender();
    app.toast('Ripristinata la ricetta originale');
  },
});

/** Input continui (cursori, numeri): aggiornamento senza ridisegnare la pagina. */
export function handleLabInput(app, el) {
  const lab = app.state.lab;
  if (!lab) return false;
  if (el.dataset.labRange != null || el.dataset.labQ != null) {
    const i = Number(el.dataset.labRange ?? el.dataset.labQ);
    const q = Math.max(0, Number(el.value) || 0);
    lab.draft[i].q = q;
    const other = el.dataset.labRange != null ? `[data-lab-q="${i}"]` : `[data-lab-range="${i}"]`;
    const o = document.querySelector(other);
    if (o) o.value = q;
    live(app, i);
    return true;
  }
  if (['eq-q', 'eq-from', 'eq-to'].includes(el.id)) {
    lab.eq.q = Number($('#eq-q').value) || 0;
    lab.eq.from = $('#eq-from').value;
    lab.eq.to = $('#eq-to').value;
    $('#lab-eq').innerHTML = equivalenceHtml(app);
    return true;
  }
  return false;
}

export function handleLabChange(app, el) {
  const lab = app.state.lab;
  if (!lab) return false;
  if (el.id === 'lab-recipe') {
    if (el.value) openRecipe(app, el.value);
    renderLab(app);
    return true;
  }
  if (el.id === 'lab-basis') {
    lab.basis = el.value;
    return true;
  }
  if (el.dataset.labSub != null) {
    const i = Number(el.dataset.labSub);
    const old = lab.draft[i];
    const to = el.value;
    let q;
    if (lab.basis === 'g') {
      const g = INGREDIENTS[old.id].u === 'pz' ? old.q * (INGREDIENTS[old.id].pw || 100) : old.q;
      q = INGREDIENTS[to].u === 'pz' ? g / (INGREDIENTS[to].pw || 100) : g;
    } else {
      q = equivalent(old.id, old.q, to, lab.basis) ?? equivalent(old.id, old.q, to, 'kcal') ?? old.q;
    }
    q = INGREDIENTS[to].u === 'pz' ? Math.max(0.5, Math.round(q * 2) / 2) : Math.round(q);
    lab.draft[i] = { id: to, q };
    renderLab(app);
    app.toast(`${shortName(old.id)} → ${r0(q)} ${INGREDIENTS[to].u} di ${shortName(to).toLowerCase()} (a parità di ${BASIS[lab.basis]})`);
    return true;
  }
  if (['eq-from', 'eq-to'].includes(el.id)) return handleLabInput(app, el);
  return false;
}

export { macroLine };
