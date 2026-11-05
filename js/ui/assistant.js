// Pannello "Chiedi a Claude": impostazione della chiave e chat con il contesto dell'app.
import { INGREDIENTS } from '../data/ingredients.js';
import { REGIMES, EXCLUSIONS } from '../engine/diet.js';
import { weekView } from '../engine/week.js';
import { DAYS } from '../engine/common.js';
import { fmtQty } from '../engine/shopping.js';
import { $, esc, r0 } from './util.js';
import { hasKey, setKey, clearKey, testKey, chat, explainError, MODEL, claudeMode, inClaudeApp } from '../ai/claude.js';
import { askConfirm } from './dialog.js';

const SUGGESTIONS = [
  'Cosa posso cucinare stasera con quello che c’è nel menù di oggi?',
  'Proponimi un’alternativa più veloce per la cena di giovedì, con le stesse grammature.',
  'Idee per spuntini da portare al lavoro che rispettino il piano.',
  'Con cosa sostituisco il salmone mantenendo le proteine?',
  'Ho una cena fuori mercoledì: come riorganizzo i pasti?',
];

const st = { open: false, history: [], view: [], busy: false, error: '', abort: null, keyMsg: '' };

// ---------------------------------------------------------------------------
// Contesto inviato a Claude
// ---------------------------------------------------------------------------

function itemsText(ing) {
  return ing.map((x) => `${INGREDIENTS[x.id].n.replace(/ \(.*\)$/, '').toLowerCase()} ${INGREDIENTS[x.id].u === 'pz' ? `${x.q}` : fmtQty(x.q, INGREDIENTS[x.id].u)}`).join(', ');
}

