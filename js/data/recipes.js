// Database ricette. Quantità per 1 porzione (legumi e cereali a crudo).
//
// Campi:
//   p      proteina principale: legumi | pesce | carne_bianca | carne_rossa | uova | formaggi | vegetale
//   m      pasti adatti: 'P' pranzo, 'C' cena
//   port   adatta a essere portata al lavoro (schiscetta)
//   batch  si può cucinare doppia: la seconda porzione diventa il pranzo del giorno dopo
//   ahead  si può cucinare per intero in anticipo nella sessione di meal prep
//   keep   giorni di conservazione in frigo una volta cotta
//   fz     si può congelare
//   b      base di carboidrati (per la varietà)
//   t      tempo di preparazione in minuti (con le basi già pronte dal meal prep)
//   i      ingredienti { id: quantità }
//   d      ingredienti di dispensa
//   mp     attività di meal prep [chiave, ingrediente]
//   alt    alternativa senza pesce preferita (le ricette di pesce)

export const RECIPES = [
  // ===================== LEGUMI =====================
  {
    id: 'farro_ceci_zucchine', n: 'Insalata di farro, ceci, zucchine grigliate e pomodorini',
    p: 'legumi', m: 'PC', port: 1, batch: 1, b: 'farro', t: 15, keep: 3,
    i: { farro: 70, ceci: 50, zucchine: 150, pomodorini: 100, basilico: 5 }, d: ['olio', 'sale_pepe'],
    mp: [['griglia', 'zucchine']],
    s: 'Unisci farro e ceci già cotti alle zucchine grigliate e ai pomodorini tagliati. Condisci con olio, sale e basilico spezzettato.',
    tip: 'Prepara la sera prima; i pomodorini tagliali al mattino perché non rilascino acqua.',
  },
  {
    id: 'farro_ceci_zucca', n: 'Farro con ceci, zucca al forno e rucola',
    p: 'legumi', m: 'PC', port: 1, batch: 1, b: 'farro', t: 10, keep: 3,
    i: { farro: 70, ceci: 50, zucca: 200, rucola: 30 }, d: ['olio', 'sale_pepe', 'rosmarino'],
    mp: [['forno', 'zucca']],
    s: 'Mescola farro, ceci e zucca arrostita al rosmarino. Aggiungi la rucola e un filo d’olio a crudo.',
    tip: 'Ottimo anche a temperatura ambiente: tieni la rucola in un contenitorino a parte.',
  },
  {
    id: 'piadina_hummus', n: 'Piadina con hummus, carote e insalata',
    p: 'legumi', m: 'P', port: 1, b: 'pane', t: 5, keep: 1,
    i: { piadina: 1, ceci: 40, tahina: 10, limone: 0.25, carote: 80, lattuga: 50 }, d: ['olio', 'sale_pepe', 'aglio', 'cumino'],
    mp: [['hummus', 'ceci']],
    s: 'Spalma l’hummus sulla piadina, aggiungi carote grattugiate e insalata, arrotola.',
    tip: 'Arrotolala al mattino, oppure porta piadina e ripieno separati e componi al momento.',
  },
  {
    id: 'riso_lenticchie_sedano', n: 'Insalata di riso, lenticchie, sedano e carote',
    p: 'legumi', m: 'PC', port: 1, batch: 1, b: 'riso', t: 10, keep: 3,
    i: { riso: 70, lenticchie: 50, sedano: 50, carote: 80, prezzemolo: 5 }, d: ['olio', 'sale_pepe', 'aceto'],
    s: 'Unisci riso e lenticchie cotti a sedano e carote a cubetti. Condisci con olio, aceto e prezzemolo tritato.',
    tip: 'Migliora dopo qualche ora: perfetta preparata la sera prima.',
  },
  {
    id: 'couscous_ceci_peperoni', n: 'Cous cous con ceci, peperoni e cetrioli',
    p: 'legumi', m: 'PC', port: 1, batch: 1, b: 'couscous', t: 15, keep: 3,
    i: { couscous: 70, ceci: 50, peperoni: 150, cetrioli: 80, prezzemolo: 5, limone: 0.25 }, d: ['olio', 'sale_pepe', 'cumino'],
    mp: [['griglia', 'peperoni']],
    s: 'Reidrata il cous cous con acqua bollente salata (5 min), sgrana e unisci ceci, peperoni grigliati e cetrioli a cubetti. Limone, olio e prezzemolo.',
    tip: 'Il cous cous non si cuoce in anticipo: bastano 5 minuti la sera prima.',
  },
  {
    id: 'burger_lenticchie', n: 'Burger di lenticchie con insalata e pane',
    p: 'legumi', m: 'PC', port: 1, batch: 1, ahead: 1, fz: 1, b: 'pane', t: 30, keep: 3,
    i: { lenticchie: 70, carote: 50, cipolla: 20, lattuga: 60, pane: 50 }, d: ['pangrattato', 'olio', 'sale_pepe', 'paprika'],
    s: 'Frulla lenticchie cotte, carota e cipolla grattugiate e un cucchiaio di pangrattato. Forma 2 burger e cuocili in padella 4 min per lato.',
    tip: 'Buoni anche freddi: insalata e salsa in contenitori separati. Si congelano già cotti.',
  },
  {
    id: 'dal_lenticchie', n: 'Dal di lenticchie rosse e spinaci con riso basmati',
    p: 'legumi', m: 'PC', port: 1, batch: 1, ahead: 1, fz: 1, b: 'riso', t: 30, keep: 3,
    i: { lenticchie_rosse: 80, riso: 60, pelati: 150, cipolla: 40, zenzero: 5, spinaci: 80 }, d: ['curry', 'curcuma', 'olio', 'sale_pepe', 'aglio'],
    s: 'Soffriggi cipolla, aglio e zenzero con le spezie, aggiungi lenticchie, pelati e 300 ml d’acqua: 20 min. Negli ultimi 2 minuti unisci gli spinaci. Servi con riso.',
    tip: 'Si riscalda benissimo al microonde; si congela in porzioni.',
  },
  {
    id: 'zuppa_fagioli_cavolo_nero', n: 'Zuppa di fagioli e cavolo nero con crostini',
    p: 'legumi', m: 'C', batch: 1, ahead: 1, fz: 1, b: 'pane', t: 40, keep: 4,
    i: { fagioli: 70, cavolo_nero: 150, carote: 50, sedano: 40, cipolla: 30, pelati: 80, pane: 50 }, d: ['olio', 'sale_pepe', 'rosmarino', 'aglio'],
    s: 'Soffriggi carota, sedano e cipolla, aggiungi cavolo nero a striscioline, pelati, fagioli cotti e brodo: 25 min. Servi con pane tostato e olio a crudo.',
    tip: 'Il giorno dopo è ancora più buona: perfetta in thermos.',
  },
  {
    id: 'pasta_ceci', n: 'Pasta e ceci al rosmarino',
    p: 'legumi', m: 'C', b: 'pasta', t: 25, keep: 2,
    i: { pasta: 60, ceci: 60, pelati: 60, cipolla: 30 }, d: ['olio', 'sale_pepe', 'rosmarino', 'aglio'],
    s: 'Soffriggi cipolla e rosmarino, aggiungi ceci cotti e pelati, frulla metà dei ceci, allunga con acqua e cuoci la pasta direttamente nel sugo.',
  },
  {
    id: 'fagioli_patate_fagiolini', n: 'Insalata di fagioli, patate e fagiolini',
    p: 'legumi', m: 'PC', port: 1, batch: 1, b: 'patate', t: 20, keep: 3,
    i: { fagioli: 60, patate: 150, fagiolini: 150, cipolla: 20, prezzemolo: 5 }, d: ['olio', 'sale_pepe', 'aceto'],
    s: 'Lessa patate a cubetti e fagiolini, raffredda e unisci ai fagioli cotti e alla cipolla tritata. Olio, aceto e prezzemolo.',
    tip: 'Ottima fredda: si mantiene 2-3 giorni in frigo.',
  },
  {
    id: 'chili_fagioli', n: 'Chili di fagioli e verdure con riso',
    p: 'legumi', m: 'PC', port: 1, batch: 1, ahead: 1, fz: 1, b: 'riso', t: 35, keep: 4,
    i: { fagioli: 70, pelati: 150, cipolla: 50, carote: 60, riso: 60 }, d: ['paprika', 'cumino', 'peperoncino', 'olio', 'sale_pepe'],
    s: 'Soffriggi cipolla e carote a dadini con le spezie, aggiungi pelati e fagioli cotti: 20 min. Servi con il riso.',
    tip: 'Si riscalda e si congela benissimo.',
  },
  {
    id: 'minestrone_orzo', n: 'Minestrone di verdure invernali, fagioli e orzo',
    p: 'legumi', m: 'C', batch: 1, ahead: 1, fz: 1, b: 'orzo', t: 45, keep: 4,
    i: { orzo: 40, fagioli: 40, carote: 60, sedano: 40, patate: 80, verza: 100, porri: 50 }, d: ['olio', 'sale_pepe', 'brodo'],
    s: 'Soffriggi il porro, aggiungi le verdure a cubetti e il brodo: 30 min. Unisci fagioli e orzo già cotti negli ultimi 10 minuti.',
    tip: 'Prepararne di più conviene: si congela in porzioni.',
  },
  {
    id: 'vellutata_zucca_lenticchie', n: 'Vellutata di zucca e lenticchie rosse con crostini',
    p: 'legumi', m: 'C', batch: 1, ahead: 1, fz: 1, b: 'pane', t: 30, keep: 3,
    i: { zucca: 250, lenticchie_rosse: 50, cipolla: 30, pane: 50 }, d: ['olio', 'sale_pepe', 'brodo', 'curcuma'],
    s: 'Cuoci zucca a cubetti, cipolla e lenticchie rosse nel brodo per 20 min, frulla. Servi con crostini di pane e olio a crudo.',
  },
  {
    id: 'lenticchie_finocchi_arance', n: 'Insalata tiepida di lenticchie, finocchi, arance e noci',
    p: 'legumi', m: 'PC', port: 1, b: 'pane', t: 10, keep: 2,
    i: { lenticchie: 70, finocchi: 150, arance: 120, rucola: 30, noci: 10, pane: 40 }, d: ['olio', 'sale_pepe'],
    s: 'Affetta sottilmente il finocchio, aggiungi spicchi d’arancia, lenticchie cotte, rucola e noci. Condisci con olio e succo d’arancia.',
    tip: 'Taglia l’arancia la sera prima e conserva il finocchio in un contenitore chiuso.',
  },
  {
    id: 'ceci_spinaci', n: 'Ceci in umido con spinaci e pane integrale',
    p: 'legumi', m: 'PC', port: 1, batch: 1, ahead: 1, b: 'pane', t: 20, keep: 3,
    i: { ceci: 70, spinaci: 200, pelati: 100, cipolla: 30, pane: 50 }, d: ['olio', 'sale_pepe', 'cumino', 'aglio'],
    s: 'Soffriggi cipolla e aglio con il cumino, aggiungi pelati e ceci cotti: 10 min. Unisci gli spinaci e lasciali appassire.',
    tip: 'Si riscalda bene; porta il pane a parte.',
  },
  {
    id: 'pasta_broccoli_ceci', n: 'Pasta con broccoli e ceci',
    p: 'legumi', m: 'C', b: 'pasta', t: 20, keep: 2,
    i: { pasta: 70, broccoli: 200, ceci: 40 }, d: ['olio', 'sale_pepe', 'aglio', 'peperoncino'],
    s: 'Cuoci le cimette di broccoli con la pasta. Scola e salta in padella con olio, aglio, peperoncino e ceci cotti.',
  },
  {
    id: 'bowl_quinoa_ceci', n: 'Bowl di quinoa, ceci croccanti, carote e cavolo cappuccio',
    p: 'legumi', m: 'PC', port: 1, batch: 1, b: 'quinoa', t: 20, keep: 3,
    i: { quinoa: 70, ceci: 50, carote: 80, cavolo_cappuccio: 100, tahina: 10, limone: 0.25 }, d: ['olio', 'sale_pepe', 'paprika'],
    s: 'Tosta in padella i ceci cotti con paprika. Componi la bowl con quinoa, carote e cavolo a julienne. Salsa: tahina, limone e acqua.',
    tip: 'Salsa in un barattolino a parte; i ceci restano croccanti se aggiunti al momento.',
  },

  {
    id: 'orzo_lenticchie_carote', n: 'Orzo con lenticchie, carote e sedano',
    p: 'legumi', m: 'PC', port: 1, batch: 1, b: 'orzo', t: 15, keep: 3,
    i: { orzo: 70, lenticchie: 60, carote: 100, sedano: 50, prezzemolo: 5 }, d: ['olio', 'sale_pepe', 'rosmarino'],
    s: 'Salta carote e sedano a cubetti in padella con poca acqua e rosmarino (8 min), unisci orzo e lenticchie già cotti e un filo d’olio a crudo.',
    tip: 'Si mangia tiepida o a temperatura ambiente: comoda da preparare la sera prima.',
  },
  {
    id: 'pasta_zucca_ricotta', n: 'Pasta integrale con crema di zucca e ricotta',
    p: 'formaggi', m: 'C', b: 'pasta', t: 25,
    i: { pasta: 70, zucca: 200, ricotta: 80 }, d: ['olio', 'sale_pepe', 'rosmarino'],
    s: 'Cuoci la zucca a cubetti al vapore o in padella con poca acqua (12 min), frullala con la ricotta e condisci la pasta.',
  },
  {
    id: 'pasta_zucchine_ricotta', n: 'Pasta integrale con zucchine e ricotta',
    p: 'formaggi', m: 'C', b: 'pasta', t: 20,
    i: { pasta: 70, zucchine: 200, ricotta: 80, basilico: 5 }, d: ['olio', 'sale_pepe'],
    s: 'Cuoci le zucchine a rondelle in padella con un goccio d’acqua, unisci la ricotta e un po’ d’acqua di cottura, condisci la pasta con il basilico.',
  },

  // ===================== PESCE =====================
  {
    id: 'salmone_patate_broccoli', n: 'Salmone al forno con patate e broccoli',
    p: 'pesce', m: 'C', b: 'patate', t: 35,
    i: { salmone: 150, patate: 200, broccoli: 200, limone: 0.25 }, d: ['olio', 'sale_pepe'],
    s: 'Patate a spicchi in forno a 200 °C per 15 min, aggiungi broccoli e il salmone: altri 15 min. Limone a crudo.',
    alt: 'frittata_spinaci',
  },
  {
    id: 'orata_patate', n: 'Orata al forno con patate al limone e insalata',
    p: 'pesce', m: 'C', b: 'patate', t: 35,
    i: { orata: 180, patate: 200, limone: 0.5, lattuga: 80 }, d: ['olio', 'sale_pepe', 'rosmarino'],
    s: 'Patate a fette sottili in teglia con olio e rosmarino per 15 min; adagia sopra i filetti con fettine di limone e cuoci altri 12 min.',
    alt: 'frittata_patate',
  },
  {
    id: 'merluzzo_umido', n: 'Merluzzo in umido con pomodoro e olive, patate lesse',
    p: 'pesce', m: 'C', b: 'patate', t: 25,
    i: { merluzzo: 180, pelati: 150, patate: 200, prezzemolo: 5 }, d: ['olive', 'capperi', 'olio', 'aglio', 'sale_pepe'],
    s: 'Prepara un sughetto con aglio, pelati, olive e capperi (10 min), adagia il merluzzo e cuoci coperto 8 min. Prezzemolo e patate lesse a lato.',
    alt: 'uova_purgatorio',
  },
  {
    id: 'pasta_tonno_pomodorini', n: 'Pasta fredda con tonno, pomodorini e rucola',
    p: 'pesce', m: 'PC', port: 1, b: 'pasta', t: 15, keep: 2,
    i: { pasta: 70, tonno: 80, pomodorini: 120, rucola: 30 }, d: ['olive', 'olio', 'sale_pepe'],
    s: 'Cuoci la pasta, raffreddala sotto l’acqua e condisci con tonno, pomodorini, olive e rucola.',
    tip: 'La rucola aggiungila al mattino; la pasta condita con olio non si attacca.',
    alt: 'orzo_feta',
  },
  {
    id: 'fagioli_tonno', n: 'Insalata di fagioli, tonno e cipolla rossa con pane',
    p: 'pesce', m: 'PC', port: 1, b: 'pane', t: 5, keep: 2,
    i: { fagioli: 60, tonno: 80, cipolla: 30, lattuga: 60, pane: 50 }, d: ['olio', 'sale_pepe', 'aceto'],
    s: 'Unisci fagioli cotti, tonno sgocciolato e cipolla rossa affettata sottile. Condisci e servi su un letto di insalata.',
    tip: 'Insalata e pane a parte; il resto si prepara la sera prima.',
    alt: 'riso_lenticchie_sedano',
  },
  {
    id: 'couscous_gamberi', n: 'Cous cous con gamberi, zucchine e limone',
    p: 'pesce', m: 'PC', port: 1, b: 'couscous', t: 20, keep: 1,
    i: { couscous: 70, gamberi: 150, zucchine: 150, limone: 0.25, prezzemolo: 5 }, d: ['olio', 'aglio', 'sale_pepe'],
    s: 'Salta zucchine a cubetti e gamberi con aglio (5 min). Unisci al cous cous reidratato, limone e prezzemolo.',
    tip: 'Da consumare entro il giorno dopo; tienilo in borsa termica.',
    alt: 'couscous_ceci_peperoni',
  },
  {
    id: 'spada_caponata', n: 'Pesce spada alla griglia con caponata leggera',
    p: 'pesce', m: 'C', b: 'pane', t: 35,
    i: { pesce_spada: 160, melanzane: 150, peperoni: 80, pomodori: 80, cipolla: 30, pane: 40 }, d: ['capperi', 'olive', 'aceto', 'olio', 'sale_pepe'],
    s: 'Caponata: verdure a cubetti in padella 15 min, poi capperi, olive e un goccio d’aceto. Griglia il pesce spada 3 min per lato.',
    alt: 'parmigiana_light',
  },
  {
    id: 'riso_salmone_cetrioli', n: 'Bowl di riso con salmone, cetrioli, carote e sesamo',
    p: 'pesce', m: 'PC', port: 1, b: 'riso', t: 15, keep: 1,
    i: { riso: 70, salmone: 120, cetrioli: 100, carote: 60, sesamo: 5 }, d: ['soia', 'olio'],
    s: 'Cuoci il salmone in padella o al forno, sbriciolalo sul riso con cetrioli e carote a julienne, sesamo e salsa di soia.',
    tip: 'Si mangia fredda: cuoci il salmone la sera prima e tienila in borsa termica.',
    alt: 'bowl_quinoa_tofu',
  },
  {
    id: 'farro_salmone_finocchi', n: 'Farro con salmone, finocchi e limone',
    p: 'pesce', m: 'PC', port: 1, b: 'farro', t: 20, keep: 1,
    i: { farro: 70, salmone: 120, finocchi: 150, limone: 0.25, rucola: 30 }, d: ['olio', 'sale_pepe'],
    s: 'Cuoci il salmone al forno (12 min), sbriciolalo sul farro con finocchio a fettine sottili, rucola, scorza e succo di limone.',
    tip: 'Prepara la sera prima e conserva in frigo; tieni in borsa termica.',
    alt: 'lenticchie_finocchi_arance',
  },
  {
    id: 'merluzzo_cavolfiore', n: 'Merluzzo gratinato con cavolfiore al forno',
    p: 'pesce', m: 'C', b: 'pane', t: 30,
    i: { merluzzo: 180, cavolfiore: 250, prezzemolo: 5, pane: 40 }, d: ['pangrattato', 'olio', 'sale_pepe', 'aglio'],
    mp: [['forno', 'cavolfiore']],
    s: 'Copri i filetti con pangrattato, prezzemolo, aglio e olio; forno a 200 °C per 12-15 min insieme al cavolfiore già arrostito.',
    alt: 'frittata_spinaci',
  },
  {
    id: 'calamari_piselli', n: 'Calamari in umido con piselli e pane',
    p: 'pesce', m: 'C', b: 'pane', t: 35,
    i: { calamari: 180, piselli: 100, pelati: 100, cipolla: 30, pane: 50 }, d: ['olio', 'sale_pepe', 'aglio'],
    s: 'Soffriggi cipolla e aglio, aggiungi i calamari ad anelli, poi pelati e piselli: 25 min a fuoco basso.',
    alt: 'uova_purgatorio',
  },
  {
    id: 'patate_sgombro', n: 'Insalata di patate, sedano e sgombro con olive',
    p: 'pesce', m: 'PC', port: 1, b: 'patate', t: 20, keep: 2,
    i: { patate: 200, sgombro: 125, sedano: 60, prezzemolo: 5 }, d: ['olive', 'olio', 'sale_pepe', 'aceto'],
    s: 'Lessa le patate a cubetti, raffreddale e unisci sgombro sgocciolato, sedano a fettine, olive e prezzemolo.',
    tip: 'Si conserva bene 2 giorni: comoda da preparare la sera prima.',
    alt: 'frittata_patate',
  },

  // ===================== CARNE BIANCA =====================
  {
    id: 'pollo_curry', n: 'Pollo al curry con carote e riso basmati',
    p: 'carne_bianca', m: 'PC', port: 1, batch: 1, ahead: 1, fz: 1, b: 'riso', t: 25, keep: 3,
    i: { pollo: 150, riso: 60, cipolla: 40, carote: 80, yogurt: 40 }, d: ['curry', 'olio', 'sale_pepe'],
    s: 'Rosola cipolla e pollo a bocconcini, aggiungi carote a rondelle, curry e un po’ d’acqua: 15 min. Fuori dal fuoco manteca con lo yogurt. Servi con riso.',
    tip: 'Si riscalda bene al microonde.',
  },
  {
    id: 'piadina_pollo', n: 'Piadina con pollo grigliato, rucola e pomodorini',
    p: 'carne_bianca', m: 'P', port: 1, b: 'pane', t: 10, keep: 1,
    i: { piadina: 1, pollo: 120, rucola: 30, pomodorini: 100 }, d: ['olio', 'sale_pepe'],
    s: 'Griglia il pollo a fettine, farcisci la piadina con pollo, rucola e pomodorini.',
    tip: 'Griglia il pollo la sera prima; componi la piadina al mattino.',
  },
  {
    id: 'pollo_finocchi_arance', n: 'Insalata di pollo, finocchi, arance e noci',
    p: 'carne_bianca', m: 'PC', port: 1, b: 'pane', t: 15, keep: 2,
    i: { pollo: 130, finocchi: 150, arance: 120, noci: 15, lattuga: 50, pane: 50 }, d: ['olio', 'sale_pepe'],
    s: 'Griglia il pollo e taglialo a striscioline; unisci finocchio affettato, spicchi d’arancia, insalata e noci.',
    tip: 'Condisci al momento; pane a parte.',
  },
  {
    id: 'tacchino_limone_spinaci', n: 'Scaloppine di tacchino al limone con spinaci e patate',
    p: 'carne_bianca', m: 'C', b: 'patate', t: 30,
    i: { tacchino: 150, limone: 0.5, spinaci: 200, patate: 150 }, d: ['farina', 'olio', 'sale_pepe', 'aglio'],
    s: 'Infarina le fettine e cuocile in padella 2 min per lato, sfuma con il succo di limone. Spinaci saltati con aglio e patate lesse.',
  },
  {
    id: 'pollo_arrosto_patate', n: 'Pollo arrosto con patate al rosmarino e insalata',
    p: 'carne_bianca', m: 'PC', b: 'patate', t: 40,
    i: { pollo: 150, patate: 200, lattuga: 80 }, d: ['rosmarino', 'olio', 'sale_pepe', 'aglio'],
    s: 'Pollo a pezzi e patate a spicchi in teglia con rosmarino e aglio, 200 °C per 35 min. Insalata a lato.',
  },
  {
    id: 'polpette_tacchino', n: 'Polpette di tacchino al sugo con pane',
    p: 'carne_bianca', m: 'PC', port: 1, batch: 1, ahead: 1, fz: 1, b: 'pane', t: 35, keep: 3,
    i: { tacchino: 130, uova: 1, parmigiano: 10, pelati: 150, pane: 50 }, d: ['pangrattato', 'olio', 'sale_pepe', 'origano'],
    mp: [['sugo', 'pelati']],
    s: 'Impasta il macinato di tacchino con uovo, parmigiano e pangrattato, forma le polpette e cuocile 15 min nel sugo di pomodoro.',
    tip: 'Si riscaldano bene e si congelano già cotte nel sugo.',
  },
  {
    id: 'riso_pollo_broccoli', n: 'Bowl di riso, pollo e broccoli al sesamo',
    p: 'carne_bianca', m: 'PC', port: 1, batch: 1, b: 'riso', t: 20, keep: 3,
    i: { riso: 70, pollo: 130, broccoli: 200, sesamo: 5 }, d: ['soia', 'olio', 'aglio'],
    s: 'Salta il pollo a bocconcini e i broccoli sbollentati con aglio e salsa di soia. Servi sul riso con il sesamo.',
    tip: 'Si riscalda al microonde in 2 minuti.',
  },
  {
    id: 'tacchino_zucchine_couscous', n: 'Straccetti di tacchino con zucchine e cous cous',
    p: 'carne_bianca', m: 'PC', port: 1, b: 'couscous', t: 20, keep: 2,
    i: { couscous: 70, tacchino: 130, zucchine: 200, limone: 0.25 }, d: ['olio', 'sale_pepe', 'origano'],
    s: 'Salta zucchine a julienne e tacchino a striscioline con origano, sfuma con limone e unisci al cous cous.',
    tip: 'Buono anche tiepido o freddo.',
  },

  {
    id: 'riso_pollo_zucchine', n: 'Insalata di riso con pollo, zucchine e carote',
    p: 'carne_bianca', m: 'PC', port: 1, batch: 1, b: 'riso', t: 20, keep: 2,
    i: { riso: 70, pollo: 120, zucchine: 150, carote: 60 }, d: ['olio', 'sale_pepe', 'origano'],
    mp: [['griglia', 'zucchine']],
    s: 'Cuoci il pollo alla piastra e taglialo a cubetti; unisci al riso con zucchine grigliate e carote a julienne.',
    tip: 'Si mangia fredda: prepara la sera prima e condisci al mattino.',
  },
  {
    id: 'tacchino_forno_finocchi', n: 'Tacchino al forno con patate e finocchi',
    p: 'carne_bianca', m: 'C', b: 'patate', t: 35,
    i: { tacchino: 150, patate: 200, finocchi: 200 }, d: ['olio', 'sale_pepe', 'rosmarino'],
    s: 'In teglia patate e finocchi a spicchi con rosmarino per 20 min a 200 °C, aggiungi le fettine di tacchino e cuoci altri 10 min.',
  },

  // ===================== CARNE ROSSA =====================
  {
    id: 'hamburger_patate', n: 'Hamburger di manzo con patate al forno e insalata',
    p: 'carne_rossa', m: 'C', b: 'patate', t: 35,
    i: { macinato: 150, patate: 200, lattuga: 60 }, d: ['olio', 'sale_pepe', 'rosmarino'],
    s: 'Patate a spicchi in forno 30 min. Forma l’hamburger e cuocilo in padella ben calda 3-4 min per lato.',
  },
  {
    id: 'straccetti_manzo_rucola', n: 'Straccetti di manzo con rucola, pomodorini e scaglie di parmigiano',
    p: 'carne_rossa', m: 'C', b: 'pane', t: 15,
    i: { manzo: 150, rucola: 50, pomodorini: 100, parmigiano: 15, pane: 50 }, d: ['olio', 'sale_pepe', 'aceto'],
    s: 'Cuoci gli straccetti in padella rovente 2 min; servili su rucola e pomodorini con scaglie di parmigiano e un filo di aceto balsamico.',
  },
  {
    id: 'spezzatino_piselli', n: 'Spezzatino di manzo con piselli e patate',
    p: 'carne_rossa', m: 'PC', port: 1, batch: 1, ahead: 1, fz: 1, b: 'patate', t: 90, keep: 3,
    i: { manzo: 150, piselli: 80, patate: 150, cipolla: 30, carote: 50, pelati: 50 }, d: ['olio', 'sale_pepe', 'brodo', 'rosmarino'],
    s: 'Rosola la carne a cubetti, aggiungi cipolla, carota e pelati, copri con brodo e cuoci 1 ora; aggiungi patate e piselli per gli ultimi 25 min.',
    tip: 'Cucinalo nel weekend: si riscalda benissimo e si congela.',
  },
  {
    id: 'maiale_verza', n: 'Lonza di maiale con verza stufata e patate',
    p: 'carne_rossa', m: 'C', b: 'patate', t: 35,
    i: { maiale: 150, verza: 200, patate: 150 }, d: ['olio', 'sale_pepe', 'aglio', 'aceto'],
    s: 'Stufa la verza a striscioline con aglio e un goccio d’aceto (20 min). Cuoci le fette di lonza in padella 3 min per lato. Patate lesse a lato.',
  },
  {
    id: 'pasta_ragu', n: 'Pasta al ragù di manzo',
    p: 'carne_rossa', m: 'C', b: 'pasta', t: 20,
    i: { pasta: 80, macinato: 100, pelati: 150, carote: 30, sedano: 30, cipolla: 30 }, d: ['olio', 'sale_pepe'],
    s: 'Soffritto di carota, sedano e cipolla, rosola il macinato, aggiungi i pelati e cuoci almeno 40 min (meglio nel weekend). Condisci la pasta.',
  },

  // ===================== AFFETTATI MAGRI =====================
  {
    id: 'piadina_bresaola', n: 'Piadina con bresaola, rucola e scaglie di grana',
    p: 'affettati', m: 'P', port: 1, b: 'pane', t: 5, keep: 1,
    i: { piadina: 1, bresaola: 80, rucola: 40, parmigiano: 10, limone: 0.25 }, d: ['olio', 'sale_pepe'],
    s: 'Farcisci la piadina con bresaola, rucola condita con limone e olio, scaglie di grana. Arrotola.',
    tip: 'Rucola in un contenitorino a parte: componi al momento e la piadina resta asciutta.',
  },
  {
    id: 'bresaola_rucola', n: 'Carpaccio di bresaola con rucola, grana e pane integrale',
    p: 'affettati', m: 'C', b: 'pane', t: 10,
    i: { bresaola: 80, rucola: 60, parmigiano: 15, limone: 0.25, pane: 60 }, d: ['olio', 'sale_pepe'],
    s: 'Disponi la bresaola, condisci con limone e olio, copri con rucola e scaglie di grana. Pane a lato.',
  },
  {
    id: 'cotto_patate', n: 'Prosciutto cotto con patate al forno e insalata',
    p: 'affettati', m: 'PC', port: 1, b: 'patate', t: 35, keep: 2,
    i: { prosciutto_cotto: 100, patate: 250, lattuga: 80 }, d: ['olio', 'sale_pepe', 'rosmarino'],
    s: 'Patate a spicchi in forno a 200 °C per 30 min con rosmarino. Servi con prosciutto cotto e insalata.',
    tip: 'Le patate si cuociono nella sessione di meal prep: sono buone anche a temperatura ambiente.',
  },
  {
    id: 'riso_tacchino_affettato', n: 'Insalata di riso con fesa di tacchino, zucchine e pomodorini',
    p: 'affettati', m: 'PC', port: 1, b: 'riso', t: 10, keep: 2,
    i: { riso: 70, fesa_affettata: 100, zucchine: 150, pomodorini: 100 }, d: ['olio', 'sale_pepe', 'origano'],
    mp: [['griglia', 'zucchine']],
    s: 'Unisci al riso cotto la fesa di tacchino a striscioline, le zucchine grigliate e i pomodorini.',
    tip: 'Si prepara la sera prima; condisci con olio al mattino.',
  },

  {
    id: 'merluzzo_cartoccio_carote', n: 'Merluzzo al cartoccio con patate e carote',
    p: 'pesce', m: 'C', b: 'patate', t: 30,
    i: { merluzzo: 180, patate: 200, carote: 120, prezzemolo: 5 }, d: ['olio', 'sale_pepe'],
    s: 'Chiudi il merluzzo in un cartoccio con prezzemolo e un filo d’olio; forno a 190 °C per 15 min insieme a patate e carote a rondelle.',
    alt: 'frittata_patate',
  },

  // ===================== UOVA =====================
  {
    id: 'frittata_zucchine', n: 'Frittata di zucchine con pane integrale',
    p: 'uova', m: 'PC', port: 1, ahead: 1, b: 'pane', t: 20, keep: 2,
    i: { uova: 2, zucchine: 200, parmigiano: 10, pane: 50, basilico: 5 }, d: ['olio', 'sale_pepe'],
    s: 'Salta le zucchine a rondelle 5 min, versa le uova sbattute con parmigiano e basilico, cuoci coperto a fuoco basso 10 min.',
    tip: 'La frittata fredda è un classico da schiscetta: a spicchi o in un panino.',
  },
  {
    id: 'frittata_spinaci', n: 'Frittata al forno con spinaci e parmigiano',
    p: 'uova', m: 'PC', port: 1, ahead: 1, b: 'pane', t: 25, keep: 2,
    i: { uova: 2, spinaci: 200, parmigiano: 10, pane: 50 }, d: ['olio', 'sale_pepe', 'aglio'],
    s: 'Salta gli spinaci con aglio, mescolali alle uova sbattute col parmigiano e cuoci in forno a 180 °C per 15 min.',
    tip: 'Si taglia a quadrotti e si porta fredda.',
  },
  {
    id: 'frittata_patate', n: 'Frittata di patate e cipolle con insalata',
    p: 'uova', m: 'PC', port: 1, ahead: 1, b: 'patate', t: 30, keep: 2,
    i: { uova: 2, patate: 150, cipolla: 50, lattuga: 80 }, d: ['olio', 'sale_pepe'],
    s: 'Cuoci in padella patate a fettine sottili e cipolla 15 min, aggiungi le uova sbattute e cuoci coperto 8 min.',
    tip: 'Ottima fredda; insalata in un contenitore a parte.',
  },
  {
    id: 'uova_purgatorio', n: 'Uova in purgatorio con pane integrale',
    p: 'uova', m: 'C', b: 'pane', t: 20,
    i: { uova: 2, pelati: 200, pane: 70 }, d: ['olio', 'sale_pepe', 'aglio', 'origano'],
    s: 'Cuoci i pelati con aglio e origano 10 min, crea due incavi e rompi le uova; coperchio e 6-8 min a fuoco basso. Servi con pane per la scarpetta.',
  },
  {
    id: 'riso_uova_piselli', n: 'Insalata di riso con uova sode, piselli e carote',
    p: 'uova', m: 'PC', port: 1, b: 'riso', t: 15, keep: 2,
    i: { riso: 70, uova: 2, piselli: 60, carote: 60 }, d: ['olio', 'sale_pepe'],
    s: 'Unisci al riso cotto i piselli sbollentati, le carote a cubetti e le uova sode a spicchi.',
    tip: 'Le uova sode si cuociono insieme ai piselli: 9 minuti.',
  },

  // ===================== FORMAGGI =====================
  {
    id: 'farro_caprese', n: 'Insalata di farro, mozzarella, pomodorini e basilico',
    p: 'formaggi', m: 'PC', port: 1, b: 'farro', t: 10, keep: 2,
    i: { farro: 70, mozzarella: 125, pomodorini: 150, basilico: 5 }, d: ['olio', 'sale_pepe', 'origano'],
    s: 'Unisci al farro cotto i pomodorini e la mozzarella a cubetti, basilico, olio e origano.',
    tip: 'Taglia la mozzarella e lasciala scolare: così l’insalata non si inzuppa.',
  },
  {
    id: 'pasta_ricotta_spinaci', n: 'Pasta con ricotta, spinaci e noci',
    p: 'formaggi', m: 'C', b: 'pasta', t: 20,
    i: { pasta: 80, ricotta: 100, spinaci: 150, noci: 10 }, d: ['olio', 'sale_pepe', 'aglio'],
    s: 'Salta gli spinaci con aglio, frullali con la ricotta e un po’ d’acqua di cottura; condisci la pasta e completa con noci tritate.',
  },
  {
    id: 'parmigiana_light', n: 'Parmigiana leggera di melanzane al forno',
    p: 'formaggi', m: 'PC', port: 1, batch: 1, ahead: 1, fz: 1, b: 'pane', t: 45, keep: 3,
    i: { melanzane: 300, mozzarella: 125, pelati: 150, parmigiano: 15, basilico: 5, pane: 50 }, d: ['olio', 'sale_pepe'],
    mp: [['griglia', 'melanzane'], ['sugo', 'pelati']],
    s: 'Alterna in una pirofila melanzane grigliate, sugo, mozzarella e parmigiano. Forno a 190 °C per 25 min.',
    tip: 'Il giorno dopo è anche più buona; si riscalda al microonde.',
  },
  {
    id: 'orzo_feta', n: 'Insalata di orzo, feta, cetrioli e pomodori',
    p: 'formaggi', m: 'PC', port: 1, batch: 1, b: 'orzo', t: 10, keep: 3,
    i: { orzo: 70, feta: 70, cetrioli: 100, pomodori: 120 }, d: ['olive', 'origano', 'olio', 'sale_pepe'],
    s: 'Unisci all’orzo cotto cetrioli e pomodori a cubetti, feta sbriciolata, olive e origano.',
    tip: 'Regge benissimo 2-3 giorni in frigo.',
  },
  {
    id: 'quinoa_zucca_feta', n: 'Quinoa con zucca al forno, feta e semi di zucca',
    p: 'formaggi', m: 'PC', port: 1, batch: 1, b: 'quinoa', t: 10, keep: 3,
    i: { quinoa: 70, zucca: 200, feta: 60, semi_zucca: 10, rucola: 30 }, d: ['olio', 'sale_pepe'],
    mp: [['forno', 'zucca']],
    s: 'Unisci quinoa, zucca arrostita, feta sbriciolata e rucola. Completa con i semi di zucca tostati.',
    tip: 'Buona fredda o tiepida; semi a parte per mantenerli croccanti.',
  },
  {
    id: 'risotto_zucca', n: 'Risotto alla zucca e rosmarino',
    p: 'formaggi', m: 'C', b: 'riso', t: 30,
    i: { riso: 80, zucca: 200, cipolla: 30, parmigiano: 20 }, d: ['brodo', 'olio', 'rosmarino', 'sale_pepe'],
    s: 'Rosola cipolla e zucca a cubetti, tosta il riso e porta a cottura con il brodo (18 min). Manteca con parmigiano.',
  },
  {
    id: 'risotto_funghi', n: 'Risotto ai funghi e prezzemolo',
    p: 'formaggi', m: 'C', b: 'riso', t: 30,
    i: { riso: 80, funghi: 200, cipolla: 30, parmigiano: 20, prezzemolo: 5 }, d: ['brodo', 'olio', 'aglio', 'sale_pepe'],
    s: 'Trifola i funghi con aglio e prezzemolo. Tosta il riso con la cipolla, cuoci col brodo, unisci i funghi e manteca col parmigiano.',
  },

  // ===================== PROTEINE VEGETALI =====================
  {
    id: 'tofu_broccoli_riso', n: 'Tofu saltato con broccoli, carote e riso basmati',
    p: 'vegetale', m: 'PC', port: 1, batch: 1, b: 'riso', t: 20, keep: 3,
    i: { tofu: 150, riso: 60, broccoli: 150, carote: 60, zenzero: 5 }, d: ['soia', 'olio', 'aglio'],
    s: 'Rosola il tofu a cubetti finché dorato, aggiungi broccoli sbollentati, carote e zenzero, sfuma con salsa di soia. Servi col riso.',
    tip: 'Si riscalda bene; il tofu resta saporito anche freddo.',
  },
  {
    id: 'tofu_peperoni_couscous', n: 'Tofu croccante con peperoni, zucchine e cous cous',
    p: 'vegetale', m: 'PC', port: 1, batch: 1, b: 'couscous', t: 20, keep: 3,
    i: { tofu: 150, couscous: 60, peperoni: 100, zucchine: 120 }, d: ['soia', 'olio', 'paprika'],
    s: 'Infarina il tofu a cubetti con amido o farina e paprika, rosolalo in padella. Unisci peperoni e zucchine saltati e il cous cous.',
    tip: 'Ottimo anche freddo, come insalata.',
  },
  {
    id: 'tempeh_verza', n: 'Tempeh glassato alla soia con verza saltata e riso',
    p: 'vegetale', m: 'PC', port: 1, batch: 1, b: 'riso', t: 25, keep: 3,
    i: { tempeh: 120, verza: 200, riso: 60 }, d: ['soia', 'olio', 'aglio', 'sciroppo_acero'],
    s: 'Taglia il tempeh a fette, rosolalo e glassalo con soia e un cucchiaino di sciroppo d’acero. Salta la verza con aglio. Servi col riso.',
    tip: 'Si riscalda al microonde in 2 minuti.',
  },
  {
    id: 'tofu_strapazzato', n: 'Tofu strapazzato con spinaci e pane tostato',
    p: 'vegetale', m: 'C', b: 'pane', t: 15,
    i: { tofu: 150, spinaci: 150, pane: 60 }, d: ['curcuma', 'olio', 'sale_pepe', 'lievito'],
    s: 'Sbriciola il tofu in padella con curcuma e lievito alimentare, aggiungi gli spinaci e cuoci 5 min. Servi su pane tostato.',
  },
  {
    id: 'seitan_funghi', n: 'Seitan ai funghi con purè di patate',
    p: 'vegetale', m: 'C', b: 'patate', t: 30,
    i: { seitan: 150, funghi: 150, patate: 200, prezzemolo: 5 }, d: ['olio', 'aglio', 'sale_pepe'],
    s: 'Trifola i funghi con aglio, aggiungi il seitan a straccetti e cuoci 5 min. Purè: patate lesse schiacciate con olio e acqua di cottura.',
  },
  {
    id: 'bowl_quinoa_tofu', n: 'Bowl di quinoa con tofu marinato, carote e cetrioli',
    p: 'vegetale', m: 'PC', port: 1, batch: 1, b: 'quinoa', t: 15, keep: 3,
    i: { quinoa: 70, tofu: 150, carote: 70, cetrioli: 100, sesamo: 5, zenzero: 5 }, d: ['soia', 'olio'],
    s: 'Marina il tofu a cubetti in soia per 15 min e rosolalo. Componi con quinoa, carote e cetrioli a julienne, sesamo.',
    tip: 'Si mangia fredda: perfetta da preparare la sera prima.',
  },
  {
    id: 'tofu_forno_patate_dolci', n: 'Tofu al forno con patate americane e cavolfiore',
    p: 'vegetale', m: 'PC', port: 1, batch: 1, b: 'patate', t: 35, keep: 3,
    i: { tofu: 150, patate_dolci: 200, cavolfiore: 200 }, d: ['olio', 'sale_pepe', 'curcuma', 'rosmarino'],
    mp: [['forno', 'cavolfiore']],
    s: 'In teglia tofu a cubetti, patate americane e cavolfiore con curcuma e rosmarino: 200 °C per 30 min, girando a metà.',
    tip: 'Si riscalda bene; ottimo anche tiepido.',
  },
  {
    id: 'tempeh_zucca_cavolo_nero', n: 'Tempeh al forno con zucca e cavolo nero',
    p: 'vegetale', m: 'C', b: 'pane', t: 35,
    i: { tempeh: 120, zucca: 200, cavolo_nero: 150, pane: 40 }, d: ['olio', 'sale_pepe', 'rosmarino', 'soia'],
    mp: [['forno', 'zucca']],
    s: 'In teglia tempeh a cubetti con soia, zucca e cavolo nero a striscioline: 200 °C per 25 min. Pane a lato.',
  },
];

