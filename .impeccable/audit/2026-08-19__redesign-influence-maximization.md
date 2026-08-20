---
target: redesign-influence-maximization (albero di lavoro non committato)
total_score: 14
p0_count: 0
p1_count: 5
p2_count: 7
p3_count: 7
timestamp: 2026-08-19
scope: >
  frontend/src/App.tsx, rotte.ts, components/narrativa/*, components/navigazione/*,
  pages/InfluenceMaximization.tsx, components/InfluenceGraphCanvas.tsx,
  components/States.tsx, components/influence/atto2/*, components/influence/atto3/*
---

# Audit tecnico — redesign Influence Maximization

> **Stato: tutti i rilievi chiusi nello stesso giorno (19 agosto 2026).**
>
> I rilievi qui sotto restano scritti al presente perche' sono il verbale di
> cos'era rotto e perche': serve a non riaprire le stesse porte. Cosa e'
> cambiato, rilievo per rilievo, e' in fondo al documento, sezione **Esito della
> correzione**.
>
> In sintesi: 5 P1 chiusi, 7 P2 chiusi, 7 P3 chiusi. `detect.mjs` sull'intero
> perimetro restituisce **zero** rilievi (erano 2 advisory). `tsc --noEmit` ed
> `eslint src` puliti. `vitest run` sull'albero finale: **34 file, 189 test,
> tutti verdi** (erano 187; i due nuovi coprono il comando di blocco della
> navigazione). Due difetti nuovi sono stati introdotti e chiusi durante la
> correzione stessa, ed e' documentato quali.

Metodo: lettura del sorgente di tutti i file toccati dal branch (11 modificati, 17 nuovi),
`detect.mjs` sull'intero perimetro, calcolo dei rapporti di contrasto sulle coppie
effettivamente rese, `tsc --noEmit`, `eslint src`, `vitest run`. Nessuna ispezione
browser: l'estensione Chrome non e' collegata in questa sessione, quindi le misure di
layout a viewport reale restano da verificare — i rilievi responsive qui sotto sono
dedotti dal codice, non misurati.

## Audit Health Score

| # | Dimensione | Punteggio | Rilievo principale |
|---|-----------|-------|-----------|
| 1 | Accessibilita' | **2** | Due `Select` senza nome accessibile, righe di tabella cliccabili solo col mouse, etichette di navigazione raggiungibili solo al passaggio del mouse |
| 2 | Performance | 3 | `notMerge: true` piu' `shadowBlur: 20` su ~400 nodi ricostruiti ogni 300 ms in riproduzione |
| 3 | Responsive | 3 | Canvas del grafo a 560px fissi, bersagli tattili sotto i 44px, il pannello di navigazione non si apre senza mouse |
| 4 | Theming | 3 | 17 letterali `rgba` e 9 titoli con `fontSize` in linea che scavalcano `tokens.type` |
| 5 | Anti-pattern | 3 | `detect.mjs`: 2 soli rilievi advisory. Vetro e bagliori della console del grafo rimossi |
| **Totale** | | **14/20** | **Good — intervenire sulle dimensioni debolli** |

## Verdetto anti-pattern

**Passa.** Nessuno guarderebbe questa interfaccia e direbbe "l'ha fatta un'IA".
`detect.mjs` sull'intero perimetro del redesign restituisce due soli rilievi advisory
(due raggi fuori scala). I ban assoluti sono tutti rispettati: nessun testo in
gradiente, nessun bordo laterale colorato, nessuna griglia di card identiche, nessun
template hero-metric. L'occhiello «Atto II — Quale algoritmo» sopra una `<h2>` che porta
la *domanda* e' voce guadagnata, non impalcatura: le due stringhe non si sovrappongono
mai.

Il branch chiude anche tre violazioni che la critique del 18 agosto aveva registrato
come P1: il `backdropFilter: blur(10px)` dell'overlay di telemetria, il
`boxShadow: 0 0 12px` sul pollice dello slider e la nomenclatura «Apache ECharts /
WebGL» nei titoli sono spariti, e il lessico epidemico («infetto», «contagiato»)
sopravvive solo nei commenti che spiegano perche' e' stato tolto.

Tre residui, tutti minori e tutti argomentabili:

- `App.tsx:154-155` — `backdropFilter: blur(8px)` su bianco al 90% nella barra
  superiore. Funzionale (il contenuto le scorre sotto), non decorativo, ma e' vetro e
  DESIGN.md non lo dichiara fra le eccezioni.
- `InfluenceGraphCanvas.tsx:248-249` — `shadowBlur: 20` sui seed e 15 sui nodi appena
  attivati. Su fondo scuro il bagliore fa il lavoro che DESIGN.md gli assegna, ma la
  «regola del piatto per difetto» ammette due eccezioni e questa e' la terza.
- `SidebarNavigazione.tsx:108` — `boxShadow: 0 12px 32px` a pannello aperto. La
  motivazione nel commento e' corretta (il pannello copre il contenuto, deve staccarsi),
  ma e' un'ombra su una superficie, cioe' cio' che DESIGN.md vieta, e DESIGN.md non e'
  stato aggiornato.

Sono i tre punti in cui il codice ha ragione e il documento e' rimasto indietro: o si
dichiarano in DESIGN.md come eccezioni funzionali, o cadono.

## Executive summary

- Audit Health Score: **14/20** (Good — intervenire sulle dimensioni debolli)
- Rilievi: **0 P0 · 5 P1 · 7 P2 · 7 P3**
- `tsc --noEmit` ed `eslint src`: **puliti, zero errori**
- `vitest run`: **34 file, 187 test, tutti verdi** (1011 s, vedi P3 sulla lentezza)

I cinque rilievi che contano:

1. **Il formatter del tooltip del grafo interpola `acct` senza escape in una stringa
   HTML** (`InfluenceGraphCanvas.tsx:315`). `acct` arriva da istanze Mastodon remote:
   e' dato non fidato che finisce in `innerHTML`.
2. **Le righe delle due classifiche sono cliccabili ma non operabili da tastiera**
   (`ClassificheSeed.tsx:139-153`, `:258`). L'unico percorso dalla classifica al
   profilo di un account e' il mouse.
3. **Due `Select` senza nome accessibile** (`InfluenceGraphCanvas.tsx:447`, `:680`), in
   un progetto che ha scritto la regola opposta in DESIGN.md e la rispetta altrove.
4. **Le etichette della sidebar sono raggiungibili solo con mouse o tastiera.** Su un
   tablet touch da 600px in su non esiste hover, non esiste il pulsante hamburger
   (`display: {sm: "none"}`) e le etichette restano a `opacity: 0` per sempre.
5. **L'Atto III non e' stato migrato al guscio narrativo.** `Blocco` esiste, l'Atto II
   lo usa quattro volte, l'Atto III cinque volte non lo usa: cinque artefatti senza
   titolo, senza descrizione e senza `<h3>`.

---

## Rilievi per gravita'

### P1 — da chiudere prima del rilascio

#### [P1] Il tooltip del grafo interpola dati remoti in HTML senza escape
- **Posizione**: `frontend/src/components/InfluenceGraphCanvas.tsx:315` (anche `:317`)
- **Categoria**: Robustezza / sicurezza
- **Impatto**: il `formatter` di ECharts in `renderMode: "html"` (il default) rende la
  stringa restituita come markup. `@${raw.acct || raw.id}` e `ID: ${raw.id}` arrivano dal
  database, popolato con handle e identificativi raccolti da istanze Mastodon remote:
  un'istanza ostile che imposta un `acct` contenente markup lo fa eseguire nel tooltip.
  Su uno strumento locale il rischio pratico e' contenuto, ma e' l'unico punto
  dell'applicazione in cui un dato di rete diventa HTML, e in una discussione di tesi «il
  grafo esegue quello che gli scrive l'istanza remota» e' una domanda a cui non si vuole
  rispondere.
- **Standard**: OWASP A03 (Injection). Non e' un requisito WCAG.
- **Raccomandazione**: passare a `renderMode: "richText"`, oppure restituire un nodo DOM
  costruito con `textContent`, oppure far passare `acct` e `id` da una funzione di escape
  prima dell'interpolazione. La terza e' la modifica minima; la seconda rende impossibile
  ripetere l'errore.
- **Comando**: `/impeccable harden`

#### [P1] Le righe delle classifiche sono cliccabili solo col mouse
- **Posizione**: `frontend/src/components/influence/atto3/ClassificheSeed.tsx:139-153` e `:258`
- **Categoria**: Accessibilita'
- **Impatto**: `<TableRow onClick={...} sx={{ cursor: "pointer" }}` senza `tabIndex`,
  senza `role` e senza `onKeyDown`. Aprire il profilo di un seed — e, nella prima
  tabella, selezionare il seed che alimenta il canvas — e' impossibile da tastiera e
  invisibile a uno screen reader, che non ha modo di sapere che la riga e' interattiva.
  E' anche l'unico percorso esistente da una classifica a un account.
- **Standard**: WCAG 2.1.1 Tastiera (A); 4.1.2 Nome, ruolo, valore (A).
- **Raccomandazione**: rendere interattiva la cella del nome invece della riga, con un
  bottone testuale o un `<a>`: un solo bersaglio nominato, focus visibile con l'anello
  globale, e il clic smette di fare due cose insieme (selezionare il seed *e* aprire il
  modale, che copre il canvas appena cambiato). Se la riga intera deve restare
  cliccabile, servono `tabIndex={0}`, `role="button"`, `aria-label` e la gestione di
  Invio e Spazio.
- **Comando**: `/impeccable harden`

#### [P1] Due `Select` senza nome accessibile
- **Posizione**: `frontend/src/components/InfluenceGraphCanvas.tsx:447` (selettore del
  seed) e `:680` (velocita' di riproduzione)
- **Categoria**: Accessibilita'
- **Impatto**: nessuno dei due ha `inputProps={{ "aria-label": ... }}`, `labelId` o
  `<InputLabel>`. Uno screen reader annuncia due combobox senza nome; quello della
  velocita' e' accompagnato solo da un'icona decorativa, quindi non c'e' nemmeno un
  contesto visivo da cui dedurlo. DESIGN.md dichiara la regola alla lettera («Nome
  accessibile obbligatorio: `inputProps={{ "aria-label": ... }}` — scritto sulla radice»)
  e `ClassificheSeed.tsx:105` la rispetta: qui manca in due punti su tre.
- **Standard**: WCAG 4.1.2 (A); 1.3.1 (A).
- **Raccomandazione**: `inputProps={{ "aria-label": "Seed di cui mostrare la cascata" }}`
  e `inputProps={{ "aria-label": "Velocita' di riproduzione della cascata" }}`.
- **Comando**: `/impeccable harden`

#### [P1] Le etichette della navigazione esistono solo al passaggio del mouse
- **Posizione**: `frontend/src/components/navigazione/SidebarNavigazione.tsx:56-59`,
  `VoceNavigazione.tsx:88-91`, `App.tsx:168`
- **Categoria**: Accessibilita' / Responsive
- **Impatto**: il pannello si allarga solo su `onMouseEnter` o `onFocus`. Il pannello
  temporaneo con le etichette sempre visibili e il pulsante hamburger che lo apre
  esistono solo sotto `sm` (`display: { xs: "block", sm: "none" }` e
  `display: { sm: "none" }`). Da 600px in su, su un dispositivo senza mouse — tablet in
  orizzontale, portatile touch usato col dito, e l'aula e' esattamente quel contesto — non
  c'e' hover, non c'e' hamburger, e le etichette restano a `opacity: 0` indefinitamente:
  la navigazione si riduce a otto icone senza nome. Toccare una voce naviga subito,
  quindi non c'e' modo di leggerne il nome prima di impegnarsi. PRODUCT.md lo dichiara
  come vincolo esplicito: «nessuna informazione affidata a un hover».
- **Standard**: WCAG 1.4.13 (AA) per lo spirito; il fallimento pratico e' la mancanza di
  un `@media (hover: none)`.
- **Raccomandazione**: aggiungere un comando di apertura persistente — un pulsante di
  espansione in cima al rail, con `aria-expanded`, che tenga il pannello aperto finche'
  non lo si richiude — e sotto `@media (hover: none)` partire dallo stato espanso invece
  che dal rail. Il rail resta il default per chi ha un mouse, che e' il caso per cui e'
  stato progettato.
- **Comando**: `/impeccable adapt`

#### [P1] Valori del dataset cablati come default delle props
- **Posizione**: `frontend/src/components/InfluenceGraphCanvas.tsx:78-79`
  (`maxStep = 11`, `selectedSeedId = "66109"`)
- **Categoria**: Robustezza
- **Impatto**: `"66109"` e' l'identificativo di un account in *questo* database. Su un
  altro database quell'account non esiste: il canvas non riceve mai un seed valido dal
  chiamante quando `selectedSeedId` e' assente, e disegna un estratto che non corrisponde
  a nulla senza dirlo. `maxStep = 11` fa lo stesso allo scrubber, che mostrerebbe undici
  passi di una cascata che ne ha altri. Oggi `InfluenceMaximization.tsx` passa entrambi i
  valori veri, quindi il difetto e' latente — ma e' latente in un progetto il cui vincolo
  dichiarato e' «ogni numero che vedi qui viene dal database locale: nulla e' simulato».
- **Raccomandazione**: rendere `maxStep` e `selectedSeedId` props obbligatorie, oppure
  derivare i default dai dati (`maxStep` da `Math.max(...activation_step)`, che il
  componente calcola gia' in `maxSeedStep`; `selectedSeedId` dal primo di `topSeeds`).
  Nessun identificativo di riga in un valore di default.
- **Comando**: `/impeccable harden`

### P2 — da chiudere nel prossimo passaggio

#### [P2] L'Atto III non e' stato migrato al guscio narrativo
- **Posizione**: `frontend/src/pages/InfluenceMaximization.tsx:254-284`;
  `atto3/EsitoCascata.tsx:47`, `atto3/AndamentoStep.tsx:44-46`,
  `atto3/ComposizioneRaggiunti.tsx:32-34`, `atto3/CanvasCascata.tsx:68`,
  `atto3/ClassificheSeed.tsx:70-86`
- **Categoria**: Theming / Accessibilita'
- **Impatto**: `Blocco` e' stato scritto per un difetto preciso, dichiarato nel suo
  stesso docstring: quattro artefatti di peso identico consegnati senza titolo ne'
  descrizione. L'Atto II e' stato sistemato — quattro `Blocco` con `<h3>` e una riga che
  dice come si legge il contenuto. L'Atto III no: cinque artefatti, zero `Blocco`.
  `AndamentoStep` e `ComposizioneRaggiunti` sono un grafico e una barra nudi sul canvas,
  senza titolo e senza descrizione; `EsitoCascata` e `CanvasCascata` hanno un titolo reso
  come `<p>` da 24px; `ClassificheSeed` ricostruisce a mano la forma del `Blocco`
  (`p: 4`, raggio `xl`, `border.subtle`) due volte nello stesso file e intitola a 18px.
  Conseguenze misurabili: la gerarchia dei titoli dell'Atto III va da `<h2>` a niente
  (`Blocco` e' l'unico produttore di `<h3>` dell'atto, e non e' usato), e lo stesso ruolo
  «titolo di artefatto» appare nel capitolo a 18px, 22px e 24px. E' alla lettera il
  difetto del Principio 5 di PRODUCT.md — «un titolo che cambia misura fra due sezioni» —
  dentro la pagina che quel principio doveva dimostrare.
- **Standard**: WCAG 1.3.1 (A) per la gerarchia mancante.
- **Raccomandazione**: avvolgere i cinque artefatti in `Blocco`, con titolo e descrizione
  scritti come quelli dell'Atto II, e togliere i titoli inline dai componenti.
  `ClassificheSeed` diventa due `Blocco` affiancati e perde le due `Paper` ricostruite a
  mano. Nove `fontSize` in linea nel capitolo passano a `tokens.type`.
- **Comando**: `/impeccable layout`

#### [P2] I pallini della legenda del canvas sono invisibili sul canvas bianco
- **Posizione**: `frontend/src/components/influence/atto3/CanvasCascata.tsx:36-41` e `:108-116`
- **Categoria**: Accessibilita'
- **Impatto**: la legenda prende le quattro tinte dei nodi — pensate per il fondo
  `darkCanvas` — e le rende come pallini da 10px sul canvas bianco della pagina. Rapporti
  misurati contro `#ffffff`: `accentCyan` **1,54:1**, `activated` **2,22:1**, `coral`
  **2,61:1**, `darkSlateDarker` 6,31:1. Tre pallini su quattro stanno sotto il 3:1
  richiesto a un elemento grafico che porta informazione, e il pallino ciano e'
  praticamente invisibile. Le etichette accanto salvano il significato, ma il mestiere
  della legenda e' legare tinta e significato: se la tinta non si vede, il legame non si
  forma, e chi torna al canvas non sa quale colore cercare. Per il coral esiste anche la
  regola scritta («La regola dei due coral»: vietato come segno su superficie chiara),
  qui violata.
- **Standard**: WCAG 1.4.11 Contrasto non testuale (AA).
- **Raccomandazione**: rendere la legenda sul fondo che descrive — una fascia
  `darkCanvas` a filo del canvas del grafo, sopra o sotto, dove le quattro tinte sono
  quelle giuste e leggibili (coral 7,42:1, `textOnDark` 6,39:1). E' anche la soluzione
  piu' onesta: la legenda appartiene allo strumento, non alla pagina. In alternativa
  cerchiare ogni pallino con un filetto da 1px e usare le varianti inchiostro — ma per
  ciano e verde queste varianti non esistono e andrebbero dichiarate.
- **Comando**: `/impeccable colorize`

#### [P2] Due spiegazioni affidate al solo attributo `title`
- **Posizione**: `frontend/src/components/influence/atto2/TabellaBenchmark.tsx:119` e `:125`
- **Categoria**: Accessibilita'
- **Impatto**: perche' un tempo sia `n/d` e perche' un altro sia «sotto il pavimento
  rappresentabile» sono le due note di provenienza piu' importanti della tabella, e
  vivono in un `title` su uno `<span>`: non compaiono al tocco, non si raggiungono da
  tastiera (lo `<span>` non e' focalizzabile), e su un proiettore nessuno le vedra' mai.
  Contraddice sia il Principio 1 di PRODUCT.md (ogni numero porta la sua provenienza) sia
  il suo vincolo esplicito sull'hover.
- **Standard**: WCAG 1.3.1 (A); 1.4.13 (AA) per il pattern.
- **Raccomandazione**: portare la nota in pagina, come le due `caption` che la stessa
  tabella usa gia' nella colonna dei seed — la forma esiste, va solo riusata. Se lo
  spazio non basta, una nota a fondo tabella con un marcatore accanto al valore.
- **Comando**: `/impeccable clarify`

#### [P2] `notMerge: true` piu' bagliori ricostruiscono l'intero grafo ogni 300 ms
- **Posizione**: `frontend/src/components/InfluenceGraphCanvas.tsx:530` (`notMerge`),
  `:248-249` (`shadowBlur`), `:122-132` (il timer)
- **Categoria**: Performance
- **Impatto**: in riproduzione il timer avanza di un passo ogni 300–1500 ms; ogni passo
  ricostruisce l'oggetto `option` e `notMerge: true` dice a ECharts di buttare via lo
  stato precedente invece di calcolare la differenza, quindi serie e nodi vengono creati
  da zero a ogni tick. Sopra ci sono `shadowBlur: 20` sui seed e 15 sui nodi appena
  attivati: l'ombra sfocata e' l'operazione piu' costosa del canvas 2D, e qui e' su
  decine di simboli. A `4.0x` (300 ms) sono ~3,3 ricostruzioni complete al secondo con
  ombre sfocate su ~400 nodi. Si perdono anche le transizioni interne di ECharts, che
  `notMerge` disabilita per costruzione: e' il motivo per cui la cascata «salta» fra i
  passi invece di scorrere.
- **Raccomandazione**: togliere `notMerge` (le serie non cambiano struttura fra i passi,
  solo i valori: e' il caso per cui il merge esiste) e limitare `shadowBlur` ai soli nodi
  seed, che sono sessanta. Da misurare col profiler prima e dopo: e' l'unico rilievo di
  questo audit su cui una misura reale puo' smentire la lettura del codice.
- **Comando**: `/impeccable optimize`

#### [P2] `prefers-reduced-motion` non arriva dentro il grafico
- **Posizione**: `frontend/src/components/InfluenceGraphCanvas.tsx:135-390` (l'oggetto
  `option` non dichiara `animation`), `:339` (`layout: "force"`), `:353-354`
- **Categoria**: Accessibilita'
- **Impatto**: `useMovimentoRidotto` e' usato bene per quello che copre — la cascata non
  parte da sola e si posa sull'ultimo passo — ma si ferma li'. L'oggetto ECharts non
  imposta `animation`, quindi resta il default (attivo, 1000 ms): chi ha chiesto meno
  movimento e trascina lo scrubber vede comunque i nodi animarsi a ogni passo. E il
  layout «A forze» e' una simulazione fisica che continua a muovere il disegno da sola,
  indipendentemente dalla preferenza. La cornice rispetta la richiesta, il contenuto no.
- **Standard**: WCAG 2.3.3 (AAA). La 2.2.2 Pausa, stop, nascondi (A) e' invece
  soddisfatta: il comando di pausa c'e'.
- **Raccomandazione**: `animation: !riduciMovimento` nell'oggetto `option`, e a movimento
  ridotto forzare `layout: "none"` (o fissare `force.friction` a 1 e non animare
  l'assestamento), lasciando il selettore visibile ma inerte con una nota. Il valore va
  nelle dipendenze del `useMemo`.
- **Comando**: `/impeccable animate`

#### [P2] 17 letterali `rgba` e 9 titoli con misure in linea scavalcano i token
- **Posizione**: 14 `rgba` in `InfluenceGraphCanvas.tsx` (`:247`, `:271`, `:278`, `:303`,
  `:414`, `:457`, `:459`, `:479`, `:565`, `:603`, `:616`, `:671`, `:688`), 3 in
  `ClassificheSeed.tsx` (`:150`, `:172`, `:274`); `fontSize` display in linea in
  `ConfrontoGrafi.tsx:80,106`, `EsitoConfronto.tsx:106`, `SovrapposizioneSeed.tsx:52`,
  `CanvasCascata.tsx:72`, `EsitoCascata.tsx:50`, `ClassificheSeed.tsx:84,239`,
  `LimitiMetodologici.tsx:38`
- **Categoria**: Theming
- **Impatto**: `theme.ts` esiste perche' i colori erano finiti in oltre mille letterali e
  le varianti sbagliate passavano inosservate; `tokens.type` esiste perche' ogni pagina
  dichiarava una variante e poi ne riscriveva le misure a mano. I due file non ancora
  migrati riproducono entrambi i difetti in scala ridotta: tre alfa diversi dello stesso
  coral (`0.08`, `0.12`, `0.15`, piu' `0.4` come bordo), sei alfa diversi del bianco, e
  lo stesso ruolo tipografico a tre misure. Nessuno di questi valori e' sbagliato di per
  se': sono ingovernabili, che e' il difetto che i token dovevano rendere impossibile.
- **Raccomandazione**: dichiarare in `theme.ts` la famiglia degli alfa ricorrenti
  (`overlayCoral`, `hairlineOnDark`, `railOnDark`, `disabledOnDark`) e sostituirli;
  passare i nove titoli a `tokens.type.featureHeading` o `cardHeading`. Il lavoro si
  sovrappone al rilievo sull'Atto III e conviene farlo nello stesso passaggio.
- **Comando**: `/impeccable extract`

#### [P2] Inglese e Title Case nelle due classifiche
- **Posizione**: `frontend/src/components/influence/atto3/ClassificheSeed.tsx:86`
  («Leaderboard Top Seed Bot»), `:126` («ACTIVATED (t=1)»), `:238` («Principali Account
  Umani Raggiunti»), `:124`, `:249`; `App.tsx:165` (`aria-label="open drawer"`)
- **Categoria**: Copy / Accessibilita'
- **Impatto**: PRODUCT.md non lascia margine — «la lingua e' l'italiano corrente, in
  tutto: codice, commenti, interfaccia», e «la sigla non definita e' un difetto».
  «Leaderboard Top Seed Bot» e' inglese in Title Case, «ACTIVATED (t=1)» e' inglese in
  un'intestazione di colonna che porta un dato, «Principali Account Umani Raggiunti» e'
  Title Case italiano, che in italiano non esiste. Tutto il resto del capitolo e' in
  stile frase impeccabile, quindi lo stacco si nota. `aria-label="open drawer"` e' la
  stessa cosa per chi ascolta: l'unica stringa inglese della navigazione, e dice «apri»
  anche quando il pannello e' aperto.
- **Raccomandazione**: «I seed che hanno propagato di piu'», «Attivati al passo 1»,
  «Principali account umani raggiunti»; `aria-label` dinamico in italiano piu'
  `aria-expanded` e `aria-controls` sul pulsante hamburger.
- **Comando**: `/impeccable clarify`

#### [P2] Le tabelle dati non dichiarano le intestazioni di riga, e i contenitori scorrevoli non si raggiungono da tastiera
- **Posizione**: `frontend/src/components/influence/atto2/SovrapposizioneSeed.tsx:97`
  (nome dell'algoritmo come `<td>`), `:72` (`TableContainer` non focalizzabile);
  `TabellaBenchmark.tsx:81`, `:41`; `ClassificheSeed.tsx:154`, `:120`, `:246`
- **Categoria**: Accessibilita'
- **Impatto**: nella matrice di Jaccard la prima cella di ogni riga e' il nome
  dell'algoritmo, cioe' l'intestazione di riga, ma e' resa come `<td>`: uno screen reader
  che legge una cella al centro della matrice annuncia un numero senza sapere di quale
  coppia sia — su una matrice 6x6 e' l'unica informazione che conta. Lo stesso nelle
  altre tre tabelle. In piu' i quattro `TableContainer` scorrono in orizzontale ma non
  hanno `tabIndex={0}`: chi naviga da tastiera non puo' farli scorrere, quindi le colonne
  oltre il bordo sono irraggiungibili — ed e' proprio la situazione per cui i contenitori
  sono stati aggiunti.
- **Standard**: WCAG 1.3.1 (A); 2.1.1 (A).
- **Raccomandazione**: `component="th" scope="row"` sulla prima cella di ogni riga;
  `tabIndex={0}` piu' `role="region"` e `aria-label` sui `TableContainer` che possono
  scorrere. Una `<caption>` (anche visivamente nascosta) darebbe alle quattro tabelle il
  nome che oggi hanno solo nel titolo del blocco, e per la matrice risolverebbe anche
  l'orientamento.
- **Comando**: `/impeccable harden`

### P3 — se c'e' tempo

#### [P3] Nessun nome accessibile sui grafici Recharts
In tutto `components/influence/` esiste **un solo** attributo `aria` (il campo di
ricerca, `ClassificheSeed.tsx:105`). I due grafici Recharts (`GraficoCostoBeneficio`,
`AndamentoStep`), la barra di `ComposizioneRaggiunti` e le barre di
`AffidabilitaStimatori` sono `<svg>` e `<div>` muti. Il contesto testuale del `Blocco`
attenua il problema nell'Atto II, dove c'e'; nell'Atto III non c'e' nemmeno quello.
Modello da replicare: il `role="img"` con nome calcolato di
`InfluenceGraphCanvas.tsx:513-519`. — `/impeccable harden`

#### [P3] Il canvas del grafo e' alto 560px fissi
`InfluenceGraphCanvas.tsx:508`. Su uno schermo da 390x844 il riquadro occupa due terzi
dell'altezza utile con ~400 nodi dentro, e le barre dei comandi sopra e sotto vanno a
capo. Un'altezza responsive (`{ xs: 380, md: 560 }`) costa una riga. — `/impeccable adapt`

#### [P3] Bersagli tattili sotto la soglia
Voce di navigazione ~34px di altezza (`VoceNavigazione.tsx:54-55`: `py: 0.85` su testo da
13,5px), pollice dello slider 16x16 (`InfluenceGraphCanvas.tsx:658-660`). Superano il
minimo di 24px di WCAG 2.5.8 ma non i 44px raccomandati, e il pollice dello slider e' il
comando piu' preciso della pagina. — `/impeccable adapt`

#### [P3] Tre eccezioni di elevazione non dichiarate in DESIGN.md
`App.tsx:154-155` (vetro della barra), `SidebarNavigazione.tsx:108` (ombra del pannello),
`InfluenceGraphCanvas.tsx:248-249` (bagliore dei nodi). Tutte e tre hanno una motivazione
funzionale scritta nel codice; nessuna e' fra le due eccezioni che DESIGN.md ammette. Da
dichiarare nel documento o da togliere. — `/impeccable document`

#### [P3] Due raggi fuori scala
`ConfrontoGrafi.tsx:142` (`2px`) e `ClassificheSeed.tsx:112` (`24px`, dove il campo di
ricerca vuole `tokens.radius.pill`). Sono i due soli rilievi di `detect.mjs` su tutto il
perimetro. — `/impeccable polish`

#### [P3] Space Grotesk sulle etichette dei nodi del grafo
`InfluenceGraphCanvas.tsx:254` — `fontFamily: "Space Grotesk, Inter, monospace"` sulle
etichette disegnate nel canvas, che sono valori di dato. DESIGN.md riserva il display a
titoli, cifre e navigazione; e la catena di fallback mescola due sans e un monospazio,
quindi il disegno cambia carattere a seconda di cosa e' caricato. — `/impeccable typeset`

#### [P3] Navigazione: nessun salto al contenuto, nessuna gestione del focus fra rotte
`App.tsx:184-195`. Otto voci di navigazione precedono il contenuto in ordine di
tabulazione e non c'e' un collegamento «salta al contenuto»; cambiando rotta il focus
resta dov'era e il titolo del documento non cambia, quindi chi usa uno screen reader non
riceve nessun segnale che la pagina e' un'altra. I landmark (`<nav>`, `<main>`) ci sono e
sono etichettati, quindi non e' un fallimento pieno di 2.4.1. — `/impeccable harden`

#### [P3] La suite di test impiega 17 minuti per 157 s di test
`vitest run`: 34 file, 187 test, tutti verdi, **1011 s totali** di cui `tests 157 s` e
`collect 10406 s` cumulativi fra i worker. Cinque sesti del tempo sono trasformazione e
raccolta dei moduli, non esecuzione: ogni file di test ritrasforma il grafo di import di
MUI, Recharts ed ECharts. Non e' un difetto di prodotto, ma a questa durata la suite
smette di essere eseguita prima di un commit — cioe' smette di servire. Da valutare
`deps.optimizer` di Vitest o `server.deps.inline`, e `--no-file-parallelism` per
misurare il costo reale per file.

## Pattern sistemici

1. **Il redesign e' fermo a due terzi.** Il guscio `narrativa/` e `navigazione/` e' nuovo
   e disciplinato; l'Atto II e' stato migrato; l'Atto III e `InfluenceGraphCanvas.tsx`
   sono rimasti indietro. Tutti i rilievi di theming, quasi tutti quelli di
   accessibilita' e tutti quelli di performance stanno in quei due luoghi. Non e' un
   insieme di difetti sparsi: e' un confine di migrazione, e si chiude completando la
   migrazione.
2. **L'accessibilita' e' concentrata in un file.** In tutto `components/influence/` c'e'
   **un solo** attributo `aria`. Tutta l'ottima strumentazione — `role="img"` con nome
   calcolato, regione `aria-live`, `getAriaValueText`, nomi che cambiano con lo stato —
   vive in `InfluenceGraphCanvas.tsx`. Altrove chi ascolta incontra un `<svg>` muto dove
   chi guarda vede un grafico.
3. **Il codice ha superato il documento in tre punti.** Ombra del pannello, vetro della
   barra, bagliore dei nodi: tre decisioni motivate per iscritto nel codice e assenti da
   DESIGN.md. Finche' il documento non le registra, il prossimo componente non sa se sono
   precedenti o eccezioni.

## Cosa funziona (da mantenere e replicare)

- **I token sono reali e i rapporti dichiarati sono corretti.** Ho ricalcolato le coppie
  documentate in `theme.ts`: `textMuted` da' 5,35:1 sul canvas e 4,53:1 sulla pietra
  (dichiarati 5,4 e 4,5), il bianco al 72% sul verde di capitolo 7,17:1, il coral su
  `darkCanvas` 7,42:1, `nearBlack` su coral 6,83:1. Non sono numeri copiati da un
  generatore: sono calcolati sulla superficie peggiore su cui la tinta compare davvero, e
  i commenti spiegano quale.
- **`useMovimentoRidotto` e' migliore di quello che ha sostituito.** Reattivo al cambio
  di preferenza a pagina aperta, con la distinzione giusta fra «non parte da sola» e «non
  parte», e con il fotogramma di riposo scelto (l'ultimo passo, non il primo). Il
  commento che spiega perche' l'effetto e' separato dal ciclo di riproduzione documenta un
  bug reale e la sua soluzione.
- **Le etichette della sidebar svaniscono in opacita' invece di uscire dal documento.**
  E' la scelta giusta e per la ragione giusta, scritta nel codice: `display: none`
  cambierebbe il nome accessibile del collegamento a seconda della posizione del mouse. Il
  difetto residuo e' il modo di aprire il pannello, non il modo di nasconderlo.
- **La cornice `CanvasCascata` dichiara cosa il canvas *non* mostra.** Il canvas disegna
  60 seed su migliaia e l'avvertenza lo dice in italiano corrente, accanto al disegno, con
  i due limiti nominati da costanti condivise col backend. E' il Principio 1 di PRODUCT.md
  applicato al caso piu' scomodo.
- **Un solo vocabolario per il grafo.** La legenda ECharts e' spenta e sopravvive quella
  in DOM, l'unica raggiungibile da una tecnologia assistiva; i nomi delle categorie nei
  dati sono le stesse parole della legenda. Chiude un rilievo P1 della critique precedente.
- **Gli stati di errore e vuoto distinguono i casi.** `ErrorState` con ritentativo
  opzionale (perche' un dato che la pipeline non ha mai prodotto non cambia se lo si
  richiede), vuoto-da-ricerca e vuoto-da-set detti diversamente, `n/d` invece di zeri
  inventati. Il segnaposto dell'Atto I che diventa un errore invece di restare grigio per
  sempre chiude un altro P1 della critique.
- **ECharts registrato a mano.** Da 1.129 kB minificati a soli `GraphChart`,
  `SankeyChart`, due componenti e il renderer canvas, con il perche' documentato nel file.
  Recharts ed ECharts convivono per una ragione dichiarata (grafici standard contro grafo
  e sankey) e arrivano entrambi in chunk di rotta, non nell'ingresso.
- **`OFFSET_INDICE_PX` governa sia lo sticky sia lo `scrollMarginTop`.** Un valore, due
  usi che devono coincidere: il tipo di divergenza che si nota solo quando c'e', resa
  impossibile.
- **`tsc --noEmit` ed `eslint src` puliti; 187 test verdi.**

## Azioni consigliate, in ordine

1. **[P1] `/impeccable harden`** — escape del tooltip, righe operabili da tastiera, nomi
   accessibili sui due `Select`, props del dataset non piu' cablate, intestazioni di riga
   e contenitori scorrevoli focalizzabili.
2. **[P1] `/impeccable adapt`** — comando di apertura persistente per la navigazione e
   default espanso sotto `@media (hover: none)`, altezza responsive del canvas, bersagli
   tattili.
3. **[P2] `/impeccable layout`** — completare la migrazione dell'Atto III a `Blocco`:
   titoli, descrizioni, `<h3>`, e via i due `Paper` ricostruiti a mano in
   `ClassificheSeed`.
4. **[P2] `/impeccable colorize`** — la legenda del canvas sul fondo che descrive.
5. **[P2] `/impeccable clarify`** — le due note nel `title`, l'inglese e il Title Case
   delle classifiche, l'`aria-label` del pulsante hamburger.
6. **[P2] `/impeccable optimize`** — `notMerge` e `shadowBlur` nel ciclo di riproduzione,
   con misura prima e dopo.
7. **[P2] `/impeccable animate`** — `prefers-reduced-motion` dentro l'oggetto ECharts e
   sul layout a forze.
8. **[P2] `/impeccable extract`** — famiglia degli alfa in `theme.ts`, i nove titoli a
   `tokens.type`.
9. **[P3] `/impeccable document`** — registrare in DESIGN.md le tre eccezioni di
   elevazione, o togliere quelle che non si vogliono.
10. **[P3] `/impeccable polish`** — passaggio finale: i due raggi fuori scala, il font
    display sulle etichette dei nodi, il salto al contenuto e la gestione del focus fra
    rotte.

---

## Esito della correzione (19 agosto 2026)

Tutti e dieci i comandi consigliati sono stati eseguiti in un unico passaggio.
Cosa e' cambiato, nell'ordine dei rilievi.

### P1

| Rilievo | Esito |
|---|---|
| Tooltip senza escape | `utils/html.ts` — nuovo `escapeHtml`, applicato ad `acct` e `id` nel formatter (`InfluenceGraphCanvas.tsx`). Non si e' passati a `renderMode: "richText"` perche' avrebbe richiesto di riscrivere il tooltip in un linguaggio che non conosce i colori del tema. |
| Righe cliccabili solo col mouse | Nuovo componente locale `NomeAccount` in `ClassificheSeed.tsx`: il nome dell'account e' un `ButtonBase` con `aria-label` che dice cosa fa l'azione. Il clic sulla riga resta per il mouse e il bottone ferma la propagazione. Le due classifiche sono ora percorribili da tastiera. |
| Due `Select` senza nome | `inputProps={{ "aria-label": ... }}` sul selettore del seed e su quello della velocita'. |
| Etichette della navigazione solo in hover | Nuovo comando di blocco in cima al pannello (`ContenutoNavigazione`), dentro i 72px visibili a riposo, con `aria-expanded`. `SidebarNavigazione` accetta `bloccata`/`onCambiaBlocco`; lo stato vive in `App` perche' a pannello bloccato l'area contenuto gli fa spazio invece di lasciarselo coprire. Due test nuovi in `SidebarNavigazione.test.tsx`. |
| Default cablati sul dataset | `maxStep` e' ora una prop obbligatoria; `selectedSeedId` resta opzionale ma si risolve su `topSeeds[0]?.id`. Nessun identificativo di riga fra i valori di default. |

### P2

| Rilievo | Esito |
|---|---|
| Atto III non migrato | I quattro artefatti sono in `Blocco` con titolo, descrizione e `<h3>`: due nella pagina (`AndamentoStep`, `ComposizioneRaggiunti`), uno per il canvas, due dentro `ClassificheSeed`, che perde le due `Paper` ricostruite a mano. `EsitoCascata` resta nudo sul canvas come `EsitoConfronto`: e' l'affermazione dell'atto, non un artefatto. Le due soglie del sottografo sono ora in `influenceContent.ts` (`SOTTOGRAFO_CANVAS`), con la copia che le nomina. |
| Legenda sotto contrasto | La legenda e' passata a `InfluenceGraphCanvas` come prop e resa in una fascia `darkCanvas` a filo del grafo. Le quattro tinte sono a casa loro: coral 7,4:1, testo `textOnDark` 6,4:1. Resa come `ul`/`li`, che e' cio' che e'. |
| Note nel `title` | Due `caption` in pagina in `TabellaBenchmark`, nella stessa forma che la colonna dei seed usava gia'. Nessun `title` resta nel perimetro. |
| `notMerge` + `shadowBlur` | `notMerge` rimosso: fra un passo e l'altro cambiano solo tinte e dimensioni, non la struttura della serie. `shadowBlur` limitato ai soli sessanta seed; i nodi appena attivati restano distinguibili per tinta, dimensione e bordo. Come effetto collaterale tornano le transizioni interne di ECharts, che `notMerge` disabilitava. |
| Reduced motion fuori dal grafico | `animation: !riduciMovimento` nell'oggetto `option`, e `force.layoutAnimation: !riduciMovimento` sul layout a forze, che si calcola prima del primo disegno invece di assestarsi a vista. Stesso grafo, senza moto. |
| 17 `rgba` + 9 misure in linea | Nuovo gruppo `tokens.overlay`, quindici velature nominate per contesto. Zero `rgba` residui nel perimetro. Nuovi ruoli `type.affermazione` e `type.titoloVoce`; le cifre di `ConfrontoGrafi` passano a `cardHeading`. |
| Inglese e Title Case | «I seed che hanno propagato di piu'», «Principali account umani raggiunti», «ATTIVATI AL PASSO 1», «PASSO DI ATTIVAZIONE», chip «passo 3». Il pulsante della barra dice «Apri/Chiudi la navigazione» e porta `aria-expanded` e `aria-controls`. |
| Semantica delle tabelle | `component="th" scope="row"` sulla prima cella di riga nelle quattro tabelle; `tabIndex={0}`, `role="region"` e `aria-label` sui contenitori che scorrono. |

### P3

Tutti chiusi: nomi accessibili sui due grafici Recharts (`role="img"` con un riassunto
che cita i numeri veri, e per il costo-beneficio il rimando alla tabella che porta gli
stessi valori) e `aria-hidden` sulle due grafiche i cui numeri sono gia' nel testo
accanto; altezza del canvas responsive (`{ xs: 380, sm: 460, md: 560 }`); pollice dello
slider a 20px, 28px sotto `pointer: coarse`, e voci di navigazione a 44px minimi sullo
stesso media query; eccezioni di elevazione dichiarate in DESIGN.md (e il vetro della
barra superiore **rimosso** invece che grandfathered: su canvas bianco non rendeva
nulla e costava un livello di composizione); i due raggi fuori scala; le etichette dei
nodi passate al carattere del corpo; collegamento «salta al contenuto» e nuovo hook
`useCambioRotta`, che aggiorna il titolo del documento e riporta il focus all'inizio a
ogni cambio di rotta.

Resta aperta la lentezza della suite (1011 s per 157 s di test): e' un rilievo di
esperienza di sviluppo, non di prodotto, e la sua diagnosi non passa da un comando
`/impeccable`.

### Due difetti introdotti durante la correzione, e chiusi

Vanno scritti perche' sono il tipo di cosa che una correzione fa e non racconta.

1. **Animare la larghezza.** Far seguire l'area contenuto al pannello bloccato era stato
   scritto con una transizione su `width` e `margin-left`: `detect.mjs` l'ha colta subito
   (`layout-transition`, due rilievi). Animare una proprieta' di layout vuol dire
   ricalcolare il layout dell'intera pagina per una decina di fotogrammi, canvas del
   grafo compreso — cioe' esattamente il costo che `misure.ts` esisteva per evitare. Il
   cambio ora e' di scatto. Il foglio del pannello continua ad animarsi perche' e' in
   posizione fissa, quindi fuori dal flusso: stessa proprieta', due costi diversi.
   In piu' i grafici ECharts si ridimensionano su `resize` della *finestra*, non del
   proprio contenitore: senza avviso il canvas sarebbe rimasto disegnato alla larghezza
   precedente e riscalato dal CSS. Ora `App` emette un `resize` dopo il riflusso.
2. **Un `href="#..."` sotto `HashRouter`.** Il collegamento «salta al contenuto» era nato
   come ancora normale, che qui sostituisce la rotta: `#/influence-maximization` sarebbe
   diventato `#contenuto-principale`, nessuna rotta avrebbe corrisposto e il contenuto
   sarebbe sparito. E' lo stesso inciampo che `IndiceAtti` documenta, e la soluzione e' la
   stessa: `preventDefault` piu' focus a mano, `href` mantenuto perche' e' cio' che rende
   l'elemento un collegamento. Il collegamento era anche `position: absolute`, quindi
   sarebbe comparso in cima al *documento* — fuori dallo schermo per chi lo mette a fuoco
   a pagina scorsa, cioe' proprio quando serve. Ora e' `fixed`.
