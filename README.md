# 🥗 Menù settimanale

Web app che, dato un regime alimentare, costruisce il **menù della settimana** (pranzo e cena, più le colazioni), la **lista della spesa** e un **piano di meal prep**, pensata per **una persona**.

## Cosa fa

| Obiettivo | Come lo affronta |
|---|---|
| **Varietà** | 61 ricette; nessun piatto ripetuto (salvo gli avanzi voluti); fonti proteiche bilanciate sulla settimana secondo il regime (es. mediterranea: 4 legumi, 3 pesce, 2 carne bianca, 1 rossa, 2 uova, 2 formaggi); stessa proteina o stessa base (pasta, riso…) mai a pranzo e cena dello stesso giorno. |
| **Pranzi pratici lun-ven** | Nei giorni lavorativi il pranzo è sempre un piatto da portare (🎒): insalate di cereali, bowl, piadine, frittate, piatti che si riscaldano. Ogni ricetta ha un consiglio per la schiscetta. |
| **Meal prep** | Sessione della domenica e mini sessione del mercoledì: cereali e legumi da cuocere (con quantità totali a crudo e cotte), verdure da arrostire o grigliare, insalata da lavare, sughi, hummus, piatti da cucinare interi. Più un promemoria serale "prepara la schiscetta di domani". Opzione **cene doppie**: la seconda porzione diventa il pranzo del giorno dopo. |
| **Spesa per 1 persona** | L'ottimizzatore tiene conto delle confezioni reali (mozzarella 125 g, rucola 100 g, cavolfiore intero…) e preferisce ricette che finiscano le confezioni aperte. La lista indica quante confezioni comprare, quanto ne serve e gli eventuali avanzi deperibili con un'idea per usarli. |
| **Alimenti freschi** | Stagionalità mese per mese (frutta e verdura fuori stagione penalizzate); opzione **due spese** (weekend + mercoledì): i prodotti molto deperibili come pesce e carne vengono comprati a metà settimana; avvisi quando conviene il surgelato. |
| **Alternativa al pesce** | Ogni pasto di pesce mostra un'alternativa senza pesce compatibile (anche trasportabile se è un pranzo di lavoro). Basta un interruttore — o "Tutto senza pesce" — e la lista della spesa si aggiorna. |

Altre funzioni: regimi **mediterranea, flexitariana, pescetariana, vegetariana, vegana**; **senza glutine / senza lattosio** (con sostituzioni automatiche, es. farro → grano saraceno); esclusione di uova, frutta a guscio, funghi, maiale, crostacei; porzioni leggere/normali/abbondanti; 🔄 cambia un singolo piatto, 🔒 bloccalo quando rigeneri, ♻️ trasforma un pranzo nell'avanzo della cena; lista con spunte, copia/condividi e stampa. Tutto viene salvato nel browser e funziona offline (PWA, installabile sul telefono).

## Avvio

Nessuna dipendenza da installare: è HTML/CSS/JavaScript puro. Serve solo un piccolo server locale (i moduli JavaScript non si caricano aprendo il file direttamente):

```bash
python3 -m http.server 8080     # oppure: npm start
# poi apri http://localhost:8080
```

Per usarla dal telefono si può pubblicare gratis con **GitHub Pages** (Settings → Pages → branch) e poi "Aggiungi a schermata Home".

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
js/engine/diet.js              regimi, intolleranze, adattamento delle ricette
js/engine/planner.js           generazione del menù (ottimizzazione simulated annealing)
js/engine/shopping.js          lista della spesa
js/engine/mealprep.js          piano di meal prep
```

### Aggiungere una ricetta

Aggiungi un oggetto in `js/data/recipes.js` (vedi i commenti in cima al file): proteina principale, pasti adatti (`P`/`C`), `port: 1` se si può portare al lavoro, ingredienti con le quantità per una porzione. Le ricette di pesce sono riconosciute automaticamente e ricevono un'alternativa. `npm test` controlla che tutti gli ingredienti esistano.

> Le quantità sono indicative. Per esigenze cliniche rivolgiti a un professionista della nutrizione.
