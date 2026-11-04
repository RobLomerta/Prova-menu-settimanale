// Tab "Piano alimentare": caricamento (PDF, TXT o testo incollato), revisione e modifica.
import { parsePlanText, pdfToText, analyzePlan, emptyPlan, describeOption, MEAL_KEYS, MEAL_ORDER, FREQ_LABELS } from '../engine/plan.js';
import { DAYS } from '../engine/common.js';
import { $, esc, r0, macroLine } from './util.js';

// pdf.js (Mozilla, licenza Apache 2.0) incluso nel progetto: funziona offline e il file non lascia il dispositivo
const PDFJS = new URL('../vendor/pdfjs/pdf.min.js', import.meta.url).href;
const PDFJS_WORKER = new URL('../vendor/pdfjs/pdf.worker.min.js', import.meta.url).href;

const ROLE_LABEL = {
  carb: 'Carboidrati', prot: 'Proteine', fat: 'Condimento', veg: 'Verdure', frutta: 'Frutta', dolce: 'Dolcificante', altro: 'Varie',
};

const DEFAULT_FREQ = {
  carne_bianca: 2, carne_rossa: 1, pesce_azzurro: 2, pesce_bianco: 2, legumi: 2,
  uova: 1, formaggi: 1, affettati: 1, vegetale: 1, libero: 1,
};

let pdfjsPromise = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  pdfjsPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => {
      pdfjsPromise = null;
      reject(new Error('Non riesco a caricare il lettore PDF. Puoi incollare il testo del piano qui sotto.'));
    };
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

function importText(app, text, source) {
  const plan = parsePlanText(text);
  if (!plan.meals.length) {
    app.state.planImport = { error: 'Non ho trovato pasti (Colazione, Pranzo, Cena…) nel testo. Se il PDF è una scansione, incolla il testo o compila il piano a mano.' };
    return app.rerender();
  }
  plan.source = source;
  plan.importedAt = new Date().toISOString();
  plan.freqFound = !!plan.freq;
  if (!plan.freq) plan.freq = { ...DEFAULT_FREQ };
  app.state.dietPlan = plan;
  app.state.planImport = { ok: `Letti ${plan.meals.length} pasti da “${source}”. Controlla qui sotto che sia tutto corretto, poi genera il menù.` };
  app.save();
  app.rerender();
}

export async function handlePlanFile(app, file) {
  app.state.planImport = { busy: `Leggo “${file.name}”…` };
  app.rerender();
  try {
    let text;
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      const lib = await loadPdfJs();
      text = await pdfToText(lib, new Uint8Array(await file.arrayBuffer()));
      if (text.replace(/\s/g, '').length < 40) throw new Error('Il PDF non contiene testo leggibile (forse è una scansione). Incolla il testo o compila il piano a mano.');
    } else {
      text = await file.text();
    }
    importText(app, text, file.name);
  } catch (e) {
    app.state.planImport = { error: e.message };
    app.rerender();
  }
}

export const planActions = (app) => ({
  'plan-parse-text': () => {
    const t = $('#plan-paste')?.value || '';
    if (!t.trim()) return app.toast('Incolla prima il testo del piano');
    importText(app, t, 'testo incollato');
  },
  'plan-manual': () => {
    app.state.dietPlan = { ...emptyPlan(), freq: { ...DEFAULT_FREQ } };
    app.state.planImport = { ok: 'Piano vuoto creato: compila le righe di ogni pasto.' };
    app.save();
    app.rerender();
  },
  'plan-remove': () => {
    if (!confirm('Rimuovere il piano alimentare? Il menù tornerà a usare regime e porzioni standard.')) return;
    app.state.dietPlan = null;
    app.state.planImport = null;
    app.save();
    app.regenerate();
  },
  'plan-apply': () => {
    app.state.settings.usePlan = true;
    app.regenerate({ keepLocked: false });
    app.setTab('menu');
    app.toast('Menù generato dal piano alimentare');
  },
  'plan-add-line': (el) => {
    app.state.dietPlan.meals[Number(el.dataset.meal)].lines.push('');
    app.save();
    app.rerender();
  },
  'plan-del-line': (el) => {
    app.state.dietPlan.meals[Number(el.dataset.meal)].lines.splice(Number(el.dataset.line), 1);
    app.save();
    app.rerender();
  },
  'plan-del-meal': (el) => {
    app.state.dietPlan.meals.splice(Number(el.dataset.meal), 1);
    app.save();
    app.rerender();
  },
});

