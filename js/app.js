import { INGREDIENTS } from './data/ingredients.js';
import { buildContext, REGIMES, EXCLUSIONS, PROTEINS, DEFAULT_SETTINGS } from './engine/diet.js';
import { generatePlan, replaceSlot, toggleLeftover, canBecomeLeftover, evaluate, breakfastEntries, chooseBreakfasts } from './engine/planner.js';
import { shoppingList, shoppingText, fmtQty } from './engine/shopping.js';
import { mealPrepPlan } from './engine/mealprep.js';
import { DAYS, slotDay, isWorkLunch, slotMeal } from './engine/common.js';

const STORE_KEY = 'menu-settimanale-v1';
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const state = {
  settings: { ...DEFAULT_SETTINGS },
  plan: null,
  checked: {},
  tab: 'menu',
  ctx: null,
  tried: {}, // slot -> Set di ricette già proposte con "Cambia"
};

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------------
// Persistenza
// ---------------------------------------------------------------------------

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
    state.plan = data.plan || null;
    state.checked = data.checked || {};
    state.tab = data.tab || 'menu';
  } catch {
    /* storage non disponibile: si riparte dai valori predefiniti */
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ settings: state.settings, plan: state.plan, checked: state.checked, tab: state.tab }));
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
  toast.t = setTimeout(() => (el.hidden = true), 2200);
}

