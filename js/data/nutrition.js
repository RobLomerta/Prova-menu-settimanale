// Valori nutrizionali indicativi per 100 g (o 100 ml) di parte edibile, a crudo.
// [kcal, proteine g, carboidrati g, grassi g]
// Fonti: medie da tabelle CREA (Alimenti e Nutrizione) e USDA FoodData Central.
// Sono valori medi: le singole marche/varietà possono differire.

export const NUTRITION = {
  // verdura
  zucchine: [16, 1.3, 1.4, 0.1], melanzane: [20, 1.1, 2.6, 0.1], peperoni: [26, 0.9, 4.2, 0.3],
  pomodori: [19, 1, 3.5, 0.2], pomodorini: [20, 1, 3.5, 0.2], cetrioli: [14, 0.7, 1.8, 0.5],
  fagiolini: [18, 2.1, 2.4, 0.1], lattuga: [15, 1.4, 1.7, 0.2], rucola: [28, 2.6, 3.9, 0.3],
  spinaci: [23, 2.9, 1.1, 0.4], cavolfiore: [25, 3.2, 2.7, 0.2], broccoli: [34, 2.8, 4.4, 0.4],
  cavolo_nero: [40, 3.3, 4.8, 0.7], verza: [27, 2.1, 3, 0.1], cavolo_cappuccio: [25, 1.3, 5.8, 0.1],
  finocchi: [15, 1.2, 1, 0.1], zucca: [18, 1.1, 3.5, 0.1], porri: [35, 2.1, 5.2, 0.1],
  carote: [35, 1.1, 7.6, 0.2], cipolla: [28, 1, 5.7, 0.1], patate: [77, 2, 17.5, 0.1],
  patate_dolci: [86, 1.6, 20, 0.1], sedano: [16, 0.7, 3, 0.2], funghi: [22, 3.1, 3.3, 0.3],
  limone: [29, 1.1, 9.3, 0.3], prezzemolo: [36, 3, 6, 0.8], basilico: [23, 3.2, 2.7, 0.6],
  zenzero: [80, 1.8, 18, 0.8],
  // frutta
  arance: [34, 0.7, 7.8, 0.2], banana: [89, 1.1, 23, 0.3], mela: [52, 0.3, 14, 0.2],
  pera: [57, 0.4, 15, 0.1], kiwi: [61, 1.1, 15, 0.5], uva: [69, 0.7, 18, 0.2],
  frutti_bosco: [45, 1, 10, 0.3], pesche: [39, 0.9, 10, 0.3], albicocche: [48, 1.4, 11, 0.4],
  ananas: [50, 0.5, 13, 0.1], mango: [60, 0.8, 15, 0.4], mandarini: [53, 0.8, 13, 0.3],
  fragole: [32, 0.7, 7.7, 0.3], cachi: [70, 0.6, 18, 0.2], frutta_mista: [50, 0.6, 12, 0.2],
  // pesce
  salmone: [190, 20, 0, 12], orata: [100, 20, 0, 2.5], merluzzo: [82, 17.8, 0, 0.7],
  pesce_spada: [121, 19.8, 0, 4.2], gamberi: [85, 18, 0.9, 0.6], calamari: [92, 15.6, 3.1, 1.4],
  tonno: [103, 23.6, 0, 0.8], sgombro: [160, 19, 0, 9],
  // carne e affettati
  pollo: [110, 23, 0, 1.5], tacchino: [107, 24, 0, 1], macinato: [176, 20, 0, 10],
  manzo: [120, 21, 0, 4], maiale: [120, 22, 0, 3.5],
  bresaola: [151, 32, 0, 2.6], prosciutto_cotto: [132, 19.8, 0.9, 5.6], fesa_affettata: [100, 20, 1, 1.5],
  // latticini e uova
  uova: [128, 12.4, 0, 8.7], albumi: [45, 10.7, 0.7, 0], mozzarella: [253, 18.7, 0.7, 19.5],
  mozzarella_sl: [253, 18.7, 0.7, 19.5], ricotta: [146, 8.8, 3.5, 10.9], ricotta_sl: [146, 8.8, 3.5, 10.9],
  feta: [264, 14, 4, 21], parmigiano: [392, 33, 0, 28], yogurt: [57, 10.3, 4, 0.4],
  yogurt_sl: [57, 10.3, 4, 0.4], yogurt_soia: [55, 4, 2.3, 2.6], latte: [46, 3.3, 4.9, 1.6],
  latte_sl: [46, 3.3, 4.9, 1.6], bevanda_soia: [33, 3.3, 0.6, 1.8],
  // pane e cereali (a crudo)
  pane: [224, 7.5, 48, 1.3], pane_gf: [250, 3, 50, 4], piadina: [300, 8, 48, 8], piadina_gf: [300, 4, 52, 8],
  fette_biscottate: [380, 12, 70, 6], gallette: [334, 9, 66, 1.5],
  pasta: [324, 13.4, 62.5, 2.5], pasta_gf: [355, 7, 78, 1.5], riso: [337, 7.5, 77, 1.9],
  farro: [335, 15, 67, 2.5], orzo: [319, 10.4, 73.7, 1.4], couscous: [350, 12, 70, 1.8],
  quinoa: [368, 14, 64, 6], grano_saraceno: [343, 13, 71, 3.4], miglio: [356, 11, 73, 4.2],
  avena: [372, 13, 60, 7], avena_gf: [372, 13, 60, 7], polenta: [362, 8.7, 79, 2.7],
  // legumi secchi
  ceci: [334, 20.9, 46.9, 6.3], fagioli: [291, 20.2, 47.5, 2], lenticchie: [291, 22.7, 51.1, 2.5],
  lenticchie_rosse: [318, 24, 50, 1.5], piselli: [72, 5.5, 9, 0.4],
  // proteine vegetali e integratori
  tofu: [120, 13, 1, 7], tempeh: [190, 19, 9, 10.8], seitan: [140, 25, 6, 2], burger_veg: [200, 15, 10, 11],
  proteine_polvere: [380, 80, 6, 5],
  // conserve, frutta secca, dolci, condimenti
  pelati: [22, 1.2, 3, 0.2], olive_verdi: [145, 1, 4, 15], marmellata: [200, 0.4, 50, 0],
  noci: [654, 14.3, 5.1, 68], semi_zucca: [559, 30, 10, 49], sesamo: [573, 18, 14, 50],
  tahina: [595, 17, 21, 54], olio: [899, 0, 0, 99.9], miele: [304, 0.3, 82, 0],
  sciroppo_acero: [260, 0, 67, 0], barretta: [380, 30, 35, 12],
};