/** Cambiamenti nei campi del piano (input/select con data-pf, data-meal+data-line, data-freq). */
export function handlePlanChange(app, el) {
  const plan = app.state.dietPlan;
  if (!plan) return false;
  if (el.dataset.line != null && el.dataset.meal != null) {
    plan.meals[Number(el.dataset.meal)].lines[Number(el.dataset.line)] = el.value;
  } else if (el.dataset.freq) {
    plan.freq ??= {};
    plan.freq[el.dataset.freq] = Math.max(0, Number(el.value) || 0);
  } else if (el.dataset.pf) {
    const path = el.dataset.pf.split('.');
    const v = el.type === 'checkbox' ? el.checked : el.value === '' ? null : Number(el.value);
    if (path[0] === 'usePlan') {
      app.state.settings.usePlan = v;
    } else if (path.length === 2) {
      plan[path[0]] ??= {};
      plan[path[0]][path[1]] = v;
    } else plan[path[0]] = v;
  } else if (el.id === 'plan-add-meal' && el.value) {
    plan.meals.push({ key: el.value, label: MEAL_KEYS[el.value], lines: [''] });
    plan.meals.sort((a, b) => MEAL_ORDER.indexOf(a.key) - MEAL_ORDER.indexOf(b.key));
  } else return false;
  app.save();
  app.rerender();
  return true;
}

function importPanel(app, compact) {
  const st = app.state.planImport || {};
  return `
    <section class="panel">
      <h3>${compact ? '🔄 Carica un altro piano' : '📄 Allega il tuo piano alimentare'}</h3>
      ${compact ? '' : `<p>Carica il PDF (o un file di testo) del piano che ti ha dato il nutrizionista: leggo pasti, alternative e grammature e li uso per costruire ricette, porzioni, calorie e lista della spesa.</p>
      <p class="small muted">🔒 Il file viene letto solo sul tuo dispositivo: non viene inviato da nessuna parte.</p>`}
      <div class="upload-row">
        <label class="btn primary file-btn">📎 Scegli PDF o TXT<input type="file" id="plan-file" accept=".pdf,.txt,application/pdf,text/plain" hidden></label>
        ${compact ? '' : '<button class="btn" data-action="plan-manual">✍️ Compila a mano</button>'}
      </div>
      <details class="paste" ${compact ? '' : ''}>
        <summary>…oppure incolla il testo del piano</summary>
        <textarea id="plan-paste" rows="8" placeholder="Colazione&#10;- 50 g avena / 100 g pane integrale&#10;- 150 g yogurt greco / 3 uova&#10;&#10;Pranzo&#10;- 70 g riso, pasta, farro / 300 g patate&#10;- 100 g pesce o carne / 2 uova / 200 g tofu&#10;- 10 g olio&#10;- verdure libere"></textarea>
        <button class="btn" data-action="plan-parse-text">Analizza il testo</button>
      </details>
      ${st.busy ? `<p class="small">⏳ ${esc(st.busy)}</p>` : ''}
      ${st.error ? `<div class="alert">${esc(st.error)}</div>` : ''}
      ${st.ok ? `<div class="alert ok">${esc(st.ok)}</div>` : ''}
    </section>`;
}

