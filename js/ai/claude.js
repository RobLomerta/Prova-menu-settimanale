// Integrazione con Claude (API Anthropic) usando la chiave personale di chi usa l'app.
// La chiave resta nel browser (localStorage) e le richieste vanno direttamente ad Anthropic:
// nessun server intermedio. Per questo l'SDK è creato con dangerouslyAllowBrowser: è il caso
// "ognuno usa la propria chiave", in cui la chiave appartiene a chi sta usando la pagina.
import Anthropic from '../vendor/anthropic/anthropic-sdk.mjs';

export const MODEL = 'claude-opus-5-5';
const KEY_STORE = 'menu-settimanale-claude-key';

// Se Claude declina una richiesta, l'API la riprova da sola sul modello di riserva consigliato.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

export function getKey() {
  try {
    return localStorage.getItem(KEY_STORE) || '';
  } catch {
    return '';
  }
}

export function setKey(key) {
  try {
    localStorage.setItem(KEY_STORE, key.trim());
  } catch {
    /* storage non disponibile */
  }
}

export function clearKey() {
  try {
    localStorage.removeItem(KEY_STORE);
  } catch {
    /* ignora */
  }
}

export const hasKey = () => !!getKey();

function client() {
  const apiKey = getKey();
  if (!apiKey) throw new Error('Nessuna chiave API di Claude: inseriscila nelle impostazioni di Claude.');
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** Messaggio d'errore comprensibile per gli errori dell'API. */
export function explainError(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'La chiave API non è valida o è stata revocata. Controllala nella console di Anthropic.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'La chiave non ha i permessi per usare questo modello.';
  if (e instanceof Anthropic.RateLimitError) return 'Troppe richieste in poco tempo, oppure credito esaurito: riprova tra qualche minuto e controlla il credito nella console di Anthropic.';
  if (e instanceof Anthropic.BadRequestError) return `Richiesta non accettata: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Non riesco a contattare Claude: controlla la connessione a internet.';
  if (e instanceof Anthropic.InternalServerError) return 'Claude è momentaneamente non disponibile: riprova tra poco.';
  if (e instanceof Anthropic.APIError) return `Errore di Claude (${e.status}): ${e.message}`;
  return e?.message || String(e);
}

function checkStop(msg) {
  if (msg.stop_reason === 'refusal') {
    throw new Error('Claude ha preferito non rispondere a questa richiesta. Prova a riformularla.');
  }
  if (msg.stop_reason === 'max_tokens') {
    throw new Error('La risposta era troppo lunga ed è stata interrotta. Riprova con una richiesta più breve.');
  }
}

const textOf = (msg) => msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');

/** Verifica rapida che la chiave funzioni. */
export async function testKey() {
  const msg = await client().beta.messages.create({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: 'Rispondi solo con: OK' }],
  });
  checkStop(msg);
  return textOf(msg);
}

// ---------------------------------------------------------------------------
// Lettura del piano alimentare
// ---------------------------------------------------------------------------

const FREQ_KEYS = ['carne_bianca', 'carne_rossa', 'pesce_azzurro', 'pesce_bianco', 'legumi', 'uova', 'formaggi', 'affettati', 'vegetale', 'libero'];

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['meals', 'targets', 'legume_rule_grams', 'frequencies_found', 'frequencies', 'notes'],
  properties: {
    meals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'lines'],
        properties: {
          key: { type: 'string', enum: ['colazione', 'spuntino1', 'pranzo', 'spuntino2', 'cena', 'spuntino3'] },
          lines: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    targets: {
      type: 'object',
      additionalProperties: false,
      required: ['kcal', 'p', 'c', 'f'],
      properties: { kcal: { type: 'number' }, p: { type: 'number' }, c: { type: 'number' }, f: { type: 'number' } },
    },
    legume_rule_grams: { type: 'number' },
    frequencies_found: { type: 'boolean' },
    frequencies: {
      type: 'object',
      additionalProperties: false,
      required: FREQ_KEYS,
      properties: Object.fromEntries(FREQ_KEYS.map((k) => [k, { type: 'number' }])),
    },
    notes: { type: 'array', items: { type: 'string' } },
  },
};

const PLAN_SYSTEM = `Sei l'assistente di un'app italiana che costruisce menù settimanali a partire dal piano alimentare di un nutrizionista.
Il tuo compito è trascrivere il piano allegato in una struttura precisa, senza inventare nulla.

Pasti (campo "key"): colazione, spuntino1 (spuntino di metà mattina o primo snack), pranzo, spuntino2 (spuntino pomeridiano o merenda), cena, spuntino3 (spuntino serale o post allenamento). Includi solo i pasti presenti nel piano.

Ogni elemento di "lines" è un componente del pasto (una riga dello schema). Scrivilo in questo formato:
- le alternative sono separate da " / ";
- ogni alternativa inizia con quantità e unità, poi gli alimenti, separati da virgole se sono più d'uno con la stessa quantità;
- esempi: "70 g riso integrale, pasta integrale, farro / 300 g patate / 100 g pane integrale"; "100 g pesce, carne, affettati magri / 2 uova / 200 g tofu"; "10 g olio extravergine d'oliva"; "verdure libere";
- uova in pezzi ("3 uova"), intervalli come "10-15 g", un cucchiaio d'olio come "10 g olio".
Copia le quantità esattamente come sono scritte. Se una quantità sembra un refuso (molto diversa dalle alternative), lasciala com'è e segnalala in "notes".

"targets": calorie e grammi giornalieri di proteine (p), carboidrati (c) e grassi (f) se il piano li indica, altrimenti 0.
"legume_rule_grams": se il piano dice di sostituire carne o pesce con legumi secchi, i grammi di legumi secchi equivalenti a 100 g di carne o pesce (es. 60); altrimenti 0.
"frequencies": quante volte a settimana, tra pranzi e cene, il piano prevede ciascuna categoria (pesce_azzurro include salmone, sgombro, pesce spada, sardine; pesce_bianco i pesci magri; formaggi = latticini; vegetale = tofu, tempeh, seitan; libero = pasti liberi). Le frequenze spesso sono in una tabella o in un'immagine: leggile da lì. Se il piano non le indica, metti frequencies_found a false e tutti i valori a 0.
"notes": brevi avvisi in italiano su ciò che non è chiaro, refusi o parti del piano non trascrivibili (al massimo 5).`;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(bin);
}

/**
 * Legge un piano alimentare (PDF, immagine o testo) e restituisce la struttura del piano
 * nel formato usato dall'app.
 * @param input { file?: File, text?: string }
 */
export async function readPlanWithClaude({ file, text }) {
  const content = [];
  if (file) {
    const type = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : '');
    if (type === 'application/pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: toBase64(await file.arrayBuffer()) } });
    } else if (/^image\/(jpeg|png|gif|webp)$/.test(type)) {
      content.push({ type: 'image', source: { type: 'base64', media_type: type, data: toBase64(await file.arrayBuffer()) } });
    } else {
      content.push({ type: 'text', text: await file.text() });
    }
  } else if (text) {
    content.push({ type: 'text', text });
  }
  content.push({ type: 'text', text: 'Trascrivi questo piano alimentare nella struttura richiesta.' });

  const msg = await client().beta.messages.create({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    system: PLAN_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  checkStop(msg);
  let data;
  try {
    data = JSON.parse(textOf(msg));
  } catch {
    throw new Error('Claude ha risposto in un formato inatteso. Riprova.');
  }
  const t = data.targets || {};
  const freqFound = !!data.frequencies_found;
  return {
    plan: {
      version: 1,
      source: file ? `${file.name} (letto da Claude)` : 'testo incollato (letto da Claude)',
      targets: { kcal: t.kcal || null, p: t.p || null, c: t.c || null, f: t.f || null },
      legumeRule: data.legume_rule_grams || null,
      freq: freqFound ? Object.fromEntries(FREQ_KEYS.map((k) => [k, Math.max(0, Math.round(data.frequencies[k] || 0))])) : null,
      freqFound,
      freeSlot: 11,
      meals: data.meals.filter((m) => m.lines.length).map((m) => ({ key: m.key, lines: m.lines })),
    },
    notes: data.notes || [],
  };
}

// ---------------------------------------------------------------------------
// Chat "Chiedi a Claude"
// ---------------------------------------------------------------------------

const CHAT_SYSTEM = `Sei l'assistente di cucina e alimentazione dell'app "Menù settimanale", per una persona che vive da sola e porta il pranzo al lavoro dal lunedì al venerdì.
Rispondi in italiano, in modo pratico e conciso (di solito poche righe o un breve elenco).
Rispetta il piano alimentare e le preferenze indicate nel contesto: grammature, alimenti ammessi, esclusioni e intolleranze. Quando proponi sostituzioni o ricette, indica le quantità per una persona e, se utile, una stima di calorie e macronutrienti.
Privilegia alimenti freschi e di stagione, ricette semplici, preparabili in anticipo e trasportabili. Quando c'è il pesce, proponi anche un'alternativa senza pesce.
Non fai diagnosi né sostituisci il nutrizionista: per dubbi di salute o cambi importanti al piano, suggerisci di sentirlo.
L'app non applica da sola le tue proposte: chi la usa può riportarle nel Laboratorio (pulsante ✏️ su ogni pasto).`;

/**
 * Invia la conversazione a Claude e trasmette la risposta man mano che arriva.
 * @param history  messaggi precedenti [{ role, content }]
 * @param context  testo con piano, preferenze e menù della settimana
 * @param onText   chiamata con il testo accumulato finora
 * @returns { text, content } della risposta completa
 */
export async function chat({ history, context, onText, signal }) {
  const stream = client().beta.messages.stream(
    {
      ...FALLBACK,
      model: MODEL,
      max_tokens: 64000,
      output_config: { effort: 'medium' },
      system: [
        { type: 'text', text: CHAT_SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Contesto attuale dell'app:\n${context}` },
      ],
      messages: history,
    },
    { signal },
  );
  let acc = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      acc += event.delta.text;
      onText?.(acc);
    }
  }
  const msg = await stream.finalMessage();
  checkStop(msg);
  return { text: textOf(msg), content: msg.content };
}
