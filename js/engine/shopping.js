import { INGREDIENTS, CATEGORIES, CATEGORY_ORDER, SEASONAL_FRUIT, isPerishable } from '../data/ingredients.js';
import { DAYS_SHORT, slotLabel } from './common.js';
import { collectNeeds, slotEntries, breakfastEntries } from './planner.js';

const LEFTOVER_IDEAS = {
  verdura: 'aggiungila a una frittata, a una vellutata o come contorno',
  latte: 'usalo in un’insalata, a colazione o come spuntino',
  vegetali: 'congelalo appena aperto o aggiungilo a un’insalata',
  conserve: 'congela il pomodoro avanzato in un barattolo',
  forno: 'congela le piadine: si scaldano in 1 minuto',
};

function roundLoose(q, unit) {
  if (unit === 'pz') return Math.ceil(q - 1e-9);
  if (q < 100) return Math.ceil(q / 10) * 10;
  return Math.ceil(q / 50) * 50;
}

export function fmtQty(q, unit) {
  if (unit === 'pz') return `${Math.ceil(q - 1e-9)}`;
  if (unit === 'g' && q >= 1000) return `${(q / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} kg`;
  if (unit === 'ml' && q >= 1000) return `${(q / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} l`;
  return `${Math.round(q)} ${unit}`;
}

function describe(n) {
  const ing = INGREDIENTS[n.id];
  const item = { key: `${n.shop}|${n.id}`, id: n.id, name: ing.n, cat: ing.c, need: n.q, uses: [...new Set(n.uses)] };
  if (ing.pk > 0) {
    const packs = Math.ceil(n.q / ing.pk - 1e-9);
    const left = packs * ing.pk - n.q;
    item.buy = ing.u === 'pz' && ing.pk > 1
      ? `${packs} conf. da ${ing.pk}`
      : `${packs} conf. da ${fmtQty(ing.pk, ing.u)}`;
    item.detail = `ti servono ${fmtQty(n.q, ing.u)}`;
    if (left > 0 && isPerishable(ing) && left / ing.pk >= 0.2) {
      item.leftover = `avanzo ~${fmtQty(left, ing.u)}: ${LEFTOVER_IDEAS[ing.c] || 'pianifica un uso extra'}`;
    } else if (left > 0) {
      item.detail += ing.f && (ing.sh ?? 365) < 60
        ? ` · il resto si conserva ~${ing.sh} giorni`
        : ` · il resto va in dispensa`;
    }
  } else {
    item.buy = ing.u === 'pz' ? `${roundLoose(n.q, 'pz')} pz` : fmtQty(roundLoose(n.q, ing.u), ing.u);
    if (ing.u === 'pz' && n.q % 1) item.detail = `ti servono ${n.q.toLocaleString('it-IT')}`;
  }
  return item;
}

/** Lista della spesa completa per il piano (tiene conto delle alternative scelte al pesce). */
export function shoppingList(plan, ctx) {
  const entries = slotEntries(plan.slots, ctx, { useAlt: true }).map((e, s) => ({ ...e, label: slotLabel(s) }));
  const bEntries = breakfastEntries(plan, ctx).map((e) => ({ ...e, label: `${DAYS_SHORT[e.day]} colazione` }));
  const all = [...entries, ...bEntries];
  const { needs, issues } = collectNeeds(all, ctx);

  const pantry = new Set();
  for (const e of all) for (const id of e.r.pantry || []) pantry.add(id);

  const shops = [0, 1].map((shop) => {
    const items = [...needs.values()].filter((n) => n.shop === shop).map(describe);
    const groups = CATEGORY_ORDER.filter((c) => c !== 'dispensa')
      .map((cat) => ({
        cat,
        label: CATEGORIES[cat],
        items: items.filter((it) => it.cat === cat).sort((a, b) => a.name.localeCompare(b.name, 'it')),
      }))
      .filter((g) => g.items.length);
    return {
      shop,
      title: shop === 0 ? 'Spesa del weekend' : 'Spesa di mercoledì (prodotti freschissimi)',
      groups,
      count: items.length,
    };
  }).filter((s) => s.count);

  return {
    shops,
    pantry: [...pantry].map((id) => ({ key: `p|${id}`, id, name: INGREDIENTS[id].n })).sort((a, b) => a.name.localeCompare(b.name, 'it')),
    fruit: { portions: 14, suggestions: SEASONAL_FRUIT[ctx.month] },
    warnings: issues.map((is) => ({
      id: is.id,
      text: `${INGREDIENTS[is.id].n} per ${DAYS_SHORT[is.day]} ${is.meal === 'P' ? 'pranzo' : is.meal === 'C' ? 'cena' : 'colazione'} (${is.r.n}): ${
        INGREDIENTS[is.id].frz ? 'compralo surgelato, oppure fresco il giorno stesso' : 'compralo il giorno stesso'
      }.`,
    })),
  };
}

/** Versione testuale per copiarla o condividerla. */
export function shoppingText(list, checked = {}) {
  const lines = [];
  for (const shop of list.shops) {
    lines.push(`🛒 ${shop.title.toUpperCase()}`);
    for (const g of shop.groups) {
      lines.push(`\n${g.label}`);
      for (const it of g.items) if (!checked[it.key]) lines.push(`- ${it.name}: ${it.buy}`);
    }
    lines.push('');
  }
  lines.push(`🍎 Frutta di stagione: ~${list.fruit.portions} porzioni (${list.fruit.suggestions})`);
  const pantry = list.pantry.filter((p) => !checked[p.key]);
  if (pantry.length) lines.push(`\n🧂 Dispensa (controlla): ${pantry.map((p) => p.name).join(', ')}`);
  return lines.join('\n');
}
