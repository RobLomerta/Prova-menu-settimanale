import { INGREDIENTS } from './data/ingredients.js';
import { buildContext, REGIMES, EXCLUSIONS, PROTEINS, DEFAULT_SETTINGS } from './engine/diet.js';
import { generatePlan, replaceSlot, toggleLeftover, canBecomeLeftover, buildExtras, fitPlan, shownId, slotIngredients, breakfastStyle } from './engine/planner.js';
import { shoppingList, shoppingText, fmtQty } from './engine/shopping.js';
import { mealPrepPlan } from './engine/mealprep.js';
import { weekView } from './engine/week.js';
import { DAYS, isWorkLunch, slotMeal } from './engine/common.js';
import { $, esc, r0, macroLine, installTooltip } from './ui/util.js';
import { renderPiano, planActions, handlePlanChange, handlePlanFile } from './ui/piano.js';
import { renderLab, labActions, handleLabInput, handleLabChange } from './ui/lab.js';
import { renderStats } from './ui/stats.js';

const STORE_KEY = 'menu-settimanale-v2';
const OLD_KEY = 'menu-settimanale-v1';
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const TABS = ['menu', 'spesa', 'prep', 'lab', 'stats', 'piano'];

const state = {
  settings: { ...DEFAULT_SETTINGS },
  dietPlan: null,
  plan: null,
  checked: {},
  tab: 'menu',
  ctx: null,
  lab: null,
  planImport: null,
  tried: {}, // slot -> Set di ricette già proposte con "Cambia"
};

// ---------------------------------------------------------------------------
// Persistenza (solo nel browser di chi usa l'app)
// ---------------------------------------------------------------------------

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(OLD_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
    state.dietPlan = data.dietPlan || null;
    state.plan = data.plan?.extras ? data.plan : null; // i piani della versione precedente vengono rigenerati
    state.checked = data.checked || {};
    state.tab = TABS.includes(data.tab) ? data.tab : 'menu';
  } catch {
    /* storage non disponibile: si riparte dai valori predefiniti */
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      settings: state.settings, dietPlan: state.dietPlan, plan: state.plan, checked: state.checked, tab: state.tab,
    }));
  } catch {
    /* ignora */
  }
}

// ---------------------------------------------------------------------------
// Azioni
// ---------------------------------------------------------------------------

