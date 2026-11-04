// Piano alimentare: lettura dal testo (PDF/TXT/incollato), struttura modificabile e porzioni.
//
// Formato atteso (molto diffuso negli schemi "a scelta"):
//   Pranzo
//   - 70 grammi riso, pasta, farro / 100 grammi pane integrale     ← una riga = un componente
//   - 100 grammi pesce o carne / 2 uova / 200 gr tofu               ← "/" separa le alternative
//   - Un cucchiaio d'olio
//   - Verdure libere

import { INGREDIENTS, gramsOf } from '../data/ingredients.js';
import { PROTEIN_KIND } from '../data/nutrition.js';
import { FOOD_ALIASES, GENERIC_REPRESENTATIVE, GENERIC_LABEL } from '../data/aliases.js';
import { nutrientsOfItem } from './nutrition.js';

export const MEAL_KEYS = {
  colazione: 'Colazione',
  spuntino1: 'Spuntino di metà mattina',
  pranzo: 'Pranzo',
  spuntino2: 'Spuntino pomeridiano',
  cena: 'Cena',
  spuntino3: 'Spuntino serale / post allenamento',
};
export const MEAL_ORDER = ['colazione', 'spuntino1', 'pranzo', 'spuntino2', 'cena', 'spuntino3'];

export const FREQ_LABELS = {
  carne_bianca: 'Carne bianca',
  carne_rossa: 'Carne rossa',
  pesce_azzurro: 'Pesce azzurro / grasso',
  pesce_bianco: 'Pesce bianco / magro',
  legumi: 'Legumi',
  uova: 'Uova',
  formaggi: 'Latticini e formaggi',
  affettati: 'Affettati magri',
  vegetale: 'Tofu, tempeh, seitan',
  libero: 'Pasto libero',
};

const FREQ_PATTERNS = {
  carne_bianca: /carne\s+bianca/,
  carne_rossa: /carne\s+rossa/,
  pesce_azzurro: /pesce\s+azzurro/,
  pesce_bianco: /pesce\s+bianco/,
  legumi: /legumi/,
  uova: /\buova\b/,
  formaggi: /latticini|formaggi/,
  affettati: /affettati/,
  vegetale: /prodotti\s+vegetali|tofu|seitan/,
  libero: /pasto\s+libero/,
};

// Porzioni di riferimento se il piano non le indica (per una tipologia proteica)
export const DEFAULT_PORTIONS = {
  carne: 100, pesce: 120, affettati: 80, uova: 2, albume: 200, tofu: 150, tempeh: 120,
  seitan: 100, burger_veg: 100, legumi: 60, formaggi: 100, polvere: 30,
};

const HEADER_RE = /^\s*(colazione|spuntino|snack|merenda|pranzo|cena|post[\s-]*(?:workout|allenamento)|pre[\s-]*nanna|spuntino serale)\b[^a-z]*$/i;

// ---------------------------------------------------------------------------
// Analisi di una riga
// ---------------------------------------------------------------------------

