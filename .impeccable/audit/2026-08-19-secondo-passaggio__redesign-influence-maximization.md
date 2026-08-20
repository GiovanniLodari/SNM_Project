---
target: redesign-influence-maximization (albero di lavoro non committato, dopo la correzione)
total_score: 15
p0_count: 0
p1_count: 0
p2_count: 5
p3_count: 4
timestamp: 2026-08-19
precedente: 2026-08-19__redesign-influence-maximization.md
scope: >
  frontend/src/App.tsx, rotte.ts, components/narrativa/*, components/navigazione/*,
  pages/InfluenceMaximization.tsx, components/InfluenceGraphCanvas.tsx,
  components/States.tsx, components/influence/** (tutti e quattro gli atti), theme.ts,
  hooks/useCambioRotta.ts, utils/html.ts
---

# Audit tecnico — secondo passaggio

Rieseguito sullo stesso perimetro dopo la correzione dei diciannove rilievi del primo
verbale, **allargato agli Atti I e IV**, che il primo passaggio non aveva letto perche'
si era fermato ai file toccati dal diff.

Metodo: `detect.mjs` sull'intero perimetro, `tsc --noEmit`, `eslint src`, `vitest run`,
**`npm run build`** (la misura del bundle che il primo passaggio dichiarava senza
misurarla), conteggio dei letterali di colore e di corpo, lettura dei file non coperti la
prima volta. Nessuna ispezione browser: l'estensione Chrome non e' collegata, quindi
niente misure di layout a viewport reale.

## Audit Health Score

| # | Dimensione | Punteggio | Delta | Rilievo principale |
|---|-----------|-------|---|-----------|
| 1 | Accessibilita' | **3** | +1 | Il bottone che apre un account e' alto ~16px: sotto il minimo di 24px per un bersaglio |
| 2 | Performance | 3 | — | 299 kB gzip di due librerie di grafici, entrambe caricate da questa rotta; il chunk ECharts supera la soglia di Rollup |
| 3 | Responsive | 3 | — | Nulla verificato a viewport reale; resta il bersaglio da 16px |
| 4 | Theming | 3 | — | 31 `fontSize` in linea fra 10 e 15px: la fascia dell'apparato non ha token |
| 5 | Anti-pattern | 3 | — | `ConfrontoGrafi` ricostruisce a mano la forma di `Blocco` e non ha titolo |
| **Totale** | | **15/20** | **+1** | **Good — intervenire sulle dimensioni debolli** |

**Il punteggio sale di uno, non di cinque, e la ragione conta.** I cinque P1 e i quattordici
P2/P3 del primo verbale sono chiusi e verificati. Ma tre dei cinque P2 di oggi sono rilievi
che il primo passaggio **non aveva visto**, non regressioni: due perche' aveva guardato
solo i file del diff (gli Atti I e IV erano fuori), uno perche' aveva dichiarato il costo
del bundle senza compilare. Il punteggio non misura quanto lavoro e' stato fatto; misura
cosa c'e' adesso.

## Verdetto anti-pattern

**Passa, e piu' netto di prima.** `detect.mjs` su tutto il perimetro: **zero rilievi**
(erano due advisory). Zero letterali `rgba`, zero letterali esadecimali fuori da
`theme.ts`. Il vetro della barra superiore e' stato rimosso invece che grandfathered; il
bagliore dei nodi e' limitato ai sessanta seed e dichiarato in DESIGN.md con gli altri
tre casi.

Restano due anti-pattern **di sistema**, non di aspetto — cioe' del tipo che il rubric
dell'audit mette sotto «nested cards, redundant copy» e non sotto «AI tells»:

1. `ConfrontoGrafi.tsx:51-57` scrive a mano `backgroundColor: canvas`, `border: subtle`,
   `borderRadius: xl`, `p: 3` — la forma esatta di `Blocco` — **e non ha titolo ne'
   descrizione.** E' letteralmente il difetto che `Blocco` esiste per rendere scomodo da
   riprodurre, ancora vivo nell'Atto I.
2. `EsitoConfronto.tsx:96-148`: un `Box` con bordo e raggio `md` dentro un `Box` tonale
   con raggio `xl`. Superficie e raggio cambiano, quindi rispetta la lettera della regola
   della scheda cifra; ma il bordo interno lo fa leggere come un riquadro dentro un
   riquadro. E' il caso limite della regola, e vale segnalarlo come tale invece di
   dichiararlo pulito.

## Executive summary

- Audit Health Score: **15/20** (Good), da 14/20
- Rilievi: **0 P0 · 0 P1 · 5 P2 · 4 P3**
- `tsc --noEmit`, `eslint src`: puliti
- `vitest run`: **34 file, 189 test, tutti verdi** (erano 187)
- `detect.mjs`: **0 rilievi**
- `npm run build`: compila in 2m 41s, **con un avviso di Rollup** sul chunk ECharts

I cinque rilievi che contano:

1. **299 kB gzip di grafici, entrambe le librerie su questa rotta.** `echarts` 570,83 kB
   (193,23 kB gzip), `CartesianChart` di Recharts 360,04 kB (106,03 kB gzip). Il chunk di
   pagina di Influence Maximization e' 22,37 kB gzip: il peso non e' la pagina, sono le
   librerie.
2. **La fascia tipografica dell'apparato non ha token.** 31 `fontSize` in linea fra 10 e
   15px, e sei varianti dello stesso ruolo «etichetta mono piccola».
3. **L'Atto I non e' migrato**, esattamente come l'Atto III prima di oggi.
4. **Il bottone del nome account e' alto ~16px** — sotto il minimo di 24px. L'ho
   introdotto io chiudendo il P1 sulla tastiera.
5. **Le sigle dei parametri non sono definite** (`n_sub`, `num_rr`, `mc_runs_celf`,
   `eval_runs`...), che PRODUCT.md dichiara un difetto per iscritto.

---

## Rilievi per gravita'

### P2

#### [P2] 299 kB gzip di librerie di grafici, entrambe caricate da questa rotta
- **Posizione**: `frontend/package.json` (`echarts`, `recharts`); consumatori in
  `utils/echarts.tsx`, `atto2/GraficoCostoBeneficio.tsx`, `atto3/AndamentoStep.tsx`,
  `InfluenceGraphCanvas.tsx`
- **Categoria**: Performance
- **Impatto**: misurato con `npm run build`, non dedotto. `echarts` produce **570,83 kB
  (193,23 kB gzip)** e supera la soglia di 500 kB di Rollup, che emette l'avviso; il
  `CartesianChart` di Recharts **360,04 kB (106,03 kB gzip)**. Sono i due chunk piu'
  grandi dell'applicazione, davanti a React (164,96 kB) e al chunk condiviso `index`
  (319,63 kB). Il capitolo Influence Maximization li carica **entrambi**: ECharts per il
  grafo della cascata, Recharts per il costo-beneficio e l'andamento per passo. Il chunk
  della pagina in se' e' 71,95 kB (22,37 kB gzip), cioe' magro: il peso e' tutto nelle
  librerie.
  Il primo verbale registrava la convivenza delle due librerie come P3 «scelta
  architetturale dichiarata e difendibile». La registrazione della ragione era corretta;
  la gravita' era sbagliata, perche' era stata assegnata senza compilare. 299 kB gzip per
  disegnare cinque punti, dieci barre e un grafo e' la voce di costo piu' grande
  dell'applicazione.
- **Raccomandazione**: la registrazione a mano di ECharts (`utils/echarts.tsx`) ha gia'
  fatto meta' del lavoro e va tenuta. Le due strade vere sono: (a) portare i due grafici
  Recharts di questo capitolo su ECharts, che e' gia' in pagina — servirebbero
  `ScatterChart`, `BarChart` e `LineChart` registrati, e Recharts uscirebbe dalla rotta;
  oppure (b) l'inverso, disegnare il grafo con Recharts o con `d3-force`, che il progetto
  ha gia' per `GraphHero`. La prima e' meno lavoro e tiene il grafo dov'e'. Da misurare
  con un `build` prima e dopo: e' l'unico modo di sapere quanto si guadagna davvero.
- **Comando**: `/impeccable optimize`

#### [P2] La fascia tipografica dell'apparato non ha token
- **Posizione**: 31 occorrenze in 12 file. Le sei varianti dello stesso ruolo:
  `IntestazioneCapitoloNav.tsx:47` (mono 10px, LS 0.07em), `ContenutoNavigazione.tsx:118`
  (mono 10px, LS 0.06em), `ContenutoNavigazione.tsx:190` (mono 11px),
  `ContenutoNavigazione.tsx:205` (mono 10px), `EtichettaMono.tsx:36` (mono 11px, LS
  0.5px), `IndiceAtti.tsx:69` (mono 12px), `IntestazioneAtto.tsx:22` (mono 12px, LS 1px),
  `App.tsx:127` (mono 12px)
- **Categoria**: Theming
- **Impatto**: `tokens.type` copre la scala dai 96px ai 12px, con `monoLabel` a 14px e
  `micro` a 12px. Sotto i 14px, dove vive tutta la cromatura dell'applicazione — le
  intestazioni di gruppo della sidebar, l'indice degli atti, le chip, i comandi del grafo
  — non c'e' nessun token, quindi ogni componente inventa la propria misura. Il risultato
  e' che «etichetta mono piccola» esiste a 10px con due crenature diverse, a 11px con due
  crenature diverse e a 12px con due crenature diverse: sei varianti dello stesso ruolo,
  nessuna confrontabile con le altre senza aprire sei file.
  E' lo stesso difetto che `EtichettaMono` e `tokens.type` sono stati scritti per chiudere,
  una fascia di corpo piu' in basso — e il primo verbale non l'ha visto perche' cercava
  solo i titoli in carattere display, cioe' i nove da 18 a 28px.
- **Raccomandazione**: dichiarare la fascia in `tokens.type` (due o tre ruoli, non sei:
  `monoMicro` 11px per le intestazioni di gruppo, `monoDato` 13px per i valori nelle
  celle, e la `micro` che c'e' gia'), poi far passare `EtichettaMono` e le sei occorrenze
  dai token. Chi ne vuole una settima deve prima accorgersi che il ruolo non c'e'.
- **Comando**: `/impeccable typeset`

#### [P2] L'Atto I non e' migrato al guscio narrativo
- **Posizione**: `atto1/ConfrontoGrafi.tsx:51-57` (forma di `Blocco` ricostruita a mano,
  nessun titolo), `atto1/SchedaProblema.tsx:40` (`Box` nudo con un `h3` interno);
  `pages/InfluenceMaximization.tsx:175-188`
- **Categoria**: Theming / Accessibilita'
- **Impatto**: `ConfrontoGrafi` scrive `backgroundColor: canvas`, `border: subtle`,
  `borderRadius: xl`, `p: 3` — la forma esatta di `Blocco` — e non ha titolo ne'
  descrizione. Chi scorre l'Atto I incontra due riquadri di numeri, un quadrato in scala e
  quattro cifre senza che nulla dica a quale domanda rispondono: e' la stessa condizione
  in cui era l'Atto III fino a oggi, e la stessa in cui era l'Atto II prima del redesign.
  Il primo verbale ha descritto il confine della migrazione come «Atto III piu'
  `InfluenceGraphCanvas`»: era «Atto I piu' Atto III», e la meta' sbagliata e' stata
  chiusa. Conseguenza misurabile: nell'Atto I la gerarchia va dall'`h2` della domanda
  all'`h3` interno di `SchedaProblema` («Parametri della run»), e `ConfrontoGrafi` non ha
  intestazione affatto.
  `SchedaProblema` invece va lasciata nuda: e' l'enunciato del problema, cioe'
  l'affermazione dell'atto, come `EsitoConfronto` per l'Atto II.
- **Standard**: WCAG 1.3.1 (A) per l'artefatto senza intestazione.
- **Raccomandazione**: avvolgere `ConfrontoGrafi` in `Blocco` — «Su quale grafo girano
  davvero gli esperimenti» piu' una descrizione che dica perche' il sottografo esiste — e
  togliergli la forma scritta a mano. Un solo intervento, e chiude anche il rilievo
  sull'anti-pattern.
- **Comando**: `/impeccable layout`

#### [P2] Il bottone del nome account e' alto ~16px
- **Posizione**: `atto3/ClassificheSeed.tsx:69-88` (`NomeAccount`)
- **Categoria**: Accessibilita' / Responsive
- **Impatto**: **introdotto chiudendo il P1 sulla tastiera.** Il `ButtonBase` non ha
  padding verticale e porta testo da 13px: l'altezza risultante e' circa 16px, sotto il
  minimo di 24px che WCAG 2.5.8 chiede a un bersaglio. E' l'azione primaria di ogni riga
  di entrambe le classifiche — quella che seleziona il seed e apre il profilo — quindi il
  bersaglio piu' usato del capitolo e' anche il piu' piccolo. Il clic sulla riga copre il
  mouse, ma non il tocco preciso ne' chi ha tremore.
  Si aggiunge un secondo difetto della stessa riga: a riposo il bottone non ha nessun
  segno che lo distingua da testo in grassetto — nessuna sottolineatura, nessuna tinta di
  collegamento — quindi l'unico indizio che sia azionabile e' il fondo che compare al
  passaggio del mouse.
- **Standard**: WCAG 2.5.8 Dimensione del bersaglio, minimo (AA in WCAG 2.2).
- **Raccomandazione**: `minHeight: 24` sempre e 44 sotto `@media (pointer: coarse)`, con
  `py` che estenda l'area cliccabile oltre il testo senza spostare le righe (o un
  `::before` con `inset` negativo, come suggerisce la guida su layout). E dare al bottone
  un segno a riposo: sottolineatura tratteggiata tenue, o la tinta di collegamento.
- **Comando**: `/impeccable adapt`

#### [P2] Dieci parametri della run senza glossa
- **Posizione**: `atto1/SchedaProblema.tsx:95-104`; `RigaParametro` a `:12-31`
- **Categoria**: Copy
- **Impatto**: `n_sub`, `k`, `theta`, `num_rr`, `mc_runs_celf`, `eval_runs`,
  `random_seed`, `ic_p0`, `ic_cap`, `ic_method` sono resi come etichette nude accanto al
  loro valore. `k`, `ic_p0` e `ic_cap` compaiono nella formula qui sopra e si ricostruiscono;
  gli altri sette no. PRODUCT.md non lascia margine: «la sigla non definita e' un difetto,
  non un segno di competenza», e il lettore primario e' una commissione che non conosce la
  pipeline. La critique del 18 agosto lo aveva gia' registrato («cinque sigle mai
  definite») e il redesign non l'ha toccato.
- **Raccomandazione**: **non rinominarli.** Sono le chiavi letterali della configurazione
  Python, e cambiarle romperebbe la tracciabilita' verso `Max_Influence/graph_builder.py`
  che la scheda dichiara due righe sopra. Serve una glossa: `RigaParametro` prende un
  terzo campo, una riga in `micro` sotto il nome («quante simulazioni Monte Carlo per
  valutare CELF++»), e i testi vanno in `influenceContent.ts` con il resto della copia.
- **Comando**: `/impeccable clarify`

### P3

#### [P3] Seguendo «salta al contenuto» non si vede nulla cambiare
`App.tsx` — il `main` ha `tabIndex={-1}` e `outline: "none"`. La soppressione e' corretta
per il focus che arriva a ogni cambio di rotta (nessuno l'ha chiesto, e un anello che
compare da solo e' rumore), ma e' la stessa regola che rende muto il collegamento di
salto: si preme, il focus si sposta, e a schermo non cambia niente. Introdotto da me.
Serve distinguere i due casi — un anello quando il focus arriva dal collegamento, niente
quando arriva dal cambio di rotta. — `/impeccable harden`

#### [P3] I valori esatti dei due grafici Recharts stanno solo nel tooltip
`atto2/GraficoCostoBeneficio.tsx`, `atto3/AndamentoStep.tsx`. Il nome accessibile dice
ora il picco e il totale, e il costo-beneficio rimanda alla tabella che porta gli stessi
valori; ma l'andamento per passo non ha tabella, quindi il numero esatto di un singolo
passo si legge solo passando il mouse. E' l'affordance convenzionale di un grafico, ed e'
anche esattamente cio' che PRODUCT.md vieta quando dice che nessuna informazione va
affidata a un hover — su un proiettore quei numeri non esistono. — `/impeccable clarify`

#### [P3] Un riquadro bordato dentro un riquadro tonale
`atto2/EsitoConfronto.tsx:96-148`. Vedi il verdetto anti-pattern: rispetta la lettera
della regola della scheda cifra (cambiano superficie e raggio) ma il bordo interno lo fa
leggere come annidato. Togliere il bordo al riquadro interno lo risolve senza toccare
altro. — `/impeccable polish`

#### [P3] Quattro nuovi landmark `region` per pagina
Le quattro tabelle hanno `role="region"` piu' `tabIndex={0}` sul contenitore scorrevole:
e' il pattern documentato, e chiude il rilievo sulla tastiera del primo verbale, ma
aggiunge quattro landmark e quattro fermate di tabulazione anche quando su schermo largo
non c'e' niente da scorrere. Il refinement corretto e' rendere focalizzabile il
contenitore solo quando `scrollWidth > clientWidth`. Costa un `ResizeObserver`, quindi va
fatto solo se la lista dei landmark diventa scomoda davvero. — `/impeccable harden`

## Pattern sistemici

1. **La migrazione al guscio narrativo e' a tre quarti, non a termine.** Atti II, III e IV
   usano `Blocco` o stanno nudi per scelta; l'Atto I no. Il primo verbale ha diagnosticato
   correttamente il *tipo* di difetto e sbagliato il *confine*, perche' ha guardato i file
   del diff invece del capitolo. Ogni audit successivo su questo progetto conviene che
   parta dal capitolo intero.
2. **Il sistema di token e' completo in alto e assente in basso.** Dai 96px ai 16px ogni
   ruolo ha un nome; sotto i 14px non ce n'e' nessuno, e li' vive tutta la cromatura. Lo
   stesso e' appena stato risolto per i colori trasparenti (`tokens.overlay`): il rimedio
   e' identico e non e' stato applicato alla tipografia.
3. **Il costo dichiarato e il costo misurato non coincidevano.** Il primo verbale lodava la
   registrazione a mano di ECharts e archiviava la convivenza con Recharts come P3, senza
   compilare. Con il `build` in mano il quadro cambia: la registrazione a mano e' un
   guadagno reale, e la convivenza e' la voce di costo piu' grande dell'applicazione. Una
   dimensione di performance non va valutata senza una misura.

## Cosa funziona (verificato in questo passaggio)

- **I diciannove rilievi del primo verbale sono chiusi**, e le chiusure reggono al
  ricontrollo: zero `rgba`, zero esadecimali fuori dai token, zero `title` come unico
  portatore di una nota, nessun `Select` anonimo, `th scope="row"` sulle quattro tabelle,
  `escapeHtml` sull'unico dato non fidato che diventa HTML.
- **I contrasti nuovi tengono, ricalcolati sulle coppie effettive**: i quattro pallini
  della legenda vanno da 3,07:1 a 12,62:1 sul fondo scuro (erano 1,54–2,61:1 sul bianco),
  le due chip 4,59 e 4,77:1, il testo della legenda 6,39:1.
- **`detect.mjs` restituisce zero rilievi** su un perimetro di 30 file, e ha colto in
  tempo reale l'unico anti-pattern che la correzione stava introducendo (l'animazione di
  `width`). Il ciclo detector-durante-il-lavoro funziona.
- **Il chunk di pagina e' magro**: 71,95 kB, 22,37 kB gzip, per un capitolo con quattro
  atti, undici artefatti, due tabelle paginate e un grafo interattivo. Il lazy loading per
  rotta e la registrazione a mano di ECharts fanno il loro lavoro.
- **189 test verdi**, di cui due nuovi scritti in questo giro sul comando che chiude il P1
  piu' serio.

## Azioni consigliate, in ordine

1. **[P2] `/impeccable optimize`** — portare i due grafici Recharts del capitolo su
   ECharts, che e' gia' in pagina, e misurare con un `build` prima e dopo. E' la sola voce
   con un numero grande dietro.
2. **[P2] `/impeccable layout`** — `ConfrontoGrafi` in `Blocco` con titolo e descrizione:
   chiude il rilievo sull'Atto I e uno dei due anti-pattern residui.
3. **[P2] `/impeccable adapt`** — l'altezza minima del bottone del nome account, e un
   segno a riposo che lo dichiari azionabile.
4. **[P2] `/impeccable typeset`** — due o tre ruoli per la fascia sotto i 14px, poi le sei
   varianti dai token.
5. **[P2] `/impeccable clarify`** — la glossa dei dieci parametri, senza rinominarli.
6. **[P3] `/impeccable harden`** — l'anello di focus per il solo collegamento di salto.
7. **[P3] `/impeccable polish`** — il bordo del riquadro interno di `EsitoConfronto`, e
   passaggio finale.

Resta fuori da questa lista, e va detto: **niente di tutto questo e' stato visto in un
browser.** Le tre cose che l'ispezione visiva potrebbe smentire o confermare sono il
pannello bloccato su un tablet a 768px, il canvas a 380px d'altezza su un telefono, e la
resa della cascata dopo la rimozione di `notMerge` — quest'ultima e' un cambio di
comportamento di rendering giudicato solo leggendo il codice.
