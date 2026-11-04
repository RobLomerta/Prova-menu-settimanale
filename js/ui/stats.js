// Tab "Riepilogo": calorie, macronutrienti, varietà e confezioni.
import { INGREDIENTS, inSeason } from '../data/ingredients.js';
import { REGIMES, PROTEINS } from '../engine/diet.js';
import { evaluate, shownId } from '../engine/planner.js';
import { shoppingList } from '../engine/shopping.js';
import { weekView } from '../engine/week.js';
import { energySplit } from '../engine/nutrition.js';
import { DAYS, DAYS_SHORT } from '../engine/common.js';
import { $, esc, r0, deltaHtml } from './util.js';

const MACROS = [
  { k: 'p', label: 'Proteine', cls: 'm-p-bg', kcal: 4 },
  { k: 'c', label: 'Carboidrati', cls: 'm-c-bg', kcal: 4 },
  { k: 'f', label: 'Grassi', cls: 'm-f-bg', kcal: 9 },
];

function dailyChart(w, target) {
  const max = Math.max(target?.kcal || 0, ...w.days.map((d) => d.total.kcal)) * 1.1 || 1;
  const cols = w.days.map((d) => {
    const tip = `<b>${DAYS[d.day]}</b>${d.free ? ' · pasto libero non conteggiato' : ''}<br>${r0(d.total.kcal)} kcal<br>` +
      MACROS.map((m) => `${m.label}: ${r0(d.total[m.k])} g (${r0(d.total[m.k] * m.kcal)} kcal)`).join('<br>');
    const segs = MACROS.map((m) => `<span class="seg ${m.cls}" style="flex-grow:${d.total[m.k] * m.kcal}"></span>`).join('');
    return `
      <div class="col" data-tip="${esc(tip)}">
        <span class="col-val">${r0(d.total.kcal)}</span>
        <span class="col-stack" style="height:${(d.total.kcal / max) * 100}%">${segs}</span>
      </div>`;
  }).join('');
  return `
    <div class="chart-legend small">${MACROS.map((m) => `<span><span class="dot ${m.cls}"></span>${m.label}</span>`).join('')}${target?.kcal ? '<span><span class="dash"></span>Obiettivo</span>' : ''}</div>
    <div class="plot" role="img" aria-label="Calorie giornaliere per macronutriente">
      ${target?.kcal ? `<span class="target-line" style="bottom:${(target.kcal / max) * 100}%"><em>${r0(target.kcal)} kcal</em></span>` : ''}
      <div class="plot-cols">${cols}</div>
    </div>
    <div class="plot-labels">${w.days.map((d) => `<span>${DAYS_SHORT[d.day]}${d.free ? '*' : ''}</span>`).join('')}</div>
    ${w.days.some((d) => d.free) ? '<p class="small muted">* giorno con pasto libero: le sue calorie non sono conteggiate.</p>' : ''}`;
}

function splitCompare(avg, target) {
  const row = (label, n) => {
    const sp = energySplit(n);
    return `<div class="split-row"><span class="split-label">${label}</span><span class="split-bar">${MACROS.map((m) =>
      `<span class="split-seg ${m.cls}" style="width:${sp[m.k]}%" data-tip="<b>${m.label}</b><br>${r0(sp[m.k])}% dell’energia · ${r0(n[m.k])} g">${sp[m.k] >= 10 ? `${r0(sp[m.k])}%` : ''}</span>`).join('')}</span></div>`;
  };
  return `<div class="split">${row('Menù (media)', avg)}${target?.p ? row('Piano', target) : ''}</div>`;
}