function parseQuantity(text) {
  const t = text.toLowerCase();
  if (/\bun\s+cucchiaio\b|\b1\s+cucchiaio\b/.test(t)) return { q: 10, u: 'g' };
  if (/\bun\s+cucchiaino\b|\b1\s+cucchiaino\b/.test(t)) return { q: 5, u: 'g' };
  const m = t.match(/(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(kg|grammi|gr\.?|g|ml|l)?(?![a-z])/i);
  if (!m) return { q: null, u: null };
  const a = parseFloat(m[1].replace(',', '.'));
  const b = m[2] ? parseFloat(m[2].replace(',', '.')) : null;
  let q = b ? (a + b) / 2 : a;
  let u = m[3] ? m[3].replace('.', '') : null;
  if (u === 'kg') { q *= 1000; u = 'g'; }
  if (u === 'l') { q *= 1000; u = 'ml'; }
  if (u && u.startsWith('gr')) u = 'g';
  if (u === 'grammi') u = 'g';
  return { q, u };
}

function matchFoods(text) {
  let t = ` ${text.toLowerCase().replace(/[’`]/g, "'")} `;
  const out = [];
  for (const [re, target] of FOOD_ALIASES) {
    let m;
    let guard = 0;
    while ((m = t.match(re)) && guard++ < 5) {
      if (!out.includes(target)) out.push(target);
      t = t.replace(m[0], ' ');
    }
  }
  return out;
}

export function parseOption(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const { q, u } = parseQuantity(clean);
  const foods = matchFoods(clean);
  const piece = foods.length && foods.every((f) => INGREDIENTS[f]?.u === 'pz');
  return { text: clean, q, u: u || (piece ? 'pz' : q != null ? 'g' : null), foods };
}

const roleOfFood = (f) => {
  if (f === 'VERDURE') return 'veg';
  if (f === 'FRUTTA') return 'frutta';
  if (['CARNE', 'PESCE', 'AFFETTATI', 'LEGUMI'].includes(f)) return 'prot';
  const ing = INGREDIENTS[f];
  if (!ing) return 'altro';
  if (['marmellata', 'miele'].includes(f)) return 'dolce';
  return ing.ro || 'altro';
};

export function parseLine(text) {
  const options = text.split('/').map(parseOption).filter((o) => o.text);
  const tally = {};
  for (const o of options) {
    const r = o.foods.length ? roleOfFood(o.foods[0]) : 'altro';
    tally[r] = (tally[r] || 0) + 1;
  }
  const role = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || 'altro';
  return { text: text.trim(), options, role };
}

// ---------------------------------------------------------------------------
// Lettura dell'intero testo
// ---------------------------------------------------------------------------

function mealKeyFor(header, seen) {
  const h = header.toLowerCase();
  if (h.startsWith('colazione')) return 'colazione';
  if (h.startsWith('pranzo')) return 'pranzo';
  if (h.startsWith('cena')) return 'cena';
  if (/post|pre|serale/.test(h)) return 'spuntino3';
  if (h.startsWith('merenda')) return 'spuntino2';
  // snack / spuntino: dipende dalla posizione rispetto al pranzo
  if (!seen.has('pranzo')) return seen.has('spuntino1') ? 'spuntino2' : 'spuntino1';
  if (!seen.has('spuntino2')) return 'spuntino2';
  return 'spuntino3';
}

export function parsePlanText(raw) {
  const text = raw.replace(/\r|\f/g, '\n').replace(/[’`]/g, "'");
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim());
  const meals = {};
  const seen = new Set();
  let current = null;
  let lastWasOption = false;

  for (const line of lines) {
    if (!line) continue; // le righe vuote (anche i cambi pagina) non interrompono una riga spezzata
    if (HEADER_RE.test(line)) {
      const key = mealKeyFor(line, seen);
      seen.add(key);
      current = meals[key] = meals[key] || { key, label: MEAL_KEYS[key], lines: [] };
      lastWasOption = false;
      continue;
    }
    if (!current) continue;
    if (/tot(ale)?\s*kcal/i.test(line)) { current = null; continue; }
    const opt = line.match(/^[.\s]*[-–•*]\s*(.*)$/);
    if (opt) {
      current.lines.push(opt[1].trim());
      lastWasOption = true;
    } else if (lastWasOption && (/^[a-zàèéìòù(]/.test(line) || /[/\d]\s*$/.test(current.lines.at(-1)))) {
      current.lines[current.lines.length - 1] += ' ' + line;
    } else {
      lastWasOption = false;
    }
  }

  const num = (re) => {
    const m = text.match(re);
    return m ? Number(m[1]) : null;
  };
  const targets = {
    kcal: num(/kcal[^\d]{0,15}(\d{3,4})/i) ?? num(/(\d{3,4})\s*kcal/i),
    p: num(/proteine[^\d]{0,8}(\d{2,3})/i),
    c: num(/carbo(?:idrati)?[^\d]{0,8}(\d{2,3})/i),
    f: num(/grassi[^\d]{0,8}(\d{2,3})/i),
  };

  const rule = text.match(/(\d+)\s*(?:g|gr|grammi)\.?\s*(?:di\s+)?legumi\s+secchi\s+(?:per|ogni)\s+(?:ogni\s+)?(\d+)\s*(?:g|gr|grammi)/i);
  const legumeRule = rule ? Math.round((Number(rule[1]) / Number(rule[2])) * 100) : null;

  // Frequenze settimanali (se presenti come testo; spesso sono in un'immagine)
  const freq = {};
  const lower = text.toLowerCase();
  const fIdx = lower.search(/frequenza/);
  if (fIdx >= 0) {
    const zone = lower.slice(fIdx, fIdx + 1500);
    for (const [k, re] of Object.entries(FREQ_PATTERNS)) {
      const m = zone.match(new RegExp(re.source + String.raw`[^\d\n]{0,30}(\d)\s*volt`));
      if (m) freq[k] = Number(m[1]);
    }
  }

  const ordered = MEAL_ORDER.filter((k) => meals[k]).map((k) => meals[k]);
  return {
    version: 1,
    source: 'testo',
    targets: Object.values(targets).some((v) => v) ? targets : null,
    legumeRule,
    freq: Object.keys(freq).length >= 4 ? freq : null,
    freeSlot: 11,
    meals: ordered,
  };
}