function showError(msg) {
  const el = $('#error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 2600);
}

function regenerate({ keepLocked = true } = {}) {
  state.ctx = buildContext(state.settings, state.dietPlan);
  const fixed = keepLocked && state.plan ? state.plan.slots.map((s) => (s.locked ? s : null)) : [];
  try {
    state.plan = generatePlan(state.ctx, { seed: Math.floor(Math.random() * 2 ** 31), fixed });
    if (keepLocked && fixed.length) {
      state.plan.slots.forEach((sl, i) => {
        if (fixed[i]?.useAlt && sl.alt) sl.useAlt = true;
      });
      fitPlan(state.plan, state.ctx);
    }
    state.checked = {};
    state.tried = {};
    state.lab = null;
    showError('');
  } catch (e) {
    showError(e.message);
  }
  save();
  render();
}

function planIsValid(plan, ctx) {
  return plan?.slots?.length === 14 && plan.slots.every((s) => ctx.recipes[s.r] && (!s.alt || ctx.recipes[s.alt]));
}

function setTab(tab) {
  state.tab = tab;
  save();
  render();
  window.scrollTo({ top: $('.tabs').offsetTop - 70 });
}

const app = { state, save, rerender: () => render(), regenerate, toast, setTab };

const actions = {
  generate: () => {
    regenerate();
    toast('Nuovo menù generato');
  },
  'generate-all': () => {
    regenerate({ keepLocked: false });
    toast('Nuovo menù generato (blocchi rimossi)');
  },
  print: () => window.print(),
  'go-piano': () => setTab('piano'),
  swap: (el) => {
    const s = Number(el.dataset.slot);
    const tried = (state.tried[s] ??= new Set([state.plan.slots[s].r]));
    let res = replaceSlot(state.plan, s, state.ctx, tried);
    if (!res) {
      tried.clear();
      tried.add(state.plan.slots[s].r);
      res = replaceSlot(state.plan, s, state.ctx, tried);
    }
    if (!res) return toast('Nessuna alternativa disponibile');
    tried.add(res.id);
    state.plan = res.plan;
    save();
    render();
  },
  lock: (el) => {
    const sl = state.plan.slots[Number(el.dataset.slot)];
    sl.locked = !sl.locked;
    save();
    render();
  },
  leftover: (el) => {
    const next = toggleLeftover(state.plan, Number(el.dataset.slot), state.ctx);
    if (!next) return toast('Non possibile per questo pasto');
    state.plan = next;
    save();
    render();
  },
  'use-alt': (el) => {
    state.plan.slots[Number(el.dataset.slot)].useAlt = el.checked;
    fitPlan(state.plan, state.ctx);
    save();
    render();
  },
  'all-alt': (el) => {
    const on = el.dataset.on === '1';
    state.plan.slots.forEach((sl) => {
      if (sl.alt) sl.useAlt = on;
    });
    fitPlan(state.plan, state.ctx);
    save();
    render();
    toast(on ? 'Tutte le alternative senza pesce attive' : 'Pesce ripristinato');
  },
  check: (el) => {
    state.checked[el.dataset.key] = el.checked;
    save();
    el.closest('li')?.classList.toggle('done', el.checked);
  },
  'clear-checks': () => {
    state.checked = {};
    save();
    render();
  },
  copy: async () => {
    const text = shoppingText(shoppingList(state.plan, state.ctx), state.checked);
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'Lista della spesa', text });
      else {
        await navigator.clipboard.writeText(text);
        toast('Lista copiata negli appunti');
      }
    } catch {
      /* condivisione annullata */
    }
  },
  'bf-toggle': (el) => {
    const day = Number(el.dataset.day);
    const cur = breakfastStyle(state.plan, state.ctx, day);
    state.plan.bfStyle ??= Array(7).fill(null);
    const next = cur === 'dolce' ? 'salata' : 'dolce';
    const pref = state.settings.breakfastStyle || 'dolce';
    const def = pref === 'alternata' ? (day % 2 ? 'salata' : 'dolce') : pref;
    state.plan.bfStyle[day] = next === def ? null : next;
    fitPlan(state.plan, state.ctx);
    save();
    render();
  },
  'new-extras': () => {
    state.plan.extras = buildExtras(state.plan, state.ctx, Math.random);
    fitPlan(state.plan, state.ctx);
    save();
    render();
    toast('Nuove colazioni e spuntini');
  },
  ...planActions(app),
  ...labActions(app),
};

// ---------------------------------------------------------------------------
// Impostazioni
// ---------------------------------------------------------------------------

