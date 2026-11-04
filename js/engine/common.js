export const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const SLOTS = 14; // 7 giorni × (pranzo, cena)

export const slotDay = (s) => Math.floor(s / 2);
export const slotMeal = (s) => (s % 2 === 0 ? 'P' : 'C');
export const isWorkLunch = (s) => slotMeal(s) === 'P' && slotDay(s) < 5;
export const slotLabel = (s) => `${DAYS_SHORT[slotDay(s)]} ${slotMeal(s) === 'P' ? 'pranzo' : 'cena'}`;

/** Generatore pseudo-casuale con seme (mulberry32), per risultati riproducibili. */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

/**
 * Spesa da cui proviene un ingrediente consumato il giorno `day`.
 * Spesa 0 = weekend (prima di lunedì); spesa 1 = mercoledì (se attiva).
 * Si compra a metà settimana solo ciò che non durerebbe fino al consumo.
 */
export function shopFor(ing, day, meal, twoShops) {
  const since1 = day + 1;
  const eligible2 = twoShops && (day > 2 || (day === 2 && meal === 'C'));
  if (eligible2 && since1 > (ing.sh ?? 365)) return { shop: 1, since: day - 2 };
  return { shop: 0, since: since1 };
}