/** Testo estratto da un PDF (richiede pdf.js nel browser). */
export async function pdfToText(pdfjsLib, data) {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map();
    for (const it of content.items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push({ x: it.transform[4], s: it.str });
    }
    const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, items] of sorted) {
      out.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim());
    }
    out.push('');
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Dal piano alle porzioni
// ---------------------------------------------------------------------------

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const concreteFood = (f) => (INGREDIENTS[f] ? f : GENERIC_REPRESENTATIVE[f]);

/** Quantità nell'unità dell'ingrediente (converte grammi ↔ pezzi). */
export function qtyFor(id, q, u) {
  const ing = INGREDIENTS[id];
  if (ing.u === 'pz' && u !== 'pz') return q / (ing.pw || 100);
  if (ing.u !== 'pz' && u === 'pz') return q * (ing.pw || 100);
  return q;
}

/** Valori stimati di un'opzione (media degli alimenti elencati). */
export function optionNutrients(o) {
  const foods = o.foods.map(concreteFood).filter(Boolean);
  if (o.q == null || !foods.length) return null;
  const tot = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const id of foods) {
    const n = nutrientsOfItem(id, qtyFor(id, o.q, o.u));
    for (const k in tot) tot[k] += n[k] / foods.length;
  }
  return tot;
}

export function foodLabel(f) {
  return INGREDIENTS[f]?.n || GENERIC_LABEL[f] || f;
}

/** Analizza un pasto del piano: porzioni, stima calorica, avvisi. */
export function analyzeMeal(meal, plan) {
  const lines = meal.lines.map(parseLine);
  const warnings = [];
  const portions = { carb: null, prot: {}, oil: 0 };
  const est = { kcal: 0, p: 0, c: 0, f: 0 };

  for (const line of lines) {
    const ns = line.options.map((o) => ({ o, n: optionNutrients(o) })).filter((x) => x.n);
    if (line.role === 'carb') {
      const carbs = ns.map((x) => x.n.c);
      const med = median(carbs);
      for (const x of ns) {
        if (med && x.n.c < med * 0.3) {
          warnings.push(`"${x.o.text}": quantità molto più bassa delle alternative, forse un refuso? Non la considero.`);
        }
      }
      const ok = ns.filter((x) => !med || x.n.c >= med * 0.3);
      portions.carb = median(ok.map((x) => x.n.c));
      const pick = ok.length ? ok : ns;
      for (const k in est) est[k] += median(pick.map((x) => x.n[k])) || 0;
      continue;
    }
    if (line.role === 'prot') {
      for (const o of line.options) {
        if (o.q == null) continue;
        for (const f of o.foods) {
          const kind = { CARNE: 'carne', PESCE: 'pesce', AFFETTATI: 'affettati', LEGUMI: 'legumi' }[f] || PROTEIN_KIND[f];
          if (!kind || portions.prot[kind] != null) continue;
          portions.prot[kind] = kind === 'uova' ? qtyFor('uova', o.q, o.u) : o.q;
        }
      }
    }
    if (line.role === 'fat') {
      const o = line.options.find((x) => x.foods.includes('olio'));
      if (o?.q) portions.oil += o.u === 'ml' ? o.q * 0.92 : o.q;
    }
    if (line.role === 'veg') continue;
    if (ns.length) for (const k in est) est[k] += median(ns.map((x) => x.n[k])) || 0;
    for (const o of line.options) {
      if (o.text && !o.foods.length && !/libere|a volontà/i.test(o.text)) warnings.push(`Non riconosco "${o.text}".`);
    }
  }
  if (plan?.legumeRule && portions.prot.legumi == null && ['pranzo', 'cena'].includes(meal.key)) {
    const base = portions.prot.carne ?? portions.prot.pesce ?? 100;
    portions.prot.legumi = Math.round((plan.legumeRule * base) / 100);
  }
  if (!portions.oil) portions.oil = null;
  return { key: meal.key, label: meal.label, lines, portions, est, warnings };
}

