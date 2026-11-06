# 🥗 Menù settimanale

Web app che, dato un regime alimentare, costruisce il **menù della settimana** (pranzo e cena, più le colazioni), la **lista della spesa** e un **piano di meal prep**, pensata per **una persona**.

## Cosa fa

| Obiettivo | Come lo affronta |
|---|---|
| **Varietà** | 96 ricette (più quelle che salvi tu); nessun piatto ripetuto (salvo gli avanzi voluti); fonti proteiche bilanciate sulla settimana secondo il regime (es. mediterranea: 4 legumi, 3 pesce, 2 carne bianca, 1 rossa, 2 uova, 2 formaggi); stessa proteina o stessa base (pasta, riso…) mai a pranzo e cena dello stesso giorno. |
| **Pranzi pratici lun-ven** | Nei giorni lavorativi il pranzo è sempre un piatto da portare (🎒): insalate di cereali, bowl, piadine, frittate, piatti che si riscaldano. Ogni ricetta ha un consiglio per la schiscetta. |
| **Meal prep** | Sessione della domenica e mini sessione del mercoledì: cereali e legumi da cuocere (con quantità totali a crudo e cotte), verdure da arrostire o grigliare, insalata da lavare, sughi, hummus, piatti da cucinare interi. Più un promemoria serale "prepara la schiscetta di domani". Opzione **cene doppie**: la seconda porzione diventa il pranzo del giorno dopo. |
| **Spesa per 1 persona** | L'ottimizzatore tiene conto delle confezioni reali (mozzarella 125 g, rucola 100 g, cavolfiore intero…) e preferisce ricette che finiscano le confezioni aperte. La lista indica quante confezioni comprare, quanto ne serve e gli eventuali avanzi deperibili con un'idea per usarli. |
| **Alimenti freschi** | Stagionalità mese per mese (frutta e verdura fuori stagione penalizzate); opzione **due spese** (weekend + mercoledì): i prodotti molto deperibili come pesce e carne vengono comprati a metà settimana; avvisi quando conviene il surgelato. |
| **Alternativa al pesce** | Ogni pasto di pesce mostra un'alternativa senza pesce compatibile (anche trasportabile se è un pranzo di lavoro). Basta un interruttore — o "Tutto senza pesce" — e la lista della spesa si aggiorna. |

### Novità: piano alimentare, calorie e laboratorio

| Funzione | Cosa fa |
|---|---|
| **📄 Allega il piano alimentare** | Carica il PDF (o un TXT, o incolla il testo) del piano del nutrizionista. L'app riconosce pasti, righe di alternative ("/"), grammature (anche "10-15 g", "un cucchiaio"), la regola di sostituzione dei legumi e i totali (kcal, proteine, carboidrati, grassi). Tutto è modificabile in un editor con gli alimenti riconosciuti evidenziati e gli eventuali refusi segnalati. Il PDF viene letto **solo nel browser** (pdf.js incluso nel progetto): non viene inviato a nessun server. |
| **Ricette sulle grammature del piano** | Le ricette di pranzo e cena vengono riproporzionate sulle porzioni del piano: i carboidrati a parità di grammi di carboidrati, le proteine in "porzioni equivalenti" (es. 100 g carne = 60 g legumi secchi = 2 uova = 200 g tofu), l'olio come da piano, verdure libere. Colazioni e spuntini sono costruiti scegliendo tra le alternative del piano. Frequenze settimanali (carne bianca/rossa, pesce azzurro/bianco, legumi, uova, latticini, affettati, vegetali) e **pasto libero** rispettati. |
| **🔥 Calorie** | kcal e macro su ogni pasto e su ogni giorno; i carboidrati di pranzo e cena si adattano giorno per giorno per centrare l'obiettivo (dal piano, oppure obiettivo calorico manuale nelle preferenze). |
| **📊 Grafico dei macronutrienti** | Calorie giornaliere divise tra proteine, carboidrati e grassi con la linea dell'obiettivo, ripartizione dell'energia menù vs piano, tabella giorno per giorno. |
| **🧪 Laboratorio** | Scegli un pasto (o una ricetta qualsiasi) e cambia quantità con cursori, togli/aggiungi/sostituisci ingredienti (mantenendo calorie, proteine, carboidrati, grassi o grammi): vedi subito come cambiano kcal e macro rispetto all'originale, all'obiettivo del pasto e al totale del giorno. "Applica al menù" aggiorna lista della spesa, meal prep, nutrienti e riepilogo. Include un calcolatore di **equivalenze** tra alimenti. |

| **☕ Colazione dolce o salata** | Nelle preferenze scegli colazione *dolce*, *salata* o *alternata*; nel menù puoi cambiare lo stile del singolo giorno con un tocco (🍯/🧀). Con il piano, la salata usa pane o gallette con uova, albumi o affettati magri (frutta a parte), la dolce avena, fette biscottate, yogurt, frutta e marmellata. Gli affettati della colazione non contano nella frequenza settimanale, che riguarda solo pranzi e cene. |

| **💬 Claude (facoltativo)** | Con la **tua chiave API Anthropic** (inserita nel pannello "Chiedi a Claude", salvata solo nel tuo browser) puoi: fare domande su ricette, sostituzioni e organizzazione della settimana, con Claude che conosce piano, preferenze e menù; far leggere a Claude piani alimentari in **qualsiasi formato**, anche foto e scansioni, comprese le tabelle in immagine (es. le frequenze). Le richieste vanno direttamente dal browser ad Anthropic (modello `claude-opus-5-5`), senza server intermedi; si paga a consumo sul proprio account. Senza chiave l'app funziona come prima e il piano viene letto solo sul dispositivo. |

