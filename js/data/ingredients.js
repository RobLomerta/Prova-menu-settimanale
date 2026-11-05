import { NUTRITION, PIECE_WEIGHT, CARB_IDS, PROTEIN_KIND, FRUIT_IDS } from './nutrition.js';

// Database ingredienti.
//
// Campi:
//   n    nome visualizzato
//   c    reparto del supermercato (vedi CATEGORIES)
//   u    unità: 'g' | 'ml' | 'pz'
//   pk   confezione minima di acquisto (0 = sfuso, si compra la quantità che serve)
//   sh   giorni di conservazione dopo l'acquisto (frigo/dispensa)
//   op   giorni di conservazione una volta aperta la confezione (default = sh)
//   f    true = alimento fresco
//   se   stagionalità 'mese_inizio-mese_fine' (es. '10-3' = ottobre-marzo); assente = tutto l'anno
//   t    tag per regimi/intolleranze: meat, pork, fish, shell, egg, dairy, lactose, gluten, nuts, mush, honey
//   sub  sostituti { gluten, lactose, vegan }
//   prep chiave del meal prep (cottura anticipata)
//   frz  si può congelare / comprare surgelato
//   pan  articolo di dispensa (si verifica, non si quantifica)

export const CATEGORIES = {
  verdura: 'Frutta e verdura',
  pesce: 'Pesce',
  carne: 'Carne',
  latte: 'Latticini e uova',
  forno: 'Pane e forno',
  secco: 'Pasta, cereali e legumi',
  vegetali: 'Proteine vegetali',
  conserve: 'Conserve',
  semi: 'Frutta secca e semi',
  surgelati: 'Surgelati',
  dispensa: 'Dispensa (controlla di averli)',
};

// Ordine dei reparti nella lista della spesa (percorso tipico al supermercato)
export const CATEGORY_ORDER = [
  'verdura', 'forno', 'pesce', 'carne', 'latte', 'vegetali',
  'secco', 'conserve', 'semi', 'surgelati', 'dispensa',
];

const V = (n, o) => ({ n, c: 'verdura', u: 'g', pk: 0, f: true, ...o });