// Peso medio di un pezzo, per gli ingredienti contati a pezzi
export const PIECE_WEIGHT = { uova: 55, limone: 100, piadina: 70, piadina_gf: 70, barretta: 50 };

// Ruolo nel piatto: serve per riproporzionare le ricette sulle grammature di un piano alimentare
export const CARB_IDS = [
  'pasta', 'pasta_gf', 'riso', 'farro', 'orzo', 'couscous', 'quinoa', 'grano_saraceno', 'miglio',
  'avena', 'avena_gf', 'polenta', 'pane', 'pane_gf', 'piadina', 'piadina_gf', 'fette_biscottate',
  'gallette', 'patate', 'patate_dolci',
];

// Tipologia proteica (per le equivalenze del piano: es. 100 g carne = 60 g legumi secchi)
export const PROTEIN_KIND = {
  pollo: 'carne', tacchino: 'carne', macinato: 'carne', manzo: 'carne', maiale: 'carne',
  salmone: 'pesce', orata: 'pesce', merluzzo: 'pesce', pesce_spada: 'pesce', gamberi: 'pesce',
  calamari: 'pesce', tonno: 'pesce', sgombro: 'pesce',
  bresaola: 'affettati', prosciutto_cotto: 'affettati', fesa_affettata: 'affettati',
  uova: 'uova', albumi: 'albume', tofu: 'tofu', tempeh: 'tempeh', seitan: 'seitan', burger_veg: 'burger_veg',
  ceci: 'legumi', fagioli: 'legumi', lenticchie: 'legumi', lenticchie_rosse: 'legumi',
  mozzarella: 'formaggi', mozzarella_sl: 'formaggi', ricotta: 'formaggi', ricotta_sl: 'formaggi', feta: 'formaggi',
  proteine_polvere: 'polvere',
};

export const FRUIT_IDS = [
  'arance', 'banana', 'mela', 'pera', 'kiwi', 'uva', 'frutti_bosco', 'pesche', 'albicocche',
  'ananas', 'mango', 'mandarini', 'fragole', 'cachi', 'frutta_mista',
];

// Grassi "pesce azzurro / grasso" (per la frequenza pesce azzurro vs bianco)
export const FATTY_FISH = ['salmone', 'sgombro', 'pesce_spada', 'tonno'];