// Pasto libero previsto dal piano alimentare: non genera spesa né calcoli nutrizionali
export const FREE_MEAL = {
  id: 'libero', n: 'Pasto libero', p: 'libero', m: 'C', b: 'libero', t: 0, i: {}, d: [],
  s: 'Goditi un pasto a tua scelta, senza sensi di colpa: fa parte del piano.',
};

// Colazioni: se ne scelgono due e si alternano (meno ingredienti, meno sprechi)
export const BREAKFASTS = [
  // dolci
  { id: 'b_yogurt', n: 'Yogurt greco con fiocchi d’avena, frutta e noci', i: { yogurt: 170, avena: 30, noci: 10 } },
  { id: 'b_porridge', n: 'Porridge d’avena con latte, cannella e frutta', i: { avena: 40, latte: 200 }, d: ['cannella'] },
  { id: 'b_pane_ricotta', n: 'Pane integrale tostato con ricotta e miele', i: { pane: 60, ricotta: 60 }, d: ['miele'] },
  { id: 'b_pane_tahina', n: 'Pane tostato con tahina, miele e frutta', i: { pane: 60, tahina: 15 }, d: ['miele'] },
  // salate
  { id: 'b_uova_pane', style: 'salata', n: 'Uova strapazzate con pane integrale tostato', i: { uova: 2, pane: 50 } },
  { id: 'b_toast_cotto', style: 'salata', n: 'Toast integrale con prosciutto cotto e un frutto', i: { pane: 60, prosciutto_cotto: 50, mela: 150 } },
  { id: 'b_pane_bresaola', style: 'salata', n: 'Pane integrale con bresaola e un filo d’olio', i: { pane: 60, bresaola: 40 }, d: ['olio'] },
  { id: 'b_omelette_albumi', style: 'salata', n: 'Omelette di albumi con gallette integrali', i: { albumi: 150, gallette: 30, parmigiano: 5 } },
  { id: 'b_ricotta_salata', style: 'salata', n: 'Pane integrale con ricotta, olio e origano', i: { pane: 60, ricotta: 80 }, d: ['olio', 'origano'] },
  { id: 'b_hummus_toast', style: 'salata', n: 'Pane tostato con hummus e carote', i: { pane: 60, ceci: 30, tahina: 10, carote: 60 } },
  { id: 'b_tofu_toast', style: 'salata', n: 'Tofu strapazzato alla curcuma su pane tostato', i: { tofu: 100, pane: 50 }, d: ['curcuma'] },
];