export const INGREDIENTS = {
  // --- Verdura e frutta -------------------------------------------------
  zucchine: V('Zucchine', { sh: 6, se: '5-9' }),
  melanzane: V('Melanzane', { sh: 6, se: '6-9' }),
  peperoni: V('Peperoni', { sh: 7, se: '6-9' }),
  pomodori: V('Pomodori', { sh: 6, se: '6-9' }),
  pomodorini: V('Pomodorini', { pk: 250, sh: 6, se: '5-10' }),
  cetrioli: V('Cetrioli', { sh: 7, se: '5-9' }),
  fagiolini: V('Fagiolini', { sh: 4, se: '6-9' }),
  lattuga: V('Insalata (1 cespo)', { pk: 300, sh: 5, prep: 'lava' }),
  rucola: V('Rucola', { pk: 100, sh: 3, se: '3-11', prep: 'lava' }),
  spinaci: V('Spinaci freschi', { pk: 300, sh: 3, se: '10-5' }),
  cavolfiore: V('Cavolfiore (1 cespo)', { pk: 800, sh: 7, se: '10-3' }),
  broccoli: V('Broccoli', { sh: 5, se: '10-4' }),
  cavolo_nero: V('Cavolo nero (1 mazzo)', { pk: 300, sh: 5, se: '10-3' }),
  verza: V('Cavolo verza (½ cespo)', { pk: 600, sh: 10, se: '10-3' }),
  cavolo_cappuccio: V('Cavolo cappuccio (¼ cespo)', { pk: 400, sh: 14, se: '10-4' }),
  finocchi: V('Finocchi', { sh: 7, se: '10-4' }),
  zucca: V('Zucca', { sh: 7, se: '9-1' }),
  porri: V('Porri', { sh: 10, se: '10-4' }),
  carote: V('Carote', { sh: 21 }),
  cipolla: V('Cipolle', { sh: 30 }),
  patate: V('Patate', { sh: 30 }),
  sedano: V('Sedano (1 cespo)', { pk: 400, sh: 10 }),
  funghi: V('Funghi champignon', { pk: 250, sh: 4, t: ['mush'] }),
  limone: V('Limoni', { u: 'pz', sh: 21 }),
  arance: V('Arance', { sh: 14, se: '11-4' }),
  prezzemolo: V('Prezzemolo (1 mazzetto)', { pk: 30, sh: 5 }),
  basilico: V('Basilico (1 mazzetto)', { pk: 20, sh: 5, se: '5-9' }),
  zenzero: V('Zenzero fresco', { sh: 21 }),
  patate_dolci: V('Patate americane (dolci)', { sh: 21, se: '9-3' }),
  asparagi: V('Asparagi (1 mazzo)', { pk: 500, sh: 3, se: '3-6' }),
  carciofi: V('Carciofi', { sh: 5, se: '11-4' }),
  bietole: V('Bietole', { sh: 4, se: '3-11' }),
  // frutta (per colazioni e spuntini)
  banana: V('Banane', { sh: 6 }),
  mela: V('Mele', { sh: 21 }),
  pera: V('Pere', { sh: 7, se: '8-3' }),
  kiwi: V('Kiwi', { sh: 14, se: '11-4' }),
  uva: V('Uva', { sh: 5, se: '8-10' }),
  frutti_bosco: V('Frutti di bosco', { pk: 125, sh: 3, se: '6-9', frz: true }),
  pesche: V('Pesche', { sh: 5, se: '6-9' }),
  albicocche: V('Albicocche', { sh: 5, se: '6-7' }),
  ananas: V('Ananas', { sh: 6 }),
  mango: V('Mango', { sh: 6 }),
  mandarini: V('Mandarini', { sh: 10, se: '11-2' }),
  fragole: V('Fragole', { pk: 250, sh: 3, se: '4-6' }),
  cachi: V('Cachi', { sh: 7, se: '10-12' }),
  frutta_mista: V('Frutta di stagione', { sh: 7 }),

  // --- Pesce --------------------------------------------------------------
  salmone: { n: 'Salmone (filetto)', c: 'pesce', u: 'g', pk: 0, sh: 2, f: true, t: ['fish'], frz: true },
  orata: { n: 'Orata o branzino (filetti)', c: 'pesce', u: 'g', pk: 0, sh: 2, f: true, t: ['fish'], frz: true },
  merluzzo: { n: 'Merluzzo (filetti)', c: 'pesce', u: 'g', pk: 0, sh: 2, f: true, t: ['fish'], frz: true },
  pesce_spada: { n: 'Pesce spada (trancio)', c: 'pesce', u: 'g', pk: 0, sh: 2, f: true, t: ['fish'], frz: true },
  gamberi: { n: 'Gamberi sgusciati', c: 'pesce', u: 'g', pk: 0, sh: 1, f: true, t: ['fish', 'shell'], frz: true },
  calamari: { n: 'Calamari puliti', c: 'pesce', u: 'g', pk: 0, sh: 2, f: true, t: ['fish', 'shell'], frz: true },

  // --- Carne --------------------------------------------------------------
  pollo: { n: 'Petto di pollo', c: 'carne', u: 'g', pk: 0, sh: 2, f: true, t: ['meat'], frz: true },
  tacchino: { n: 'Fesa di tacchino', c: 'carne', u: 'g', pk: 0, sh: 2, f: true, t: ['meat'], frz: true },
  macinato: { n: 'Macinato di manzo', c: 'carne', u: 'g', pk: 0, sh: 1, f: true, t: ['meat'], frz: true },
  manzo: { n: 'Manzo (straccetti o tagliata)', c: 'carne', u: 'g', pk: 0, sh: 3, f: true, t: ['meat'], frz: true },
  maiale: { n: 'Lonza di maiale', c: 'carne', u: 'g', pk: 0, sh: 3, f: true, t: ['meat', 'pork'], frz: true },

  bresaola: { n: 'Bresaola', c: 'carne', u: 'g', pk: 80, sh: 20, op: 3, f: true, t: ['meat'] },
  prosciutto_cotto: { n: 'Prosciutto cotto sgrassato', c: 'carne', u: 'g', pk: 100, sh: 15, op: 3, f: true, t: ['meat', 'pork'] },
  fesa_affettata: { n: 'Fesa di tacchino affettata', c: 'carne', u: 'g', pk: 100, sh: 15, op: 3, f: true, t: ['meat'] },

  // --- Latticini e uova ---------------------------------------------------
  albumi: { n: 'Albume d’uovo (brick)', c: 'latte', u: 'g', pk: 500, sh: 30, op: 5, t: ['egg'] },
  uova: { n: 'Uova', c: 'latte', u: 'pz', pk: 6, sh: 21, f: true, t: ['egg'] },
  mozzarella: { n: 'Mozzarella', c: 'latte', u: 'g', pk: 125, sh: 5, f: true, t: ['dairy', 'lactose'], sub: { lactose: 'mozzarella_sl' } },
  mozzarella_sl: { n: 'Mozzarella senza lattosio', c: 'latte', u: 'g', pk: 125, sh: 7, f: true, t: ['dairy'] },
  ricotta: { n: 'Ricotta', c: 'latte', u: 'g', pk: 250, sh: 5, op: 4, f: true, t: ['dairy', 'lactose'], sub: { lactose: 'ricotta_sl' } },
  ricotta_sl: { n: 'Ricotta senza lattosio', c: 'latte', u: 'g', pk: 250, sh: 7, op: 4, f: true, t: ['dairy'] },
  feta: { n: 'Feta', c: 'latte', u: 'g', pk: 200, sh: 30, op: 7, t: ['dairy', 'lactose'] },
  parmigiano: { n: 'Parmigiano Reggiano', c: 'latte', u: 'g', pk: 150, sh: 60, op: 30, t: ['dairy'], sub: { vegan: 'lievito' } },
  yogurt: { n: 'Yogurt greco 0%', c: 'latte', u: 'g', pk: 170, sh: 14, f: true, t: ['dairy', 'lactose'], sub: { lactose: 'yogurt_sl', vegan: 'yogurt_soia' } },
  yogurt_sl: { n: 'Yogurt greco 0% senza lattosio', c: 'latte', u: 'g', pk: 150, sh: 14, f: true, t: ['dairy'], sub: { vegan: 'yogurt_soia' } },
  yogurt_soia: { n: 'Yogurt di soia bianco', c: 'latte', u: 'g', pk: 125, sh: 14, f: true },
  latte: { n: 'Latte fresco', c: 'latte', u: 'ml', pk: 500, sh: 6, op: 3, f: true, t: ['dairy', 'lactose'], sub: { lactose: 'latte_sl', vegan: 'bevanda_soia' } },
  latte_sl: { n: 'Latte senza lattosio', c: 'latte', u: 'ml', pk: 500, sh: 10, op: 4, t: ['dairy'], sub: { vegan: 'bevanda_soia' } },
  bevanda_soia: { n: 'Bevanda di soia', c: 'vegetali', u: 'ml', pk: 1000, sh: 90, op: 5 },

  // --- Pane ---------------------------------------------------------------
  pane: { n: 'Pane integrale (forno)', c: 'forno', u: 'g', pk: 0, sh: 3, f: true, t: ['gluten'], frz: true, sub: { gluten: 'pane_gf' } },
  pane_gf: { n: 'Pane senza glutine', c: 'forno', u: 'g', pk: 300, sh: 5, op: 4, t: [], frz: true },
  piadina: { n: 'Piadine integrali', c: 'forno', u: 'pz', pk: 4, sh: 14, op: 5, t: ['gluten'], sub: { gluten: 'piadina_gf' } },
  piadina_gf: { n: 'Piadine senza glutine', c: 'forno', u: 'pz', pk: 3, sh: 14, op: 5 },

  fette_biscottate: { n: 'Fette biscottate integrali', c: 'forno', u: 'g', pk: 300, sh: 120, t: ['gluten'], sub: { gluten: 'gallette' } },
  gallette: { n: 'Gallette o crackers integrali (tipo Wasa)', c: 'forno', u: 'g', pk: 250, sh: 120 },

  // --- Pasta, cereali e legumi -------------------------------------------
  pasta: { n: 'Pasta integrale', c: 'secco', u: 'g', pk: 500, sh: 365, t: ['gluten'], sub: { gluten: 'pasta_gf' } },
  pasta_gf: { n: 'Pasta senza glutine', c: 'secco', u: 'g', pk: 400, sh: 365 },
  riso: { n: 'Riso (basmati o integrale)', c: 'secco', u: 'g', pk: 1000, sh: 365, prep: 'cereali' },
  farro: { n: 'Farro perlato', c: 'secco', u: 'g', pk: 500, sh: 365, t: ['gluten'], prep: 'cereali', sub: { gluten: 'grano_saraceno' } },
  orzo: { n: 'Orzo perlato', c: 'secco', u: 'g', pk: 500, sh: 365, t: ['gluten'], prep: 'cereali', sub: { gluten: 'miglio' } },
  couscous: { n: 'Cous cous integrale', c: 'secco', u: 'g', pk: 500, sh: 365, t: ['gluten'], sub: { gluten: 'quinoa' } },
  quinoa: { n: 'Quinoa', c: 'secco', u: 'g', pk: 500, sh: 365, prep: 'cereali' },
  grano_saraceno: { n: 'Grano saraceno', c: 'secco', u: 'g', pk: 500, sh: 365, prep: 'cereali' },
  miglio: { n: 'Miglio', c: 'secco', u: 'g', pk: 500, sh: 365, prep: 'cereali' },
  avena: { n: "Fiocchi d'avena", c: 'secco', u: 'g', pk: 500, sh: 180, t: ['gluten'], sub: { gluten: 'avena_gf' } },
  avena_gf: { n: "Fiocchi d'avena senza glutine", c: 'secco', u: 'g', pk: 500, sh: 180 },
  polenta: { n: 'Farina di mais / polenta', c: 'secco', u: 'g', pk: 500, sh: 365 },
  proteine_polvere: { n: 'Proteine in polvere', c: 'secco', u: 'g', pk: 1000, sh: 365, t: ['dairy'] },
  ceci: { n: 'Ceci secchi', c: 'secco', u: 'g', pk: 500, sh: 365, prep: 'legumi' },
  fagioli: { n: 'Fagioli secchi (borlotti o cannellini)', c: 'secco', u: 'g', pk: 500, sh: 365, prep: 'legumi' },
  lenticchie: { n: 'Lenticchie secche', c: 'secco', u: 'g', pk: 500, sh: 365, prep: 'legumi' },
  lenticchie_rosse: { n: 'Lenticchie rosse decorticate', c: 'secco', u: 'g', pk: 500, sh: 365 },

  // --- Proteine vegetali -------------------------------------------------
  tofu: { n: 'Tofu naturale', c: 'vegetali', u: 'g', pk: 200, sh: 20, op: 4 },
  tempeh: { n: 'Tempeh', c: 'vegetali', u: 'g', pk: 200, sh: 20, op: 4 },
  burger_veg: { n: 'Burger vegetali', c: 'vegetali', u: 'g', pk: 200, sh: 10, op: 2 },
  seitan: { n: 'Seitan', c: 'vegetali', u: 'g', pk: 200, sh: 15, op: 4, t: ['gluten'] },

  // --- Conserve -----------------------------------------------------------
  pelati: { n: 'Pomodori pelati o polpa (barattolo)', c: 'conserve', u: 'g', pk: 400, sh: 365, op: 4 },
  tonno: { n: 'Tonno al naturale (scatoletta)', c: 'conserve', u: 'g', pk: 80, sh: 365, t: ['fish'] },
  olive_verdi: { n: 'Olive verdi', c: 'conserve', u: 'g', pk: 200, sh: 90, op: 14 },
  marmellata: { n: 'Marmellata o confettura extra', c: 'conserve', u: 'g', pk: 340, sh: 180, op: 30 },
  barretta: { n: 'Barrette proteiche', c: 'secco', u: 'pz', pk: 3, sh: 180 },
  sgombro: { n: 'Sgombro al naturale (scatoletta)', c: 'conserve', u: 'g', pk: 125, sh: 365, t: ['fish'] },

  // --- Frutta secca e semi -----------------------------------------------
  noci: { n: 'Noci sgusciate', c: 'semi', u: 'g', pk: 100, sh: 90, t: ['nuts'] },
  semi_zucca: { n: 'Semi di zucca', c: 'semi', u: 'g', pk: 150, sh: 90 },
  sesamo: { n: 'Semi di sesamo', c: 'semi', u: 'g', pk: 150, sh: 180 },
  tahina: { n: 'Tahina (crema di sesamo)', c: 'semi', u: 'g', pk: 300, sh: 120, op: 60 },

  // --- Surgelati -----------------------------------------------------------
  piselli: { n: 'Piselli surgelati', c: 'surgelati', u: 'g', pk: 450, sh: 180 },

  // --- Dispensa ------------------------------------------------------------
  olio: { n: "Olio extravergine d'oliva", c: 'dispensa', pan: true },
  sale_pepe: { n: 'Sale e pepe', c: 'dispensa', pan: true },
  aglio: { n: 'Aglio', c: 'dispensa', pan: true },
  origano: { n: 'Origano', c: 'dispensa', pan: true },
  rosmarino: { n: 'Rosmarino', c: 'dispensa', pan: true },
  curry: { n: 'Curry in polvere', c: 'dispensa', pan: true },
  cumino: { n: 'Cumino', c: 'dispensa', pan: true },
  paprika: { n: 'Paprika dolce', c: 'dispensa', pan: true },
  curcuma: { n: 'Curcuma', c: 'dispensa', pan: true },
  peperoncino: { n: 'Peperoncino', c: 'dispensa', pan: true },
  aceto: { n: 'Aceto (di mele o balsamico)', c: 'dispensa', pan: true },
  soia: { n: 'Salsa di soia', c: 'dispensa', pan: true, t: ['gluten'], sub: { gluten: 'tamari' } },
  tamari: { n: 'Tamari (salsa di soia senza glutine)', c: 'dispensa', pan: true },
  brodo: { n: 'Brodo vegetale (dado o granulare)', c: 'dispensa', pan: true },
  pangrattato: { n: 'Pangrattato', c: 'dispensa', pan: true, t: ['gluten'], sub: { gluten: 'pangrattato_gf' } },
  pangrattato_gf: { n: 'Pangrattato senza glutine', c: 'dispensa', pan: true },
  farina: { n: 'Farina', c: 'dispensa', pan: true, t: ['gluten'], sub: { gluten: 'farina_riso' } },
  farina_riso: { n: 'Farina di riso', c: 'dispensa', pan: true },
  capperi: { n: 'Capperi', c: 'dispensa', pan: true },
  olive: { n: 'Olive (taggiasche o nere)', c: 'dispensa', pan: true },
  miele: { n: 'Miele', c: 'dispensa', pan: true, t: ['honey'], sub: { vegan: 'sciroppo_acero' } },
  sciroppo_acero: { n: "Sciroppo d'acero", c: 'dispensa', pan: true },
  cannella: { n: 'Cannella', c: 'dispensa', pan: true },
  lievito: { n: 'Lievito alimentare in scaglie', c: 'dispensa', pan: true },
};