export function buildContext(app) {
  const { settings, dietPlan, plan, ctx, tab, lab } = app.state;
  const lines = [];
  lines.push(`Oggi è ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
  const ex = (settings.exclude || []).map((k) => EXCLUSIONS[k]).join(', ');
  lines.push(`Preferenze: regime ${REGIMES[settings.regime]?.label}; ${settings.gluten ? 'senza glutine; ' : ''}${settings.lactose ? 'senza lattosio; ' : ''}${ex ? `esclusi: ${ex}; ` : ''}colazione ${settings.breakfastStyle || 'dolce'}; spesa ${settings.twoShops ? 'nel weekend e il mercoledì' : 'una volta nel weekend'}.`);
  const t = ctx?.nutritionTarget;
  if (t) lines.push(`Obiettivo giornaliero: ${r0(t.kcal)} kcal${t.p ? `, proteine ${r0(t.p)} g, carboidrati ${r0(t.c)} g, grassi ${r0(t.f)} g` : ''}.`);
  if (dietPlan && settings.usePlan) {
    lines.push('\nPiano alimentare del nutrizionista (alternative separate da "/"):');
    for (const m of dietPlan.meals) lines.push(`${m.label || m.key}:\n${m.lines.map((l) => `- ${l}`).join('\n')}`);
    if (dietPlan.legumeRule) lines.push(`Regola: ${dietPlan.legumeRule} g di legumi secchi al posto di 100 g di carne o pesce.`);
    if (dietPlan.freq) lines.push(`Frequenze settimanali (pranzi e cene): ${Object.entries(dietPlan.freq).filter(([, v]) => v).map(([k, v]) => `${k.replace('_', ' ')} ${v}`).join(', ')}.`);
    lines.push('Le verdure sono libere e non contano nei totali del piano.');
  }
  if (plan && ctx) {
    lines.push('\nMenù di questa settimana:');
    const w = weekView(plan, ctx);
    for (const d of w.days) {
      lines.push(`${DAYS[d.day]} (${r0(d.total.kcal)} kcal):`);
      for (const m of d.meals) lines.push(`  ${m.label}: ${m.name}${m.free ? '' : ` — ${itemsText(m.ing)} (${r0(m.n.kcal)} kcal)`}`);
    }
  }
  if (tab === 'lab' && lab?.draft) {
    lines.push(`\nNel Laboratorio sta modificando: ${$('.lab-current')?.textContent?.trim() || 'un pasto'}. Ingredienti attuali: ${itemsText(lab.draft)}.`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Markdown essenziale: grassetto, titoletti, elenchi, paragrafi. */
function md(text) {
  const out = [];
  let list = null;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (li) {
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (!list || list !== tag) {
        if (list) out.push(`</${list}>`);
        out.push(`<${tag}>`);
        list = tag;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    out.push(h ? `<p><strong>${inline(h[1])}</strong></p>` : `<p>${inline(line)}</p>`);
  }
  if (list) out.push(`</${list}>`);
  return out.join('');
}

function keyForm() {
  return `
    <div class="ai-setup">
      <p><strong>Collega Claude con la tua chiave API</strong></p>
      <ol class="small">
        <li>Crea un account su <a href="https://console.anthropic.com/" target="_blank" rel="noopener">console.anthropic.com</a> e aggiungi un po’ di credito (si paga a consumo).</li>
        <li>In <em>API Keys</em> crea una chiave e incollala qui sotto.</li>
      </ol>
      <div class="ai-key-row">
        <input type="password" id="ai-key" placeholder="sk-ant-…" autocomplete="off" spellcheck="false">
        <button class="btn primary small" data-action="ai-save-key">Salva e prova</button>
      </div>
      ${st.keyMsg ? `<p class="small ${st.keyMsg.startsWith('✅') ? '' : 'warn'}">${esc(st.keyMsg)}</p>` : ''}
      <p class="small muted">🔒 La chiave resta solo in questo browser. Le tue domande, il piano e il menù vengono inviati ad Anthropic per ottenere la risposta. Se usi un dispositivo condiviso, rimuovi la chiave quando hai finito.</p>
    </div>`;
}

function chatView() {
  const msgs = st.view.map((m) => `<div class="ai-msg ${m.role}">${m.role === 'assistant' ? md(m.text) || '<p class="muted">…</p>' : `<p>${esc(m.text)}</p>`}</div>`).join('');
  return `
    <div class="ai-msgs" id="ai-msgs">
      ${st.view.length ? msgs : `<p class="small muted">Chiedi qualcosa su ricette, sostituzioni, spesa o organizzazione della settimana: Claude conosce il tuo piano e il menù.</p>
        <div class="ai-sugg">${SUGGESTIONS.map((s) => `<button class="chip-btn" data-action="ai-suggest">${esc(s)}</button>`).join('')}</div>`}
      ${st.busy && !st.view.at(-1)?.text ? '<p class="small muted">✍️ Claude sta scrivendo…</p>' : ''}
      ${st.error ? `<div class="alert">${esc(st.error)}</div>` : ''}
      ${claudeMode() === 'account' && !st.view.length ? '<p class="small muted">Claude usa il tuo account claude.ai: alla prima domanda ti chiederà il permesso. Le risposte contano sui limiti del tuo piano.</p>' : ''}
    </div>
    <form class="ai-input" id="ai-form">
      <textarea id="ai-text" rows="2" placeholder="Scrivi una domanda…" ${st.busy ? 'disabled' : ''}></textarea>
      ${st.busy
        ? '<button type="button" class="btn small" data-action="ai-stop">■ Ferma</button>'
        : '<button type="submit" class="btn primary small">Invia</button>'}
    </form>`;
}

export function renderAssistant() {
  const mode = claudeMode();
  const ready = mode === 'account' || mode === 'key';
  let root = $('#ai-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ai-root';
    document.body.appendChild(root);
  }
  root.innerHTML = `
    <button class="ai-fab ${st.open ? 'hidden' : ''}" data-action="ai-open" aria-label="Chiedi a Claude">💬 <span>Chiedi a Claude</span></button>
    <aside class="ai-panel ${st.open ? 'open' : ''}" aria-hidden="${!st.open}" aria-label="Chiedi a Claude">
      <header class="ai-head">
        <strong>💬 Chiedi a Claude</strong>
        <span class="ai-head-tools">
          ${ready && st.view.length ? '<button class="icon-btn" data-action="ai-new" title="Nuova conversazione">🗒️</button>' : ''}
          ${mode === 'key' ? '<button class="icon-btn" data-action="ai-remove-key" title="Rimuovi la chiave da questo browser">🔑</button>' : ''}
          <button class="icon-btn" data-action="ai-close" title="Chiudi">✖</button>
        </span>
      </header>
      <div class="ai-body">${ready ? chatView()
        : mode === 'pending' ? '<p class="ai-setup small muted">⏳ Collegamento a Claude…</p>'
        : inClaudeApp ? '<div class="ai-setup"><p>Claude non è disponibile in questa vista.</p><p class="small muted">Apri la pagina da claude.ai con il tuo account (anche dal browser del telefono) per usare Claude.</p></div>'
        : keyForm()}</div>
    </aside>`;
  const box = $('#ai-msgs');
  if (box) box.scrollTop = box.scrollHeight;
}

function updateLastMessage() {
  const box = $('#ai-msgs');
  const last = box?.querySelector('.ai-msg.assistant:last-of-type');
  if (last) {
    last.innerHTML = md(st.view.at(-1).text) || '<p class="muted">…</p>';
    box.scrollTop = box.scrollHeight;
  } else renderAssistant();
}

async function send(app, text) {
  const q = text.trim();
  if (!q || st.busy) return;
  st.error = '';
  st.history.push({ role: 'user', content: q, text: q });
  st.view.push({ role: 'user', text: q }, { role: 'assistant', text: '' });
  st.busy = true;
  st.abort = new AbortController();
  renderAssistant();
  try {
    const res = await chat({
      history: st.history,
      context: buildContext(app),
      signal: st.abort.signal,
      onText: (t) => {
        st.view.at(-1).text = t;
        updateLastMessage();
      },
    });
    st.history.push({ role: 'assistant', content: res.content, text: res.text });
    st.view.at(-1).text = res.text + (res.truncated ? '\n\n*(Risposta interrotta perché troppo lunga.)*' : '');
  } catch (e) {
    // la domanda senza risposta esce dalla cronologia, così si può riprovare
    st.history.pop();
    if (!st.view.at(-1).text) st.view.pop();
    if (e?.text && !st.view.at(-1)?.text) st.view.push({ role: 'assistant', text: e.text });
    st.error = st.abort?.signal.aborted ? 'Risposta interrotta.' : explainError(e);
  } finally {
    st.busy = false;
    st.abort = null;
    renderAssistant();
  }
}

export const assistantActions = (app) => ({
  'ai-open': () => {
    st.open = true;
    renderAssistant();
    setTimeout(() => ($('#ai-text') || $('#ai-key'))?.focus(), 50);
  },
  'ai-close': () => {
    st.open = false;
    renderAssistant();
  },
  'ai-new': () => {
    if (st.busy) return;
    st.history = [];
    st.view = [];
    st.error = '';
    renderAssistant();
  },
  'ai-suggest': (el) => send(app, el.textContent),
  'ai-stop': () => st.abort?.abort(),
  'ai-save-key': async () => {
    const key = $('#ai-key')?.value || '';
    if (!key.trim()) return;
    setKey(key);
    st.keyMsg = '⏳ Verifico la chiave…';
    renderAssistant();
    try {
      await testKey();
      st.keyMsg = '';
      app.toast('Claude è collegato');
      app.rerender();
    } catch (e) {
      clearKey();
      st.keyMsg = explainError(e);
    }
    renderAssistant();
  },
  'ai-remove-key': async () => {
    if (!(await askConfirm('Rimuovere la chiave API di Claude da questo browser?', { ok: 'Rimuovi chiave' }))) return;
    clearKey();
    st.history = [];
    st.view = [];
    renderAssistant();
    app.rerender();
    app.toast('Chiave rimossa');
  },
});

export function installAssistant(app) {
  renderAssistant();
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'ai-form') return;
    e.preventDefault();
    send(app, $('#ai-text').value);
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'ai-text' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(app, e.target.value);
    }
    if (e.key === 'Escape' && st.open) assistantActions(app)['ai-close']();
  });
}

export { MODEL };