function renderSettings() {
  const s = state.settings;
  const plan = state.dietPlan;
  const planOn = plan && s.usePlan;
  const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  const t = state.ctx?.nutritionTarget;
  $('#settings-form').innerHTML = `
    <div class="field plan-box">
      <span>Piano alimentare</span>
      ${plan
        ? `<p class="small">📄 <strong>${esc(plan.source || 'Piano')}</strong>${t ? ` · ${r0(t.kcal)} kcal${t.p ? ` · P ${r0(t.p)} · C ${r0(t.c)} · G ${r0(t.f)}` : ''}` : ''}</p>
           <label class="check"><input type="checkbox" name="usePlan" ${s.usePlan ? 'checked' : ''}> Usa il piano per porzioni, calorie e frequenze</label>
           <button type="button" class="btn small" data-action="go-piano">Rivedi il piano</button>`
        : `<p class="small muted">Allega il piano del nutrizionista: porzioni e calorie del menù seguiranno le sue grammature.</p>
           <button type="button" class="btn small" data-action="go-piano">📎 Allega piano alimentare</button>`}
    </div>
    <label class="field">
      <span>Regime alimentare</span>
      <select name="regime">${Object.entries(REGIMES).map(([k, r]) => opt(k, r.label, s.regime)).join('')}</select>
    </label>
    <label class="field">
      <span>Obiettivo calorico giornaliero</span>
      ${planOn
        ? `<span class="small muted">Dal piano alimentare</span><input type="hidden" name="kcalTarget" value="${s.kcalTarget ?? ''}">`
        : `<span class="input-unit"><input type="number" name="kcalTarget" min="1000" max="4000" step="50" placeholder="facoltativo, es. 1800" value="${s.kcalTarget ?? ''}"><em>kcal</em></span>`}
    </label>
    <label class="field">
      <span>Porzioni ${planOn || s.kcalTarget ? '<em class="muted">(calcolate dall’obiettivo)</em>' : ''}</span>
      <select name="portion" ${planOn || s.kcalTarget ? 'disabled' : ''}>${opt('leggera', 'Leggere', s.portion)}${opt('normale', 'Normali', s.portion)}${opt('abbondante', 'Abbondanti', s.portion)}</select>
    </label>
    <label class="field">
      <span>Colazione</span>
      <select name="breakfastStyle">${opt('dolce', 'Dolce', s.breakfastStyle)}${opt('salata', 'Salata', s.breakfastStyle)}${opt('alternata', 'Alternata (un giorno dolce, uno salata)', s.breakfastStyle)}</select>
    </label>
    <label class="field">
      <span>Mese (per la stagionalità)</span>
      <select name="month">${MONTHS.map((m, i) => opt(i + 1, m[0].toUpperCase() + m.slice(1), s.month)).join('')}</select>
    </label>
    <label class="field">
      <span>Cene doppie → pranzo del giorno dopo</span>
      <select name="leftovers">${[0, 1, 2, 3].map((n) => opt(n, n === 0 ? 'Nessuna' : `${n} a settimana`, s.leftovers)).join('')}</select>
    </label>
    <fieldset class="field">
      <legend>Intolleranze</legend>
      <label class="check"><input type="checkbox" name="gluten" ${s.gluten ? 'checked' : ''}> Senza glutine</label>
      <label class="check"><input type="checkbox" name="lactose" ${s.lactose ? 'checked' : ''}> Senza lattosio</label>
    </fieldset>
    <fieldset class="field">
      <legend>Escludi</legend>
      ${Object.entries(EXCLUSIONS).map(([k, l]) => `<label class="check"><input type="checkbox" name="ex_${k}" ${s.exclude.includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}
    </fieldset>
    <fieldset class="field">
      <legend>Spesa</legend>
      <label class="check"><input type="radio" name="twoShops" value="1" ${s.twoShops ? 'checked' : ''}> Due spese: weekend + mercoledì (più fresco)</label>
      <label class="check"><input type="radio" name="twoShops" value="0" ${!s.twoShops ? 'checked' : ''}> Una sola spesa nel weekend</label>
    </fieldset>
    <fieldset class="field">
      <legend>Altro</legend>
      <label class="check"><input type="checkbox" name="breakfast" ${s.breakfast ? 'checked' : ''} ${planOn ? 'disabled' : ''}> Includi le colazioni${planOn ? ' (dal piano)' : ''}</label>
      <label class="check"><input type="checkbox" name="fitPortions" ${s.fitPortions !== false ? 'checked' : ''}> Adatta i carboidrati per centrare le calorie del giorno</label>
    </fieldset>
    <div class="settings-actions">
      <button type="submit" class="btn primary">Applica e genera</button>
      <button type="button" class="btn" data-action="generate-all">Rigenera tutto (sblocca i pasti)</button>
    </div>`;
  const ex = s.exclude.map((k) => EXCLUSIONS[k].toLowerCase());
  const tags = [
    planOn ? `📄 piano ${t ? `${r0(t.kcal)} kcal` : ''}` : s.kcalTarget ? `${s.kcalTarget} kcal` : null,
    REGIMES[s.regime].label, s.gluten && 'senza glutine', s.lactose && 'senza lattosio', ex.length && `no ${ex.join(', ')}`,
  ].filter(Boolean);
  $('#settings-summary').textContent = tags.join(' · ');
}

function readSettings(form) {
  const fd = new FormData(form);
  const kcal = Number(fd.get('kcalTarget'));
  return {
    ...state.settings,
    regime: fd.get('regime'),
    portion: fd.get('portion') || state.settings.portion,
    month: Number(fd.get('month')),
    leftovers: Number(fd.get('leftovers')),
    gluten: fd.has('gluten'),
    lactose: fd.has('lactose'),
    exclude: Object.keys(EXCLUSIONS).filter((k) => fd.has(`ex_${k}`)),
    twoShops: fd.get('twoShops') === '1',
    breakfast: form.breakfast.disabled ? state.settings.breakfast : fd.has('breakfast'),
    breakfastStyle: fd.get('breakfastStyle') || 'dolce',
    fitPortions: fd.has('fitPortions'),
    kcalTarget: kcal >= 800 ? kcal : null,
    usePlan: form.usePlan ? fd.has('usePlan') : state.settings.usePlan,
  };
}

// ---------------------------------------------------------------------------
// Menù
// ---------------------------------------------------------------------------

function proteinBadge(cat) {
  const pr = PROTEINS[cat];
  return pr ? `<span class="badge" style="--c:${pr.color}">${esc(pr.label)}</span>` : '';
}

function ingList(items) {
  return items
    .map(({ id, q }) => {
      const i = INGREDIENTS[id];
      const qty = i.u === 'pz' ? `${q.toLocaleString('it-IT')}` : fmtQty(q, i.u);
      return `<li>${esc(i.n.replace(/ \(.*\)$/, ''))} <span class="muted">${esc(qty)}</span></li>`;
    })
    .join('');
}

function recipeDetails(r, items, { leftover = false } = {}) {
  const pantry = r.pantry.filter((id) => id !== 'olio').map((id) => INGREDIENTS[id].n).join(', ');
  return `
    <details class="recipe">
      <summary>Ingredienti e preparazione</summary>
      <ul class="ing-list">${ingList(items)}</ul>
      ${pantry ? `<p class="muted small">Dalla dispensa: ${esc(pantry)}</p>` : ''}
      <p>${esc(r.s)}</p>
      ${r.tip ? `<p class="tip">🎒 ${esc(r.tip)}</p>` : ''}
      ${r.notes.length ? `<p class="small note">Adattata: ${esc(r.notes.join('; '))}</p>` : ''}
      ${leftover ? '<p class="small muted">È la seconda porzione cucinata la sera prima: niente da preparare.</p>' : ''}
      <p class="small muted">⏱ ${r.t} min${r.keep ? ` · in frigo ${r.keep} giorni` : ''}${r.fz ? ' · si congela' : ''}</p>
    </details>`;
}

function mealBlock(s, nut) {
  const { plan, ctx } = state;
  const sl = plan.slots[s];
  const r = ctx.recipes[sl.r];
  const shown = ctx.recipes[shownId(sl)];
  const work = isWorkLunch(s);
  const label = slotMeal(s) === 'P' ? 'Pranzo' : 'Cena';

  if (shown.id === 'libero') {
    return `
      <div class="meal free">
        <div class="meal-head"><span class="meal-label">${label}</span><span class="pill lo">🎉 pasto libero</span></div>
        <h4>${esc(shown.n)}</h4>
        <p class="small muted">${esc(shown.s)} Non entra nella spesa né nel conteggio delle calorie.</p>
      </div>`;
  }

  const items = slotIngredients(sl, s, ctx);
  const nextLo = plan.slots[s + 1]?.lo;
  const canLo = canBecomeLeftover(plan, s, ctx);
  const custom = sl.custom && sl.custom.r === shown.id;
  const outSeason = shown.outOfSeason.map((id) => INGREDIENTS[id].n.toLowerCase());

  const alt = sl.alt
    ? `<div class="alt ${sl.useAlt ? 'on' : ''}">
        <label class="switch">
          <input type="checkbox" data-action="use-alt" data-slot="${s}" ${sl.useAlt ? 'checked' : ''}>
          <span>${sl.useAlt ? '🐟 Torna al pesce:' : '🥦 Alternativa senza pesce:'}</span>
        </label>
        <strong>${esc(sl.useAlt ? r.n : ctx.recipes[sl.alt].n)}</strong>
        ${sl.useAlt ? '' : proteinBadge(ctx.recipes[sl.alt].cat)}
      </div>`
    : '';

  return `
    <div class="meal ${sl.locked ? 'locked' : ''}">
      <div class="meal-head">
        <span class="meal-label">${label}</span>
        ${work ? '<span class="pill work" title="Da portare al lavoro">🎒 da portare</span>' : ''}
        ${sl.lo ? '<span class="pill lo">♻️ avanzo di ieri sera</span>' : ''}
        ${nextLo ? '<span class="pill lo">✖2 cucina doppia porzione</span>' : ''}
        ${custom ? '<span class="pill edit">✏️ modificato</span>' : ''}
        <span class="meal-tools">
          <button class="icon-btn" data-action="edit" data-slot="${s}" title="Modifica ingredienti e vedi i valori nutrizionali">✏️</button>
          ${canLo || sl.lo ? `<button class="icon-btn" data-action="leftover" data-slot="${s}" title="${sl.lo ? 'Usa una ricetta diversa' : 'Usa l’avanzo della cena di ieri'}">${sl.lo ? '✨' : '♻️'}</button>` : ''}
          <button class="icon-btn" data-action="swap" data-slot="${s}" title="Proponi un altro piatto" ${sl.locked ? 'disabled' : ''}>🔄</button>
          <button class="icon-btn" data-action="lock" data-slot="${s}" title="${sl.locked ? 'Sblocca' : 'Blocca: resta anche rigenerando'}">${sl.locked ? '🔒' : '🔓'}</button>
        </span>
      </div>
      <h4>${esc(shown.n)} ${proteinBadge(shown.cat)}</h4>
      <p class="macro small">${macroLine(nut)}</p>
      ${outSeason.length ? `<p class="small warn">Fuori stagione: ${esc(outSeason.join(', '))}</p>` : ''}
      ${alt}
      ${recipeDetails(shown, items, { leftover: sl.lo })}
    </div>`;
}

function renderMenu() {
  const { plan, ctx } = state;
  const el = $('#tab-menu');
  if (!plan) return (el.innerHTML = '');
  const w = weekView(plan, ctx);
  const target = ctx.nutritionTarget;
  const hasFish = plan.slots.some((s) => s.alt);
  const allAlt = hasFish && plan.slots.filter((s) => s.alt).every((s) => s.useAlt);
  const days = w.days.map((d) => {
    const parts = d.meals.map((m) => {
      if (m.extra) {
        const bf = m.key === 'colazione' ? breakfastStyle(plan, ctx, d.day) : null;
        const toggle = bf ? `<button class="pill-btn" data-action="bf-toggle" data-day="${d.day}" title="Passa a colazione ${bf === 'dolce' ? 'salata' : 'dolce'}">${bf === 'dolce' ? '🍯 dolce' : '🧀 salata'} ⇄</button>` : '';
        return `<div class="extra"><span class="extra-label">${esc(m.label)}</span> ${toggle} <span>${esc(m.name)}</span>
          <span class="muted small">· ${esc(m.ing.map((x) => `${INGREDIENTS[x.id].u === 'pz' ? x.q : fmtQty(x.q, INGREDIENTS[x.id].u)} ${INGREDIENTS[x.id].n.replace(/ \(.*\)$/, '').toLowerCase()}`).join(', '))} · ${r0(m.n.kcal)} kcal</span></div>`;
      }
      return mealBlock(m.slot, m.n);
    }).join('');
    const pct = target?.kcal ? Math.min(100, (d.total.kcal / target.kcal) * 100) : null;
    return `
      <article class="day ${d.day >= 5 ? 'weekend' : ''}">
        <div class="day-head">
          <h3>${DAYS[d.day]}</h3>
          <span class="day-kcal" data-tip="<b>${DAYS[d.day]}</b><br>${r0(d.total.kcal)} kcal · P ${r0(d.total.p)} g · C ${r0(d.total.c)} g · G ${r0(d.total.f)} g${ctx.plan ? `<br>+ ~${r0(d.vegKcal)} kcal di verdure libere` : ''}${d.free ? '<br>pasto libero escluso' : ''}">${r0(d.total.kcal)} kcal${d.free ? '*' : ''}</span>
        </div>
        ${pct != null ? `<div class="meter thin" title="${r0(d.total.kcal)} di ${r0(target.kcal)} kcal"><span class="meter-fill" style="width:${pct}%"></span></div>` : ''}
        ${parts}
      </article>`;
  }).join('');
  el.innerHTML = `
    ${ctx.plan ? `<p class="plan-note small">📄 Menù costruito sul tuo piano alimentare: porzioni ricalcolate sulle grammature del piano${target ? `, obiettivo ${r0(target.kcal)} kcal al giorno` : ''}.</p>` : ''}
    <div class="toolbar">
      <p class="muted small">✏️ modifica ingredienti · 🔄 cambia piatto · 🔒 blocca · ♻️ usa l’avanzo della cena</p>
      <div class="toolbar-btns">
        ${hasFish ? `<button class="btn small" data-action="all-alt" data-on="${allAlt ? '0' : '1'}">${allAlt ? '🐟 Rimetti il pesce' : '🥦 Tutto senza pesce'}</button>` : ''}
        ${plan.extras?.some((x) => x.key === 'colazione' || ctx.plan) ? '<button class="btn small" data-action="new-extras">☕ Cambia colazioni e spuntini</button>' : ''}
      </div>
    </div>
    <div class="days">${days}</div>`;
}

// ---------------------------------------------------------------------------
// Spesa
// ---------------------------------------------------------------------------

function itemRow(it) {
  const done = state.checked[it.key];
  return `
    <li class="${done ? 'done' : ''}">
      <label>
        <input type="checkbox" data-action="check" data-key="${esc(it.key)}" ${done ? 'checked' : ''}>
        <span class="item-main"><span class="item-name">${esc(it.name)}</span> <strong>${esc(it.buy || '')}</strong></span>
      </label>
      ${it.detail || it.leftover || it.uses?.length ? `<div class="item-sub">
        ${it.detail ? `<span>${esc(it.detail)}</span>` : ''}
        ${it.leftover ? `<span class="warn">♻️ ${esc(it.leftover)}</span>` : ''}
        ${it.uses?.length ? `<span class="muted">per: ${esc(it.uses.join(', '))}</span>` : ''}
      </div>` : ''}
    </li>`;
}

function renderShopping() {
  const { plan, ctx } = state;
  const el = $('#tab-spesa');
  if (!plan) return (el.innerHTML = '');
  const list = shoppingList(plan, ctx);
  const nAlt = plan.slots.filter((s) => s.useAlt).length;
  const nCustom = plan.slots.filter((s) => s.custom && s.custom.r === shownId(s)).length;
  el.innerHTML = `
    <div class="toolbar">
      <p class="muted small">${nAlt ? `Include ${nAlt} alternativ${nAlt > 1 ? 'e' : 'a'} senza pesce. ` : ''}${nCustom ? `Include ${nCustom} pas${nCustom > 1 ? 'ti modificati' : 'to modificato'}. ` : ''}Spunta ciò che hai già o che metti nel carrello.</p>
      <div class="toolbar-btns">
        <button class="btn small" data-action="copy">📋 Copia / condividi</button>
        <button class="btn small ghost" data-action="clear-checks">Azzera spunte</button>
      </div>
    </div>
    ${list.warnings.length ? `<div class="alert soft"><strong>Freschezza</strong><ul>${list.warnings.map((w) => `<li>${esc(w.text)}</li>`).join('')}</ul></div>` : ''}
    ${list.shops.map((shop) => `
      <section class="panel shop">
        <h3>🛒 ${esc(shop.title)}</h3>
        ${shop.groups.map((g) => `<h4 class="cat">${esc(g.label)}</h4><ul class="items">${g.items.map(itemRow).join('')}</ul>`).join('')}
      </section>`).join('')}
    <p class="small muted">🍎 Frutta di stagione questo mese: ${esc(list.fruit.suggestions)}.</p>
    <section class="panel shop">
      <h3>🧂 Dispensa – controlla di averli</h3>
      <ul class="items compact">${list.pantry.map((p) => itemRow({ key: p.key, name: p.name, buy: p.buy })).join('')}</ul>
    </section>`;
}

// ---------------------------------------------------------------------------
// Meal prep
// ---------------------------------------------------------------------------

function renderPrep() {
  const { plan, ctx } = state;
  const el = $('#tab-prep');
  if (!plan) return (el.innerHTML = '');
  const mp = mealPrepPlan(plan, ctx);
  el.innerHTML = `
    <p class="lead">Con un paio d’ore la domenica (e mezz’ora il mercoledì) i pranzi della settimana si assemblano in 5 minuti la sera prima.</p>
    <p class="muted small">🧰 ${esc(mp.gear)}</p>
    ${mp.sessions.map((ses) => `
      <section class="panel prep">
        <h3>${esc(ses.title)} <span class="muted small">${esc(ses.subtitle)}</span></h3>
        ${ses.tasks.map((t) => `
          <div class="task">
            <h4>${t.icon} ${esc(t.title)}</h4>
            <p class="small muted">${esc(t.intro)}</p>
            <ul>${t.items.map((it) => `
              <li><strong>${esc(it.name)}</strong>: ${esc(it.qty)}
                ${it.how ? `<div class="small">⏱ ${esc(it.how)}</div>` : ''}
                <div class="small muted">per: ${esc(it.uses.join(', '))}</div>
              </li>`).join('')}</ul>
            ${t.fallback ? `<p class="small tip">${esc(t.fallback)}</p>` : ''}
          </div>`).join('')}
        ${ses.dishes.length ? `
          <div class="task">
            <h4>🍲 Piatti da cucinare per intero</h4>
            <ul>${ses.dishes.map((d) => `
              <li><strong>${esc(d.name)}</strong>${d.portions > 1 ? ' (2 porzioni)' : ''}
                <div class="small muted">per: ${esc(d.use)} · in frigo ${d.keep} giorni${d.fz ? ' · oppure congela' : ''}</div>
              </li>`).join('')}</ul>
          </div>` : ''}
      </section>`).join('')}
    <section class="panel prep">
      <h3>🌙 Ogni sera, 5 minuti: prepara la schiscetta</h3>
      <ul class="evenings">${mp.evenings.map((e) => `
        <li><span class="when">${esc(e.when)}</span> → pranzo di ${esc(e.forDay.toLowerCase())}: <strong>${esc(e.name)}</strong>
          ${e.tip ? `<div class="small muted">${esc(e.tip)}</div>` : ''}
        </li>`).join('')}</ul>
    </section>
    <section class="panel prep">
      <h3>💡 Consigli per conservare</h3>
      <ul class="small">
        <li>Raffredda in fretta ciò che cucini (max 2 ore a temperatura ambiente) e chiudi in contenitori ermetici.</li>
        <li>Condimenti, salse e semi in barattolini a parte: l’insalata resta croccante.</li>
        <li>Il pesce fresco va cucinato entro 1-2 giorni dall’acquisto: per questo compare all’inizio della settimana o dopo la spesa di mercoledì.</li>
        <li>Il pane si conserva al meglio congelato a fette: tosta direttamente quello che ti serve.</li>
        <li>Legumi cotti, sughi, zuppe e polpette si congelano in porzioni singole: una scorta per le settimane più piene.</li>
      </ul>
    </section>`;
}

// ---------------------------------------------------------------------------
// Render principale
// ---------------------------------------------------------------------------

function render() {
  renderSettings();
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = p.id !== `tab-${state.tab}`));
  renderPiano(app);
  if (!state.plan) return;
  renderMenu();
  renderShopping();
  renderPrep();
  renderLab(app);
  renderStats(app);
}

function init() {
  load();
  state.ctx = buildContext(state.settings, state.dietPlan);
  if (!planIsValid(state.plan, state.ctx)) state.plan = null;
  if (!state.plan) regenerate({ keepLocked: false });
  else {
    fitPlan(state.plan, state.ctx);
    render();
  }
  try {
    if (!localStorage.getItem(STORE_KEY + '-seen')) {
      $('#settings').open = true;
      localStorage.setItem(STORE_KEY + '-seen', '1');
    }
  } catch { /* ignora */ }
  installTooltip();

  // I pulsanti d'azione ricevono il focus senza far scorrere la pagina
  // (evita che il click "scivoli" su un altro elemento mentre la pagina si sposta).
  document.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('button[data-action], button[data-tab]');
    if (btn && e.button === 0) {
      e.preventDefault();
      if (document.activeElement && document.activeElement !== btn) document.activeElement.blur?.();
      btn.focus({ preventScroll: true });
    }
  });
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) return setTab(tab.dataset.tab);
    const el = e.target.closest('[data-action]');
    if (!el || el.type === 'checkbox') return;
    actions[el.dataset.action]?.(el);
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'plan-file' && el.files?.[0]) return handlePlanFile(app, el.files[0]);
    if (el.closest('#tab-piano') && handlePlanChange(app, el)) {
      if (el.dataset.pf === 'usePlan') regenerate({ keepLocked: false });
      return;
    }
    if (el.closest('#tab-lab') && handleLabChange(app, el)) return;
    if (el.matches('input[type=checkbox][data-action]')) actions[el.dataset.action]?.(el);
  });
  document.addEventListener('input', (e) => {
    if (e.target.closest('#tab-lab')) handleLabInput(app, e.target);
  });
  $('#settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.settings = readSettings(e.target);
    $('#settings').open = false;
    regenerate();
    toast('Preferenze applicate');
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