// Frutta di stagione suggerita per mese (1 = gennaio)
export const SEASONAL_FRUIT = {
  1: 'arance, mandarini, kiwi, mele, pere',
  2: 'arance, kiwi, mele, pere, pompelmi',
  3: 'arance, kiwi, mele, pere',
  4: 'fragole, kiwi, mele, arance',
  5: 'fragole, ciliegie, nespole',
  6: 'albicocche, ciliegie, pesche, fragole',
  7: 'pesche, albicocche, melone, anguria, prugne',
  8: 'pesche, fichi, melone, anguria, prugne',
  9: 'uva, fichi, pere, mele, prugne',
  10: 'uva, mele, pere, cachi, melagrana',
  11: 'mele, pere, cachi, kiwi, mandarini',
  12: 'arance, mandarini, kiwi, mele, pere',
};

export function inSeason(ing, month) {
  if (!ing.se) return true;
  const [a, b] = ing.se.split('-').map(Number);
  return a <= b ? month >= a && month <= b : month >= a || month <= b;
}

export function isPerishable(ing) {
  const days = Math.min(ing.sh ?? 365, ing.op ?? ing.sh ?? 365);
  return days <= 10;
}

// Arricchisce ogni ingrediente con valori nutrizionali e ruolo nel piatto
for (const [id, ing] of Object.entries(INGREDIENTS)) {
  ing.u ??= 'g';
  ing.pk ??= 0;
  ing.nu = NUTRITION[id] || [0, 0, 0, 0];
  if (PIECE_WEIGHT[id]) ing.pw = PIECE_WEIGHT[id];
  if (CARB_IDS.includes(id)) ing.ro = 'carb';
  else if (PROTEIN_KIND[id]) { ing.ro = 'prot'; ing.px = PROTEIN_KIND[id]; }
  else if (id === 'olio') ing.ro = 'fat';
  else if (FRUIT_IDS.includes(id)) ing.ro = 'frutta';
  else if (ing.c === 'verdura') ing.ro = 'veg';
  else ing.ro = 'altro';
}

/** Grammi equivalenti di una quantità nell'unità dell'ingrediente. */
export const gramsOf = (id, q) => {
  const ing = INGREDIENTS[id];
  return ing.u === 'pz' ? q * (ing.pw || 100) : q;
};