/** Analisi completa del piano. */
export function analyzePlan(plan) {
  const meals = plan.meals.map((m) => analyzeMeal(m, plan));
  const est = meals.reduce((a, m) => ({ kcal: a.kcal + m.est.kcal, p: a.p + m.est.p, c: a.c + m.est.c, f: a.f + m.est.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { meals, est, byKey: Object.fromEntries(meals.map((m) => [m.key, m])) };
}

/** Riproporziona una ricetta (ingredienti già risolti) sulle porzioni di un pasto del piano. */
export function scaleToPortions(items, portions) {
  if (!portions) return items;
  const out = items.map((x) => ({ ...x }));
  // carboidrati: stessa quantità di carboidrati indicata dal piano
  const carb = out.filter((x) => INGREDIENTS[x.id].ro === 'carb');
  const cTot = carb.reduce((a, x) => a + nutrientsOfItem(x.id, x.q).c, 0);
  if (portions.carb && cTot > 0) {
    const k = portions.carb / cTot;
    for (const x of carb) x.q = INGREDIENTS[x.id].u === 'pz' ? Math.max(0.5, Math.round(x.q * k * 2) / 2) : Math.round(x.q * k);
  }
  // proteine: somma delle "porzioni equivalenti" = 1 (es. 50 g legumi + 40 g tonno)
  const prot = out.filter((x) => INGREDIENTS[x.id].px);
  const target = (x) => portions.prot?.[INGREDIENTS[x.id].px] ?? DEFAULT_PORTIONS[INGREDIENTS[x.id].px] ?? x.q;
  const units = prot.reduce((a, x) => a + x.q / target(x), 0);
  if (units > 0) {
    for (const x of prot) {
      const q = x.q / units;
      x.q = INGREDIENTS[x.id].u === 'pz' ? Math.max(1, Math.round(q)) : Math.round(q / 5) * 5;
    }
  }
  // condimento
  const oil = out.find((x) => x.id === 'olio');
  if (oil && portions.oil) oil.q = Math.round(portions.oil);
  return out;
}

/** Testo leggibile di una riga del piano, con i cibi riconosciuti. */
export function describeOption(o) {
  const n = optionNutrients(o);
  return {
    text: o.text,
    foods: o.foods.map(foodLabel),
    kcal: n ? Math.round(n.kcal) : null,
  };
}

/** Piano vuoto da compilare a mano. */
export function emptyPlan() {
  return {
    version: 1,
    source: 'manuale',
    targets: { kcal: null, p: null, c: null, f: null },
    legumeRule: 60,
    freq: null,
    freeSlot: 11,
    meals: [
      { key: 'colazione', label: MEAL_KEYS.colazione, lines: [] },
      { key: 'pranzo', label: MEAL_KEYS.pranzo, lines: ['70 g riso, pasta, farro / 100 g pane integrale', '100 g carne o pesce / 2 uova / 150 g tofu', '10 g olio', 'verdure libere'] },
      { key: 'cena', label: MEAL_KEYS.cena, lines: ['100 g carne o pesce / 2 uova / 150 g tofu', '60 g pane integrale / 50 g riso o pasta', '10 g olio', 'verdure libere'] },
    ],
  };
}

export { gramsOf };
