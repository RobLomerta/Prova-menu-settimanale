// Attività di meal prep. "keep" = giorni di conservazione in frigo del preparato.

export const PREP_TASKS = {
  legumi: {
    title: 'Cuoci i legumi',
    icon: '🫘',
    keep: 4,
    intro: 'Pesi a crudo. Cuoci senza sale, sala a fine cottura; raffredda e conserva con un po’ della loro acqua in contenitori ermetici. Si congelano benissimo (3 mesi).',
    how: {
      ceci: 'ammollo 12 h (dalla sera prima), poi 1 h 30 – 2 h (30 min in pentola a pressione)',
      fagioli: 'ammollo 12 h (dalla sera prima), poi 1 h – 1 h 30 (25 min in pentola a pressione)',
      lenticchie: 'nessun ammollo, 25-35 min',
    },
    fallback: 'Poco tempo? 100 g di legumi secchi ≈ 1 vasetto da 240 g di legumi già cotti (sgocciolati).',
  },
  cereali: {
    title: 'Cuoci i cereali',
    icon: '🌾',
    keep: 4,
    keepBy: { riso: 3 },
    intro: 'Pesi a crudo. Cuoci in acqua salata, scola, allarga su un vassoio per raffreddarli in fretta, condisci con un filo d’olio e chiudi in contenitori ermetici.',
    how: {
      farro: '25-30 min',
      orzo: '30-35 min',
      riso: '12-40 min secondo la varietà (raffreddalo subito, si conserva 3 giorni)',
      quinoa: 'sciacquala bene, 15 min (2 parti d’acqua)',
      grano_saraceno: '15-20 min',
      miglio: '15-20 min (2,5 parti d’acqua)',
    },
  },
  forno: {
    title: 'Verdure al forno',
    icon: '🔥',
    keep: 4,
    intro: 'Taglia a cubetti, condisci con olio, sale e spezie e arrostisci tutto in un’unica teglia a 200 °C per 25-35 min.',
  },
  griglia: {
    title: 'Verdure grigliate',
    icon: '♨️',
    keep: 3,
    intro: 'Affetta e griglia su piastra ben calda; condisci solo con olio e sale. Conserva in un contenitore di vetro.',
  },
  lava: {
    title: 'Verdure a foglia',
    icon: '🥬',
    keep: 4,
    intro: 'Lava, asciuga bene con la centrifuga e conserva in un contenitore con un foglio di carta assorbente: rimane croccante 4 giorni.',
  },
  hummus: {
    title: 'Hummus',
    icon: '🥣',
    keep: 4,
    intro: 'Frulla i ceci cotti con tahina, succo di limone, mezzo spicchio d’aglio, cumino, sale e poca acqua di cottura fino a renderlo cremoso.',
  },
  sugo: {
    title: 'Sugo di pomodoro base',
    icon: '🍅',
    keep: 4,
    intro: 'Aglio e olio, pelati, sale e basilico: 20 min a fuoco basso. Si congela in porzioni.',
  },
};