export function renderStats(app) {
  const el = $('#tab-stats');
  const { plan, ctx } = app.state;
  if (!plan) return (el.innerHTML = '');
  const w = weekView(plan, ctx);
  const target = ctx.nutritionTarget;

  const slots = plan.slots.map((s) => ({ ...s, r: shownId(s), useAlt: false }));
  const ev = evaluate(slots, ctx);
  const cats = [...new Set([...Object.keys(ctx.targets), ...Object.keys(ev.counts)])].filter((c) => c !== 'libero');
  const maxCat = Math.max(...cats.map((c) => Math.max(ev.counts[c] || 0, ctx.targets[c] || 0)), 1);

  const distinct = new Set(slots.filter((s) => !s.lo && s.r !== 'libero').map((s) => s.r)).size;
  const veg = new Set();
  let freshUses = 0;
  let seasonalUses = 0;
  for (const d of w.days) for (const m of d.meals) for (const { id } of m.ing) {
    const i = INGREDIENTS[id];
    if (i.c === 'verdura') veg.add(id);
    if (i.f) {
      freshUses++;
      if (inSeason(i, ctx.month)) seasonalUses++;
    }
  }
  const list = shoppingList(plan, ctx);
  const leftovers = list.shops.flatMap((s) => s.groups.flatMap((g) => g.items)).filter((i) => i.leftover);

  const tile = (label, v, t, unit) => `
    <div class="stat">
      <span class="stat-n">${r0(v)}<small> ${unit}</small></span>
      <span>${label}</span>
      ${t ? `<span class="small">obiettivo ${r0(t)} ${unit} ${deltaHtml(t, v)}</span>` : ''}
    </div>`;

  el.innerHTML = `
    <div class="stats-grid">
      ${tile('kcal al giorno (media)', w.avg.kcal, target?.kcal, '')}
      ${tile('proteine al giorno', w.avg.p, target?.p, 'g')}
      ${tile('carboidrati al giorno', w.avg.c, target?.c, 'g')}
      ${tile('grassi al giorno', w.avg.f, target?.f, 'g')}
    </div>
    ${ctx.plan ? `<p class="small muted">Come nel tuo piano, le verdure sono “libere” e non entrano nei totali: in media aggiungono circa ${r0(w.vegKcal)} kcal al giorno.</p>` : ''}
    ${!target ? '<p class="small muted">Imposta un obiettivo calorico nelle preferenze o allega il tuo piano alimentare per confrontare i valori.</p>' : ''}

    <section class="panel">
      <h3>Calorie e macronutrienti per giorno</h3>
      <p class="small muted">Ogni colonna è l’energia del giorno, divisa tra proteine, carboidrati e grassi. Passa il dito o il mouse su una colonna per i dettagli.</p>
      ${dailyChart(w, target)}
    </section>

    <section class="panel">
      <h3>Ripartizione dell’energia</h3>
      ${splitCompare(w.avg, target)}
      <details class="small">
        <summary>Tabella giorno per giorno</summary>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Giorno</th><th>kcal</th><th>Proteine</th><th>Carboidrati</th><th>Grassi</th></tr></thead>
          <tbody>${w.days.map((d) => `<tr><th>${DAYS[d.day]}${d.free ? ' (libero)' : ''}</th><td>${r0(d.total.kcal)}</td><td>${r0(d.total.p)} g</td><td>${r0(d.total.c)} g</td><td>${r0(d.total.f)} g</td></tr>`).join('')}
          <tr class="avg"><th>Media</th><td>${r0(w.avg.kcal)}</td><td>${r0(w.avg.p)} g</td><td>${r0(w.avg.c)} g</td><td>${r0(w.avg.f)} g</td></tr>
          ${target ? `<tr class="avg"><th>Obiettivo</th><td>${r0(target.kcal)}</td><td>${target.p ? `${r0(target.p)} g` : '—'}</td><td>${target.c ? `${r0(target.c)} g` : '—'}</td><td>${target.f ? `${r0(target.f)} g` : '—'}</td></tr>` : ''}
          </tbody>
        </table></div>
      </details>
      <p class="small muted">Valori stimati da tabelle nutrizionali medie (CREA, USDA): marche e varietà diverse possono variare.</p>
    </section>

    <div class="stats-grid">
      <div class="stat"><span class="stat-n">${distinct}</span><span>piatti diversi</span></div>
      <div class="stat"><span class="stat-n">${veg.size}</span><span>tipi di frutta e verdura</span></div>
      <div class="stat"><span class="stat-n">${freshUses ? Math.round((seasonalUses / freshUses) * 100) : 100}%</span><span>ingredienti freschi di stagione</span></div>
      <div class="stat"><span class="stat-n">${ev.pairs}</span><span>pranzi da avanzi della cena</span></div>
    </div>

    <section class="panel">
      <h3>Fonti proteiche della settimana</h3>
      <p class="small muted">Barra = pasti nel menù · tacca = obiettivo ${ctx.plan?.freq ? 'del tuo piano' : `per il regime “${esc(REGIMES[ctx.settings.regime].label)}”`}</p>
      <div class="bars">${cats.map((c) => {
        const n = ev.counts[c] || 0;
        const t = ctx.targets[c] || 0;
        return `<div class="bar-row">
          <span class="bar-label">${esc(PROTEINS[c]?.label || c)}</span>
          <span class="bar-track">
            <span class="bar-fill" style="width:${(n / maxCat) * 100}%;--c:${PROTEINS[c]?.color}"></span>
            <span class="bar-target" style="left:${(t / maxCat) * 100}%"></span>
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