| **🌿 Menù anti bruciore di stomaco** | In *Tipo di menù* scegli *Normale* o *Anti bruciore di stomaco (reflusso)*: esclude pomodoro, agrumi, cipolla, aglio, piccante, caffè, cioccolato e menta, sostituisce gli alimenti più grassi con alternative leggere (macinato → tacchino, feta → ricotta, peperoni → zucchine), preferisce cene poco grasse e mostra un riquadro di consigli pratici. Un piatto che prende il nome da un alimento da evitare non viene proposto; se l'alimento è secondario viene tolto e la ricetta lo segnala. |

| **👥 Numero di persone** | In *Persone* scegli per quante persone cucinare (1-8): spesa, confezioni, meal prep e contenitori vengono calcolati per tutti, le ricette mostrano la quantità totale e quella a persona, calorie e macro restano a persona. Con un piano alimentare le porzioni seguono il piano per tutti. |
| **⭐ Le mie ricette** | Nel Laboratorio, *Salva come ricetta* aggiunge al ricettario il pasto che hai modificato (nome, proteina principale, pranzo/cena, da portare, preparazione): verrà proposto nei menù futuri. Senza piano si possono salvare anche le colazioni. Le ricette personali sono salvate nel browser e si eliminano dalla lista *Le mie ricette*. |

I valori nutrizionali sono medie da tabelle CREA e USDA (`js/data/nutrition.js`) e sono indicativi.

Altre funzioni: regimi **mediterranea, flexitariana, pescetariana, vegetariana, vegana**; **senza glutine / senza lattosio** (con sostituzioni automatiche, es. farro → grano saraceno); esclusione di uova, frutta a guscio, funghi, maiale, crostacei; porzioni leggere/normali/abbondanti; 🔄 cambia un singolo piatto, 🔒 bloccalo quando rigeneri, ♻️ trasforma un pranzo nell'avanzo della cena; lista con spunte, copia/condividi e stampa. Tutto viene salvato nel browser e funziona offline (PWA, installabile sul telefono).

## Avvio

Nessuna dipendenza da installare: è HTML/CSS/JavaScript puro. Serve solo un piccolo server locale (i moduli JavaScript non si caricano aprendo il file direttamente):

```bash
python3 -m http.server 8080     # oppure: npm start
# poi apri http://localhost:8080
```

Per usarla dal telefono si può pubblicare gratis con **GitHub Pages** (Settings → Pages → branch) e poi "Aggiungi a schermata Home".

## Versione su claude.ai

La stessa app è pubblicata anche come pagina su claude.ai: lì Claude usa **l'account claude.ai di chi la apre**, senza chiave API e senza costi a consumo (contano i limiti del proprio piano). Serve un account Claude e la connessione; non funziona offline e la stampa non è disponibile. I dati restano nel browser, separati da quelli della versione GitHub.

Per aggiornarla dopo una modifica: `npm run build:artifact` rigenera `artifact.html` (dal contenuto di `index.html`) e l'elenco `artifact-files.json` dei file da pubblicare.

## Test

```bash
npm test
```

I test verificano, per ogni regime e in diverse stagioni, che i piani rispettino esclusioni e intolleranze, che i pranzi lun-ven siano trasportabili, che ogni pasto di pesce abbia un'alternativa valida, e la coerenza di lista della spesa e meal prep.

## Struttura

```
index.html, css/style.css      interfaccia
js/app.js                      logica dell'interfaccia
js/data/ingredients.js         ingredienti: reparto, confezione, conservazione, stagionalità, tag, sostituti
js/data/recipes.js             ricette e colazioni (quantità per 1 porzione)
js/data/prep.js                attività di meal prep
js/data/nutrition.js           valori nutrizionali per 100 g, ruoli (carboidrato/proteina…)
js/data/aliases.js             riconoscimento degli alimenti scritti nel piano
js/engine/plan.js              lettura del piano (testo/PDF), analisi porzioni, riproporzionamento
js/engine/nutrition.js         calcoli nutrizionali ed equivalenze
js/engine/week.js              vista della settimana con tutti i pasti e i totali
js/ui/                         tab Piano, Laboratorio, Nutrienti
js/vendor/pdfjs/               pdf.js (Mozilla, Apache 2.0) per leggere i PDF offline
js/vendor/anthropic/           SDK ufficiale Anthropic per JavaScript (MIT), in un unico file per il browser
js/ai/claude.js                chiamate a Claude: verifica chiave, lettura del piano, chat in streaming
js/ui/assistant.js             pannello "Chiedi a Claude"
js/engine/diet.js              regimi, intolleranze, adattamento delle ricette
js/engine/planner.js           generazione del menù (ottimizzazione simulated annealing)
js/engine/shopping.js          lista della spesa
js/engine/mealprep.js          piano di meal prep
```

### Aggiungere una ricetta

Aggiungi un oggetto in `js/data/recipes.js` (vedi i commenti in cima al file): proteina principale, pasti adatti (`P`/`C`), `port: 1` se si può portare al lavoro, ingredienti con le quantità per una porzione. Le ricette di pesce sono riconosciute automaticamente e ricevono un'alternativa. `npm test` controlla che tutti gli ingredienti esistano.

> Le quantità sono indicative. Per esigenze cliniche rivolgiti a un professionista della nutrizione.