function portionsSummary(m) {
  const p = m.portions;
  const parts = [];
  if (p.carb) parts.push(`carboidrati ~${r0(p.carb)} g`);
  const prot = Object.entries(p.prot)
    .filter(([k]) => ['carne', 'pesce', 'legumi', 'uova', 'tofu', 'tempeh', 'seitan', 'affettati'].includes(k))
    .map(([k, v]) => `${k === 'legumi' ? 'legumi secchi' : k} ${k === 'uova' ? `${r0(v)}` : `${r0(v)} g`}`);
  if (prot.length) parts.push(`proteine: ${prot.join(', ')}`);
  if (p.oil) parts.push(`olio ${r0(p.oil)} g`);
  return parts.join(' · ');
}

export function renderPiano(app) {
  const el = $('#tab-piano');
  const plan = app.state.dietPlan;
  if (!plan) {
    el.innerHTML = `${importPanel(app, false)}
      <section class="panel small muted">
        <h3>Come deve essere scritto il piano</h3>
        <p>Funziona con gli schemi “a scelta” più comuni: un titolo per pasto (Colazione, Spuntino/Snack, Pranzo, Cena), poi una riga per componente che inizia con un trattino, con le alternative separate da “/”. Esempio: <code>- 70 g riso, pasta, farro / 100 g pane integrale</code>.</p>
        <p>Se il piano riporta il totale (es. <code>Tot Kcal 1500 Proteine 105 Carbo 185 Grassi 40</code>) lo uso come obiettivo; altrimenti lo stimo dalle porzioni.</p>
      </section>`;
    return;
  }
  const a = analyzePlan(plan);
  const t = plan.targets || {};
  const missingMeals = MEAL_ORDER.filter((k) => !plan.meals.some((m) => m.key === k));
  const freqTotal = Object.values(plan.freq || {}).reduce((x, y) => x + (Number(y) || 0), 0);
  const slotOptions = [];
  for (let d = 0; d < 7; d++) for (const [i, lab] of [[0, 'pranzo'], [1, 'cena']]) slotOptions.push([d * 2 + i, `${DAYS[d]} ${lab}`]);

  el.innerHTML = `
    ${app.state.planImport?.ok || app.state.planImport?.error ? `<div class="alert ${app.state.planImport.ok ? 'ok' : ''}">${esc(app.state.planImport.ok || app.state.planImport.error)}</div>` : ''}
    <section class="panel plan-head">
      <div class="plan-head-row">
        <div>
          <h3>📄 Il tuo piano alimentare</h3>
          <p class="small muted">Fonte: ${esc(plan.source || 'manuale')}${plan.importedAt ? ` · caricato il ${new Date(plan.importedAt).toLocaleDateString('it-IT')}` : ''}</p>
        </div>
        <label class="switch big"><input type="checkbox" data-pf="usePlan" ${app.state.settings.usePlan ? 'checked' : ''}> <span>Usa questo piano per il menù</span></label>
      </div>
      <div class="targets-grid">
        ${[['kcal', 'Calorie al giorno', 'kcal'], ['p', 'Proteine', 'g'], ['c', 'Carboidrati', 'g'], ['f', 'Grassi', 'g']].map(([k, l, u]) => `
          <label class="field"><span>${l}</span><span class="input-unit"><input type="number" min="0" step="1" data-pf="targets.${k}" value="${t[k] ?? ''}" placeholder="${r0(a.est[k])}"><em>${u}</em></span></label>`).join('')}
      </div>
      <p class="small">Dalle porzioni del piano stimo in media: ${macroLine(a.est)} <span class="muted">(con verdure libere escluse).</span> ${t.kcal ? `Il piano dichiara ${r0(t.kcal)} kcal: userò questo come obiettivo e adatterò i carboidrati di pranzo e cena giorno per giorno.` : ''}</p>
      <div class="settings-actions">
        <button class="btn primary" data-action="plan-apply">✅ Genera il menù da questo piano</button>
        <button class="btn ghost" data-action="plan-remove">🗑️ Rimuovi piano</button>
      </div>
    </section>

    ${a.meals.map((m, mi) => `
      <section class="panel plan-meal">
        <div class="plan-meal-head">
          <h3>${esc(m.label)}</h3>
          <span class="small">${m.est.kcal ? `~${r0(m.est.kcal)} kcal` : ''}</span>
          <button class="icon-btn" data-action="plan-del-meal" data-meal="${mi}" title="Rimuovi questo pasto">🗑️</button>
        </div>
        ${['pranzo', 'cena'].includes(m.key)
          ? `<p class="small muted">Porzioni usate per le ricette: ${esc(portionsSummary(m))}</p>`
          : `<p class="small muted">Nel menù ogni giorno sceglie un’opzione per riga${m.key === 'colazione' ? ' (versione dolce o salata)' : ''}; puoi cambiarla, bloccarla o modificarla nel Laboratorio.</p>`}
        <ol class="plan-lines">
          ${m.lines.map((line, li) => `
            <li>
              <div class="plan-line-edit">
                <span class="role role-${line.role}">${ROLE_LABEL[line.role] || 'Varie'}</span>
                <input type="text" value="${esc(line.text)}" data-meal="${mi}" data-line="${li}" aria-label="Riga ${li + 1}">
                <button class="icon-btn" data-action="plan-del-line" data-meal="${mi}" data-line="${li}" title="Elimina riga">✖</button>
              </div>
              <div class="chips">${line.options.map((o) => {
                const d = describeOption(o);
                const known = o.foods.length > 0;
                return `<span class="chip ${known ? '' : 'unknown'}" title="${esc(d.text)}">${o.q != null ? `<b>${esc(`${Math.round(o.q * 10) / 10}${o.u === 'pz' ? ' pz' : ` ${o.u}`}`)}</b> ` : ''}${esc(known ? d.foods.join(', ') : `“${d.text}” non riconosciuto`)}${d.kcal != null ? ` <em>≈${d.kcal} kcal</em>` : ''}</span>`;
              }).join('')}</div>
            </li>`).join('')}
        </ol>
        <button class="btn small" data-action="plan-add-line" data-meal="${mi}">＋ Aggiungi riga</button>
        ${m.warnings.length ? `<ul class="small warn">${m.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      </section>`).join('')}

    ${missingMeals.length ? `<section class="panel"><label class="field"><span>Aggiungi un pasto</span>
      <select id="plan-add-meal"><option value="">Scegli…</option>${missingMeals.map((k) => `<option value="${k}">${MEAL_KEYS[k]}</option>`).join('')}</select></label></section>` : ''}

    <section class="panel">
      <h3>📆 Frequenze settimanali (pranzi e cene)</h3>
      ${plan.freqFound === false ? '<p class="small warn">Non ho trovato la tabella delle frequenze nel testo (spesso è un’immagine): ho messo dei valori tipici, controllali con il tuo piano.</p>' : ''}
      <div class="freq-grid">
        ${Object.entries(FREQ_LABELS).map(([k, l]) => `
          <label class="field"><span>${l}</span><input type="number" min="0" max="14" data-freq="${k}" value="${plan.freq?.[k] ?? 0}"></label>`).join('')}
      </div>
      <p class="small muted">Le frequenze valgono per pranzi e cene: gli affettati magri della colazione salata non vengono conteggiati.</p>
      <p class="small ${freqTotal === 14 ? 'muted' : 'warn'}">Totale: ${freqTotal} pasti su 14${freqTotal === 14 ? ' ✓' : ' – idealmente dovrebbero essere 14 (7 pranzi + 7 cene).'}</p>
      <div class="targets-grid">
        <label class="field"><span>Pasto libero</span><select data-pf="freeSlot">${slotOptions.map(([v, l]) => `<option value="${v}" ${Number(plan.freeSlot ?? 11) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Legumi secchi al posto di 100 g di carne/pesce</span><span class="input-unit"><input type="number" min="0" data-pf="legumeRule" value="${plan.legumeRule ?? ''}" placeholder="60"><em>g</em></span></label>
      </div>
    </section>
    ${importPanel(app, true)}`;
}