function regenerate({ keepLocked = true } = {}) {
  state.ctx = buildContext(state.settings);
  const fixed = keepLocked && state.plan ? state.plan.slots.map((s) => (s.locked ? s : null)) : [];
  try {
    state.plan = generatePlan(state.ctx, { seed: Math.floor(Math.random() * 2 ** 31), fixed });
    // mantieni le scelte "usa alternativa" sugli slot bloccati
    if (keepLocked && fixed.length) {
      state.plan.slots.forEach((sl, i) => {
        if (fixed[i]?.useAlt && sl.alt) sl.useAlt = true;
      });
    }
    state.checked = {};
    state.tried = {};
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
    const s = Number(el.dataset.slot);
    const sl = state.plan.slots[s];
    sl.locked = !sl.locked;
    save();
    render();
  },
  leftover: (el) => {
    const s = Number(el.dataset.slot);
    const next = toggleLeftover(state.plan, s, state.ctx);
    if (!next) return toast('Non possibile per questo pasto');
    state.plan = next;
    save();
    render();
  },
  'use-alt': (el) => {
    const s = Number(el.dataset.slot);
    state.plan.slots[s].useAlt = el.checked;
    save();
    render();
  },
  'all-alt': (el) => {
    const on = el.dataset.on === '1';
    state.plan.slots.forEach((sl) => {
      if (sl.alt) sl.useAlt = on;
    });
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
  'new-breakfast': () => {
    state.plan.breakfast = chooseBreakfasts(state.plan, state.ctx, Math.random);
    save();
    render();
  },
};

// ---------------------------------------------------------------------------
// Impostazioni
// ---------------------------------------------------------------------------

function renderSettings() {
  const s = state.settings;
  const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  $('#settings-form').innerHTML = `
    <label class="field">
      <span>Regime alimentare</span>
      <select name="regime">${Object.entries(REGIMES).map(([k, r]) => opt(k, r.label, s.regime)).join('')}</select>
    </label>
    <label class="field">
      <span>Porzioni</span>
      <select name="portion">${opt('leggera', 'Leggere', s.portion)}${opt('normale', 'Normali', s.portion)}${opt('abbondante', 'Abbondanti', s.portion)}</select>
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
      <label class="check"><input type="checkbox" name="breakfast" ${s.breakfast ? 'checked' : ''}> Includi le colazioni</label>
    </fieldset>
    <div class="settings-actions">
      <button type="submit" class="btn primary">Applica e genera</button>
      <button type="button" class="btn" data-action="generate-all">Rigenera tutto (sblocca i pasti)</button>
    </div>`;
  const ex = s.exclude.map((k) => EXCLUSIONS[k].toLowerCase());
  const tags = [REGIMES[s.regime].label, s.gluten && 'senza glutine', s.lactose && 'senza lattosio', ex.length && `no ${ex.join(', ')}`].filter(Boolean);
  $('#settings-summary').textContent = tags.join(' · ');
}

function readSettings(form) {
  const fd = new FormData(form);
  return {
    regime: fd.get('regime'),
    portion: fd.get('portion'),
    month: Number(fd.get('month')),
    leftovers: Number(fd.get('leftovers')),
    gluten: fd.has('gluten'),
    lactose: fd.has('lactose'),
    exclude: Object.keys(EXCLUSIONS).filter((k) => fd.has(`ex_${k}`)),
    twoShops: fd.get('twoShops') === '1',
    breakfast: fd.has('breakfast'),
  };
}

// ---------------------------------------------------------------------------
// Menù
// ---------------------------------------------------------------------------

function proteinBadge(p) {
  const pr = PROTEINS[p];
  return pr ? `<span class="badge" style="--c:${pr.color}">${esc(pr.label)}</span>` : '';
}

function recipeDetails(r, { leftover = false } = {}) {
  const ing = r.ing
    .map(({ id, q }) => {
      const i = INGREDIENTS[id];
      const qty = i.u === 'pz' ? `${q.toLocaleString('it-IT')}` : fmtQty(q, i.u);
      return `<li>${esc(i.n.replace(/ \(.*\)$/, ''))} <span class="muted">${esc(qty)}</span></li>`;
    })
    .join('');
  const pantry = r.pantry.map((id) => INGREDIENTS[id].n).join(', ');
  return `
    <details class="recipe">
      <summary>Ingredienti e preparazione</summary>
      <ul class="ing-list">${ing}</ul>
      ${pantry ? `<p class="muted small">Dalla dispensa: ${esc(pantry)}</p>` : ''}
      <p>${esc(r.s)}</p>
      ${r.tip ? `<p class="tip">🎒 ${esc(r.tip)}</p>` : ''}
      ${r.notes.length ? `<p class="small note">Adattata: ${esc(r.notes.join('; '))}</p>` : ''}
      ${leftover ? '<p class="small muted">È la seconda porzione cucinata la sera prima: niente da preparare.</p>' : ''}
      <p class="small muted">⏱ ${r.t} min${r.keep ? ` · in frigo ${r.keep} giorni` : ''}${r.fz ? ' · si congela' : ''}</p>
    </details>`;
}

function mealBlock(s) {
  const { plan, ctx } = state;
  const sl = plan.slots[s];
  const r = ctx.recipes[sl.r];
  const shown = sl.useAlt && sl.alt ? ctx.recipes[sl.alt] : r;
  const work = isWorkLunch(s);
  const nextLo = plan.slots[s + 1]?.lo;
  const canLo = canBecomeLeftover(plan, s, ctx);
  const outSeason = shown.outOfSeason.map((id) => INGREDIENTS[id].n.toLowerCase());

  const alt = sl.alt
    ? `<div class="alt ${sl.useAlt ? 'on' : ''}">
        <label class="switch">
          <input type="checkbox" data-action="use-alt" data-slot="${s}" ${sl.useAlt ? 'checked' : ''}>
          <span>${sl.useAlt ? '🐟 Torna al pesce:' : '🥦 Alternativa senza pesce:'}</span>
        </label>
        <strong>${esc(sl.useAlt ? r.n : ctx.recipes[sl.alt].n)}</strong>
        ${sl.useAlt ? '' : proteinBadge(ctx.recipes[sl.alt].p)}
      </div>`
    : '';

  return `
    <div class="meal ${sl.locked ? 'locked' : ''}">
      <div class="meal-head">
        <span class="meal-label">${slotMeal(s) === 'P' ? 'Pranzo' : 'Cena'}</span>
        ${work ? '<span class="pill work" title="Da portare al lavoro">🎒 da portare</span>' : ''}
        ${sl.lo ? '<span class="pill lo">♻️ avanzo di ieri sera</span>' : ''}
        ${nextLo ? '<span class="pill lo">✖2 cucina doppia porzione</span>' : ''}
        <span class="meal-tools">
          ${canLo || sl.lo ? `<button class="icon-btn" data-action="leftover" data-slot="${s}" title="${sl.lo ? 'Usa una ricetta diversa' : 'Usa l’avanzo della cena di ieri'}">${sl.lo ? '✨' : '♻️'}</button>` : ''}
          <button class="icon-btn" data-action="swap" data-slot="${s}" title="Proponi un altro piatto" ${sl.locked ? 'disabled' : ''}>🔄</button>
          <button class="icon-btn" data-action="lock" data-slot="${s}" title="${sl.locked ? 'Sblocca' : 'Blocca: resta anche rigenerando'}">${sl.locked ? '🔒' : '🔓'}</button>
        </span>
      </div>
      <h4>${esc(shown.n)} ${proteinBadge(shown.p)}</h4>
      ${outSeason.length ? `<p class="small warn">Fuori stagione: ${esc(outSeason.join(', '))}</p>` : ''}
      ${alt}
      ${recipeDetails(shown, { leftover: sl.lo })}
    </div>`;
}

function renderMenu() {
  const { plan, ctx } = state;
  const el = $('#tab-menu');
  if (!plan) return (el.innerHTML = '');
  const bf = breakfastEntries(plan, ctx);
  const hasFish = plan.slots.some((s) => s.alt);
  const allAlt = hasFish && plan.slots.filter((s) => s.alt).every((s) => s.useAlt);
  const days = DAYS.map((d, i) => {
    const b = bf.find((e) => e.day === i);
    return `
      <article class="day ${i >= 5 ? 'weekend' : ''}">
        <h3>${d}</h3>
        ${b ? `<p class="breakfast">☕ <span>${esc(b.r.n)}</span></p>` : ''}
        ${mealBlock(i * 2)}
        ${mealBlock(i * 2 + 1)}
      </article>`;
  }).join('');
  el.innerHTML = `
    <div class="toolbar">
      <p class="muted small">🔄 cambia un piatto · 🔒 lo blocca quando rigeneri · ♻️ usa l’avanzo della cena precedente</p>
      <div class="toolbar-btns">
        ${hasFish ? `<button class="btn small" data-action="all-alt" data-on="${allAlt ? '0' : '1'}">${allAlt ? '🐟 Rimetti il pesce' : '🥦 Tutto senza pesce'}</button>` : ''}
        ${bf.length ? '<button class="btn small" data-action="new-breakfast">☕ Cambia colazioni</button>' : ''}
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
        <span class="item-main"><span class="item-name">${esc(it.name)}</span> <strong>${esc(it.buy)}</strong></span>
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
  el.innerHTML = `
    <div class="toolbar">
      <p class="muted small">${nAlt ? `Include ${nAlt} alternativ${nAlt > 1 ? 'e' : 'a'} senza pesce scelt${nAlt > 1 ? 'e' : 'a'} nel menù. ` : ''}Spunta ciò che hai già o che metti nel carrello.</p>
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
    <section class="panel shop">
      <h3>🍎 Frutta di stagione</h3>
      <p>Circa <strong>${list.fruit.portions} porzioni</strong> (2 al giorno, a colazione o come spuntino): ${esc(list.fruit.suggestions)}. Comprala in due volte per averla sempre al punto giusto.</p>
    </section>
    <section class="panel shop">
      <h3>🧂 Dispensa – controlla di averli</h3>
      <ul class="items compact">${list.pantry.map((p) => itemRow({ key: p.key, name: p.name, buy: '' })).join('')}</ul>
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
// Riepilogo
// ---------------------------------------------------------------------------

function renderStats() {
  const { plan, ctx } = state;
  const el = $('#tab-stats');
  if (!plan) return (el.innerHTML = '');
  const slots = plan.slots.map((s) => ({ ...s, r: s.useAlt && s.alt ? s.alt : s.r }));
  const ev = evaluate(slots, ctx);
  const cats = [...new Set([...Object.keys(ctx.targets), ...Object.keys(ev.counts)])];
  const max = Math.max(...cats.map((c) => Math.max(ev.counts[c] || 0, ctx.targets[c] || 0)), 1);

  const recipes = slots.map((s) => ctx.recipes[s.r]);
  const distinct = new Set(slots.filter((s) => !s.lo).map((s) => s.r)).size;
  const veg = new Set();
  let freshUses = 0;
  let seasonalUses = 0;
  for (const r of recipes) {
    for (const { id } of r.ing) {
      const i = INGREDIENTS[id];
      if (i.c === 'verdura') veg.add(id);
      if (i.f) {
        freshUses++;
        if (!r.outOfSeason.includes(id)) seasonalUses++;
      }
    }
  }
  const list = shoppingList(plan, ctx);
  const leftovers = list.shops.flatMap((s) => s.groups.flatMap((g) => g.items)).filter((i) => i.leftover);

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat"><span class="stat-n">${distinct}</span><span>piatti diversi su 14 pasti</span></div>
      <div class="stat"><span class="stat-n">${veg.size}</span><span>tipi di frutta e verdura</span></div>
      <div class="stat"><span class="stat-n">${freshUses ? Math.round((seasonalUses / freshUses) * 100) : 100}%</span><span>ingredienti freschi di stagione</span></div>
      <div class="stat"><span class="stat-n">${ev.pairs}</span><span>pranzi da avanzi della cena</span></div>
    </div>
    <section class="panel">
      <h3>Fonti proteiche della settimana</h3>
      <p class="small muted">Barra = pasti nel menù · tacca = obiettivo per il regime “${esc(REGIMES[ctx.settings.regime].label)}”</p>
      <div class="bars">${cats.map((c) => {
        const n = ev.counts[c] || 0;
        const t = ctx.targets[c] || 0;
        return `<div class="bar-row">
          <span class="bar-label">${esc(PROTEINS[c]?.label || c)}</span>
          <span class="bar-track">
            <span class="bar-fill" style="width:${(n / max) * 100}%;--c:${PROTEINS[c]?.color}"></span>
            <span class="bar-target" style="left:${(t / max) * 100}%"></span>
          </span>
          <span class="bar-val">${n}<span class="muted">/${t}</span></span>
        </div>`;
      }).join('')}</div>
    </section>
    <section class="panel">
      <h3>Confezioni da finire</h3>
      ${leftovers.length
        ? `<ul class="small">${leftovers.map((i) => `<li><strong>${esc(i.name)}</strong>: ${esc(i.leftover)}</li>`).join('')}</ul>`
        : '<p class="small">Nessun avanzo deperibile rilevante: le confezioni vengono usate per intero. 👏</p>'}
    </section>`;
}

// ---------------------------------------------------------------------------
// Render principale
// ---------------------------------------------------------------------------

function render() {
  renderSettings();
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = p.id !== `tab-${state.tab}`));
  if (!state.plan) return;
  renderMenu();
  renderShopping();
  renderPrep();
  renderStats();
}

function init() {
  load();
  state.ctx = buildContext(state.settings);
  if (!planIsValid(state.plan, state.ctx)) state.plan = null;
  if (!state.plan) regenerate({ keepLocked: false });
  else render();
  if (!localStorage.getItem(STORE_KEY + '-seen')) {
    $('#settings').open = true;
    try { localStorage.setItem(STORE_KEY + '-seen', '1'); } catch { /* ignora */ }
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      state.tab = tab.dataset.tab;
      save();
      render();
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el || el.type === 'checkbox') return;
    actions[el.dataset.action]?.(el);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('input[type=checkbox][data-action]');
    if (el) actions[el.dataset.action]?.(el);
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
