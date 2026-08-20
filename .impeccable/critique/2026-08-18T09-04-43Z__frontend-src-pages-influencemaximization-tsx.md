---
target: Capitolo IV — Influence Maximization
total_score: 24
p0_count: 0
p1_count: 4
timestamp: 2026-08-18T09-04-43Z
slug: frontend-src-pages-influencemaximization-tsx
---
Method: dual-agent (A: revisione di design · B: rilevatore + evidenze)
⚠️ Ispezione browser NON disponibile: l'estensione Chrome non è connessa (`list_connected_browsers` → `[]`). Il dev server su :5173 risponde 200, quindi il problema è il ponte, non l'app. Nessun overlay è stato iniettato, nessuna misura di layout è stata presa. Due rilievi sono marcati *non verificato*.

## Design Health Score

| # | Euristica | Punteggio | Problema principale |
|---|-----------|-------|-----------|
| 1 | Visibilità dello stato del sistema | 2 | Se `useInfluenceComparisonQuery` fallisce, Atti I e II restano un rettangolo grigio per sempre: nessun errore, nessun ritentativo |
| 2 | Corrispondenza col mondo reale | 3 | Prosa italiana eccellente, incrinata da «Apache ECharts» nel titolo, «Leaderboard Top Seed Bot», «ACTIVATED (t=1)» e cinque sigle mai definite |
| 3 | Controllo e libertà | 3 | Stato in URL, tasto Indietro corretto, `prefers-reduced-motion` onorato davvero; ma un clic sulla riga fa due cose e il modale copre il canvas appena cambiato |
| 4 | Coerenza e standard | **1** | Il coral significa tre cose nello stesso atto; due legende contraddittorie a schermo insieme; superficie scura sbagliata; sette letterali `rgba` a mano |
| 5 | Prevenzione dell'errore | 3 | `n/d` invece di zeri inventati, e il rifiuto di calcolare un margine contro la riga sbagliata; ma `selectedSeedId = "66109"` è cablato |
| 6 | Riconoscere invece di ricordare | 3 | Indice sticky e occhielli d'atto ottimi; quattro artefatti dell'Atto II senza alcun titolo |
| 7 | Flessibilità ed efficienza | 2 | Nodi del grafo irraggiungibili da tastiera; nessun percorso dalla classifica al nodo; nessuna esportazione del benchmark |
| 8 | Estetica e minimalismo | 2 | Corpo del capitolo disciplinato e silenzioso, con sopra un HUD di telemetria in vetro luminoso |
| 9 | Recupero dall'errore | **1** | `h6` rosso nudo che scavalca `ErrorState`; stato vuoto con la formula vietata alla lettera; nessun ritentativo |
| 10 | Aiuto e documentazione | **4** | Ogni cifra porta la provenienza, la formula cita il file sorgente, il caveat sta accanto al canvas, i limiti hanno un atto intero |
| **Totale** | | **24/40** | **Accettabile — servono miglioramenti sostanziali** |

## Verdetto anti-pattern

### Valutazione LLM

**Questa pagina ha due autori.** Atti I, II e IV più il guscio `narrativa/` sono l'opposto dello slop: la prosa è prosa vera, i componenti rifiutano di disegnare ciò che non sanno giustificare. Poi si scorre nell'Atto III e si arriva a `InfluenceGraphCanvas.tsx`, che sembra precedere il redesign e non esserci mai stato allineato.

Ban assoluti — riscontri confermati leggendo il sorgente:

| Ban | Stato | Evidenza |
|---|---|---|
| Glassmorphism decorativo | **VIOLATO** | `InfluenceGraphCanvas.tsx:549-551` — `backdropFilter: "blur(10px)"` + `rgba(13,13,16,0.85)` + bordo bianco al 15% su un overlay «telemetria» flottante |
| Ombre / bagliori decorativi | **VIOLATO** | `:690` — `boxShadow: "0 0 12px rgba(0,229,255,0.9)"` sul pollice dello slider |
| Testo in gradiente | pulito | — |
| Bordi laterali >1px | pulito | nessun `borderLeft`/`borderRight` in `influence/` |
| Template hero-metric | pulito | la banda porta tre cifre contestualizzate |
| Griglie di card identiche | pulito | forme dei componenti realmente varie |
| Occhiello maiuscolo sopra ogni sezione | **guadagnato, non slop** | vedi sotto |
| Marcatori numerati come impalcatura | **guadagnato, non slop** | vedi sotto |
| Testo che trabocca dal contenitore | **probabile** *(non verificato)* | vedi P4 |

**Gli «ATTO I/II/III/IV» sono una sequenza narrativa guadagnata.** `IntestazioneAtto.tsx:22-24` mette in occhiello «Atto II — Quale algoritmo» mentre l'`<h2>` sotto porta la *domanda* («Fra cinque metodi di selezione, quale conviene davvero usare?»). L'occhiello dice la posizione nella narrazione, il titolo dice l'argomento: non si sovrappongono mai, che è esattamente il test posto da DESIGN.md. Fa anche da ponte di memoria verso l'indice sticky, che usa la stessa stringa. Da tenere così com'è.

**Lo slop sta tutto in `InfluenceGraphCanvas.tsx`, ed è l'oggetto più rumoroso del capitolo.** Oltre al vetro e al bagliore:

- `:418` — **«Grafo di Propagazione Apache ECharts»** come titolo di sezione. `:566` — **«TELEMETRIA APACHE ECHARTS»**. `:424` — **«Simulazione WebGL/Canvas»**. La libreria di grafici è nominata in un'intestazione che leggerà una commissione di tesi: annuncia lo strumento invece del risultato, e «WebGL/Canvas» è un'affermazione sullo stack di rendering irrilevante per l'argomentazione. PRODUCT.md chiede «tono da laboratorio di ricerca, non da prodotto»: questo è il registro di una demo da bootcamp.
- **Title Case italiano**, confinato a questo file: «Passo Attuale» `:571`, «Popolazione Raggiunta» `:588`, «Radiale Onde» `:482`, «Forza Fisica» `:485`. L'italiano non va in Title Case, e tutto il resto del capitolo è impeccabilmente in stile frase.
- **Lessico epidemico** — «NUOVO INFETTO» `:140`, «CONTAGIATO» `:310` — in un capitolo che altrove evita con cura le inquadrature caricate (`AffidabilitaStimatori.tsx:29-32` rifiuta esplicitamente il rosso/verde perché «nessuna delle due è un errore da penalizzare»).

Alla domanda «direbbero che l'ha fatto un'IA?» la risposta è no. Direbbero che *un designer competente ne ha fatto tre quarti e una persona diversa, più chiassosa, ha fatto la console del grafo.* Che per una discussione di tesi è probabilmente peggio, perché l'incoerenza è proprio il segnale che il Principio 5 di PRODUCT.md dice che la commissione rileggerà a monte, nella pipeline.

### Scansione deterministica

`detect.mjs` su `InfluenceMaximization.tsx` + `components/influence` + `InfluenceGraphCanvas.tsx`: **exit code 2, 7 rilievi, una sola regola**.

| Regola | Severità | N. |
|---|---|---|
| `design-system-radius` (raggio fuori da DESIGN.md) | advisory | 7 |

Valori fuori scala (la scala dichiarata è 4/8/12/16/22/30/32): `2px` in `ConfrontoGrafi.tsx:142` e `ComposizioneRaggiunti.tsx:55,69`; `24px` in `ClassificheSeed.tsx:109` (il campo di ricerca è specificato a pastiglia 32); `20px`, `10px`, `6px` in `InfluenceGraphCanvas.tsx:441,463,468`.

**Nessuno dei 7 è un falso positivo** — verificati uno per uno contro DESIGN.md. Vale la pena notare due cose sui *non*-rilievi: il filetto da 3px in alto sulla `scheda-cifra` e i marcatori mono «ATTO I/II/III» **non hanno fatto scattare nulla**. Il rilevatore ha lasciato in pace i dispositivi intenzionali, il che è una conferma indipendente che l'impalcatura narrativa è guadagnata.

**Dove il rilevatore ha mancato il bersaglio, e conta.** La scansione ha letto `InfluenceGraphCanvas.tsx` (tre dei sette rilievi sono lì) e **non ha segnalato il `backdropFilter: blur(10px)`** — un ban assoluto, non un'advisory. È un falso negativo su una regola dura: la scansione automatica qui non è una rete di sicurezza. Il tema di questa critica è che lo slop del progetto non vive nelle forme che il rilevatore conosce — vive nella **semantica** (il coral che significa tre cose), nel **registro della copia** (il nome della libreria in un titolo) e nella **copertura degli stati**. Nessuna delle tre è rilevabile staticamente.

### Overlay visivi

Nessuno. L'iniezione non è stata tentata perché l'estensione Chrome non è connessa; il live server non è mai partito e non c'è nessun processo orfano. Non c'è alcun overlay visibile nel browser.

## Impressione generale

Il capitolo argomenta meglio di quasi tutte le interfacce di ricerca che si vedono: l'Atto II costruisce un risultato che una commissione si porta via (il vincitore vince per una frazione di punto e costa 961 volte il tempo, e un semplice ordinamento per grado gli sta dietro gratis), e l'Atto IV lo ridimensiona senza attenuanti, sul canvas nudo, con lo stesso peso tipografico dei risultati. Il finale è forte: la regola picco-fine è soddisfatta.

Il problema è che fra l'argomento migliore e la sua conclusione c'è l'oggetto più grande e più rumoroso della pagina, ed è quello meno rigoroso. **La singola opportunità più grande: riportare `InfluenceGraphCanvas.tsx` dentro il sistema che il resto del capitolo rispetta.** Non è un lavoro di design nuovo — è già tutto scritto in DESIGN.md.

## Cosa funziona

**1. `EsitoConfronto.tsx:44-47` — il ramo che si rifiuta di mentire.** Il backend spedisce un `winner_by_mc_spread` con fallback cablato a `"CELF++"`. Se quel nome non coincide col primo posto misurato per spread, il componente rende *una frase diversa* che spiega l'incoerenza invece di calcolare un margine contro la riga sbagliata. Trasforma un rischio d'integrità del dato in evidenza visibile di cura — esattamente «la sensazione che chi ha costruito questo abbia guardato i casi difficili prima che glieli facessero notare». Quasi nessuna interfaccia lo fa.

**2. `AffidabilitaStimatori.tsx:36-42` e `:74-101` — due rifiuti corretti in un componente solo.** Esclude `degree` e `pagerank` invece di disegnarli a deviazione zero, perché non producono stima e uno zero si leggerebbe come «stimatore perfetto». E rende la deviazione come barra monocroma centrata sullo zero, codificando la direzione con la *posizione*, rifiutando il rosso/verde perché nessuna delle due direzioni è una colpa. Entrambe le scelte costano ricchezza visiva e comprano verità.

**3. `ConfrontoGrafi.tsx:47` — scala corretta per area, con la didascalia che lo dimostra.** Il lato del quadrato interno è `sqrt(rapporto)`, così è l'*area* a portare il 3,1% dei nodi; la didascalia dichiara che è l'area e non il lato; e il 15,8% degli archi è enunciato a parte perché *è un'affermazione diversa*. È il punto in cui la maggior parte dei progetti bara in silenzio.

## Problemi prioritari

### [P1] `InfluenceGraphCanvas.tsx` appartiene a un altro sistema di design

**Cosa.** Glassmorphism (`:549-551`), bagliore ciano decorativo (`:690`), superficie scura sbagliata (`:289`, `:387` usano `nearBlack` `#17171c` — il nero *di marchio* — invece di `darkCanvas`, mentre le sue stesse barre console a `:403` e `:602` usano correttamente `darkCanvas`), branding della libreria nella copia (`:418`, `:424`, `:566`), Title Case italiano, lessico epidemico, sette letterali di colore a mano, quattro raggi fuori scala, e una legenda ECharts (`:318-323`, «1. SEED BOT FOCUS / 2. NUOVO INFETTO / 3. ATTIVO CONTAGIATO / 4. INATTIVO») che contraddice la legenda DOM sotto (`CanvasCascata.tsx:28-33`, «seed bot di origine / nodo appena attivato… / nodo attivo, contagiato… / nodo non ancora raggiunto») — **stessi quattro stati, due vocabolari, entrambi a schermo insieme**.

**Perché conta.** È l'oggetto che un pubblico in proiezione fissa più a lungo, ed è quello che più sembra assemblato anziché progettato. Arriva subito dopo l'Atto II e ne erode la credibilità appena costruita. PRODUCT.md §5: l'incoerenza «suggerisce la stessa distrazione anche a monte, nel codice che produce i numeri».

**Fix.** (a) Eliminare l'overlay telemetria `:541-594`: le sue tre cifre duplicano l'etichetta dello scrubber e la legenda DOM, e la percentuale è fuorviante (vedi P3). (b) `:418` → «La cascata, passo per passo»; togliere `:424`, tenere solo «Passo N di M». (c) `:289`/`:387` → `tokens.color.darkCanvas`. (d) `:690` → via il `boxShadow`. (e) `:318-323` → `legend: { show: false }`, tenendo solo la legenda DOM, che è quella accessibile. (f) Stile frase in tutto il file; «infetto/contagiato» → «attivato», per accordarsi a `CanvasCascata`.

**Comando suggerito:** `/impeccable quieter frontend/src/components/InfluenceGraphCanvas.tsx`

### [P1] Il coral significa tre cose, e un commento dichiara una coerenza che non esiste

**Cosa.** `ComposizioneRaggiunti.tsx:44` riempie il segmento «IA» con `tokens.color.coral` e `:38` riempie «umani» con `tokens.color.actionBlue`. Uno scroll dopo, `CanvasCascata.tsx:29` etichetta il coral «seed bot di origine». E dentro l'Atto III il coral compare una terza volta in `AndamentoStep.tsx:97` per l'area cumulata.

Il punto grave è il docstring del componente stesso, `ComposizioneRaggiunti.tsx:17-19`: «*I colori sono gli stessi usati altrove nel progetto per la stessa distinzione: `actionBlue` per gli account umani, `coral` per gli account IA*». **È falso.** `tinte.ts:32` dichiara `TINTA_UMANO = deepGreen` e `:35` dichiara `TINTA_IA = purple`; `actionBlue` è riservato ai link editoriali e a FastDetectGPT. Il file `tinte.ts` esiste letteralmente per impedire questo — il suo header dice: «*il coral voleva dire "bot" in un riquadro e "IA" in quello accanto, e la legenda andava riletta a ogni blocco*». È ricomparso, nello stesso atto, con accanto un commento che ne certifica la correttezza.

**Perché conta.** Un lettore in proiezione deve rileggere la legenda a ogni blocco, che è precisamente il costo che il sistema di tinte era stato scritto per eliminare. E il commento falso è peggio del bug: la prossima persona che tocca il file si fiderà.

**Fix.** Importare da `tinte.ts`: `TINTA_IA` (viola) per il segmento IA, `TINTA_UMANO` (verde) per gli umani, e correggere il docstring. Se la semantica reale qui è «bot» e non «IA», cambiare le *etichette* e tenere il coral — ma scegliere, e far concordare la legenda del canvas.

**Comando suggerito:** `/impeccable colorize frontend/src/components/influence/atto3`

### [P1] L'Atto II presenta quattro artefatti senza titolo di fila

**Cosa.** `InfluenceMaximization.tsx:149-164` rende `EsitoConfronto`, `GraficoCostoBeneficio`, `TabellaBenchmark`, `AffidabilitaStimatori` e `SovrapposizioneSeed` in una colonna flex nuda. Solo il primo ha una frase introduttiva. **Gli altri quattro non hanno titolo, né occhiello, né descrizione.** `AffidabilitaStimatori` apre a freddo con barre che dicono «CELF++ / stima 866,5 · MC 872,1 · −0,6%» e si spiega solo *dopo* (`:108-112`). `TabellaBenchmark` compare senza alcuna intestazione.

**Perché conta.** È l'atto che porta l'argomento migliore del capitolo, ed è quello in cui il lettore è meno attrezzato. DESIGN.md definisce il `blocco` con «occhiello mono opzionale, titolo in `featureHeading`, descrizione entro 70ch»: l'Atto II non ne usa nessuno. Il Principio 3 — «spiegare prima di mostrare» — viene violato quattro volte in uno scroll.

**Fix.** Avvolgere ciascuno in un `blocco` con titolo in `featureHeading` e una riga di descrizione, e spostare la frase di sintesi di `AffidabilitaStimatori` sopra le barre. Titoli proposti: «Costo contro beneficio» / «Il confronto, riga per riga» / «Quanto sono affidabili le stime interne» / «Scelgono gli stessi seed?». Non esiste ancora una primitiva `Blocco` in `narrativa/`: estrarla è la mossa giusta, visto che `ClassificheSeed` ne ricostruisce la stessa forma a mano due volte.

**Comando suggerito:** `/impeccable layout frontend/src/pages/InfluenceMaximization.tsx`

### [P1] Stati di errore e vuoto scavalcano il sistema che esiste per loro

**Cosa.** Quattro guasti distinti.
1. `InfluenceMaximization.tsx:101-109` rende un `<Typography variant="h6" color="error">` centrato e nudo, invece di `ErrorState`, che vive in `States.tsx:37-56` e produce il riquadro pericolo specificato.
2. `ClassificheSeed.tsx:187` dice «Nessun seed trovato.» — la formulazione che DESIGN.md vieta testualmente («non «nessun risultato»»).
3. La query di confronto **non ha alcun percorso d'errore**: se `useInfluenceComparisonQuery` fallisce, `:144` e `:161` rendono il segnaposto grigio per sempre e gli Atti I e II semplicemente non compaiono mai. Il modo di fallire più probabile si presenta come un vuoto silenzioso.
4. `InfluenceGraphCanvas.tsx:497-505` — l'aria-label dice «pari al N per cento **della rete**», ma `pctInfected` (`:363`) è calcolato su `rawNodes.length`, cioè il sottografo disegnato di ~400 nodi, non la rete. L'overlay visibile a `:588-591` ripete la stessa affermazione.

**Perché conta.** Il punto 4 è una violazione del Principio 1 (ogni numero porta la sua provenienza) piazzata dentro il *nome accessibile* — l'unica descrizione che un utente di screen reader non può confrontare con la didascalia che la corregge poco sopra. Il punto 3 significa che in produzione il guasto più probabile è indistinguibile da un caricamento lento infinito.

**Fix.** Usare `ErrorState` a livello di pagina con un messaggio che nomini cosa manca. Riscrivere il vuoto: «Nessun seed corrisponde a «{query}». La ricerca filtra su nome account e ID.» Destrutturare `isError` da `useInfluenceComparisonQuery` e rendere `ErrorState` al posto di `segnaposto`. Correggere l'aria-label e l'overlay in «del sottografo disegnato», o togliere la percentuale.

**Comando suggerito:** `/impeccable harden frontend/src/pages/InfluenceMaximization.tsx`

### [P2] Due tabelle senza contenitore di scorrimento *(non verificato — ispezione browser fallita)*

**Cosa.** `TabellaBenchmark.tsx:34` e `SovrapposizioneSeed.tsx:69` rendono un `<Table>` nudo senza `<TableContainer>`. `ClassificheSeed.tsx:117` e `:236` avvolgono correttamente le proprie: è un'incoerenza, non uno stile di casa.

**Perché conta.** A 390px la colonna di contenuto è circa 358px. `TabellaBenchmark` ha cinque colonne con padding di tema da 16px per lato e intestazioni come «Spread Monte Carlo»; la matrice di Jaccard ne ha sei. La larghezza min-content quasi certamente eccede la colonna, e senza un antenato con `overflow-x: auto` il traboccamento si propaga al body — cioè il ban assoluto «testo che trabocca dal contenitore». Una pagina che scorre in orizzontale durante una discussione dal vivo è il guasto più imbarazzante possibile.

**Non ho potuto confermarlo a 390px** perché il ponte del browser era giù. Da verificare mentre si corregge.

**Fix.** Avvolgere entrambe in `<TableContainer sx={{ overflowX: "auto" }}>`. Per `TabellaBenchmark`, valutare anche un layout impilato su due righe sotto `sm`: cinque colonne numeriche non sono una tabella da telefono.

**Comando suggerito:** `/impeccable adapt frontend/src/components/influence/atto2`

## Carico cognitivo

**5 fallimenti su 8 → carico ALTO.**

| # | Verifica | Esito |
|---|---|---|
| 1 | Fuoco singolo | **FALLITO** |
| 2 | Raggruppamento ≤4 per gruppo | **FALLITO** |
| 3 | Prossimità degli elementi correlati | superato |
| 4 | Gerarchia visiva | **FALLITO** |
| 5 | Una cosa alla volta | **FALLITO** |
| 6 | ≤4 opzioni visibili per punto di decisione | **FALLITO** |
| 7 | Memoria di lavoro | superato, e con merito |
| 8 | Divulgazione progressiva | superato |

- **(1)(2)(4)** L'Atto II: cinque componenti di peso visivo identico, quattro senza annuncio (vedi P1 sopra).
- **(5) Doppia azione su un clic.** `ClassificheSeed.tsx:140-143` chiama `onSelectSeed(s.id)` *e* `onSelectAccount(s.id)`. Un clic ridisegna il canvas sopra *e* getta un modale sopra il canvas. Non si può usare la classifica come controllo del grafo senza chiudere un dialogo ogni volta.
- **(5) Movimento in competizione.** La cascata parte in autoplay al montaggio (`:96`), fino a un fotogramma ogni 300 ms, in mezzo a una pagina su cui si sta leggendo prosa.
- **(6) Nove gruppi di controllo in una barra.** Select del seed (potenzialmente decine di voci), ToggleGroup del layout, play/pausa, riavvio, precedente, successivo, slider dei passi, select della velocità, più roam/pan/zoom sul canvas. È la violazione >4 più netta della pagina.
- **(6) Due legende insieme** per gli stessi quattro stati, con vocabolari diversi (vedi P1).

**Merito su (7):** i ponti di memoria sono insolitamente buoni e deliberati — `EsitoConfronto.tsx:161` («Algoritmo adottato per l'Atto III»), `CanvasCascata.tsx:79-81` («Il conteggio dei nodi raggiunti riportato nell'Atto III si riferisce alla cascata completa»), e la chiusura della banda («l'atto che segue spiega perché la differenza conta»). Ogni atto passa al successivo un testimone etichettato. Da non perdere in nessuna rilavorazione.

## Percorso emotivo

Lettore modello: una commissione, su proiettore, una passata sola, competente nel metodo ma non nell'influence maximization.

- **Apertura — calma e sicura.** Intestazione di capitolo, guida, domanda dell'Atto I. Ritmo corretto.
- **Prima valle, e arriva presto.** `SchedaProblema.tsx:95-104` scarica dieci righe di parametri: `n_sub`, `k`, `theta`, `num_rr`, `mc_runs_celf`, `eval_runs`, `random_seed`, `ic_p0`, `ic_cap`, `ic_method`. **Nessuno fra `theta`, `num_rr`, `mc_runs_celf`, `eval_runs`, `ic_cap` è definito da nessuna parte nel capitolo.** PRODUCT.md: «La sigla non definita è un difetto, non un segno di competenza». Atterra circa 90 secondi dopo la promessa di spiegare prima di mostrare.
- **Salita — il vero culmine dell'argomentazione.** `EsitoConfronto` produce piacere intellettuale genuino. Una commissione si ricorderà quella frase.
- **Seconda valle** — quattro artefatti senza etichetta. L'attenzione si scarica qui.
- **Anti-picco — la console del grafo.** In proiezione è l'oggetto più rumoroso del capitolo ed è il meno rigoroso. È quello che la commissione guarderà mentre qualcuno parla, e dice «TELEMETRIA APACHE ECHARTS».
- **Picco — la banda scura.** Ben piazzata, ben scritta, e si rifiuta di vantarsi: si qualifica subito come realizzazione singola e passa la mano all'Atto IV.
- **Finale — forte.** `LimitiMetodologici` sul canvas nudo, stesso peso tipografico dei risultati, quattro limiti enunciati senza attenuanti. La scelta di *non* rinchiudere i limiti in un pannello di disclaimer attenuato è la mossa più silenziosamente sicura della pagina.

**La rassicurazione nel momento ad alto rischio c'è ed è corretta.** La cifra più rischiosa del capitolo (25,4% raggiunto) è qualificata in tre punti distinti prima che un lettore possa usarla male: `EsitoCascata.tsx:64-80`, il corpo della banda, e il Limite #1.

## Bandiere rosse per persona

**Sam (utente di screen reader / solo tastiera).** I nodi del grafo sono solo canvas: irraggiungibili da tastiera, e la cascata — il contenuto centrale dell'Atto III — non ha equivalente testuale navigabile. L'aria-label del canvas afferma «N per cento della rete» quando la cifra è calcolata sul sottografo disegnato: è l'unica descrizione che Sam non può correggere leggendo la didascalia. Il campo di ricerca in `ClassificheSeed.tsx:94-114` ha solo un placeholder, nessun `aria-label` — mentre DESIGN.md lo dichiara obbligatorio. La banda scura sta fuori da ogni `<Sezione>`, quindi `aria-current` nell'indice resta su «La cascata» mentre il momento più importante del capitolo scorre via.

**Alex (utente esperto).** Nessuna esportazione della tabella di benchmark, che è la prima cosa che un revisore vorrebbe portarsi via. Nessun percorso da una riga della classifica al nodo corrispondente nel canvas: i due oggetti che parlano degli stessi seed non si parlano. La cascata parte in autoplay e va interrotta a mano prima di poter leggere. Ogni clic su una riga apre un modale che va chiuso: dieci seed da ispezionare significano dieci chiusure.

**Riley (collaudatore metodico).** Stacca la rete a metà caricamento e gli Atti I e II restano un rettangolo grigio per sempre, senza errore. Cerca una stringa senza corrispondenze e ottiene «Nessun seed trovato.» senza sapere su quali campi filtri la ricerca. Se l'account `66109` cablato in `:79` lascia il dataset, `:155` promuove silenziosamente un nodo arbitrario a stile seed — un guasto che produce un'immagine plausibile e sbagliata, che è la categoria peggiore.

## Osservazioni minori

- `SchedaProblema.tsx:95-104` — dieci simboli di parametro non definiti. Aggiungere una glossa di una clausola per riga, o raccogliere il blocco dietro una divulgazione «Parametri della run». È la prima valle del capitolo e la più economica da correggere.
- `ClassificheSeed.tsx:86` «Leaderboard Top Seed Bot» e `:123` «ACTIVATED (t=1)» — inglese in un prodotto interamente italiano. Anche `:230` «Principali Account Umani Raggiunti» è Title Case dove il resto è stile frase.
- `ClassificheSeed.tsx:109` — il campo di ricerca usa `borderRadius: "24px"` (specifica: pastiglia 32) e fondo `softStone` (specifica: canvas).
- `ClassificheSeed.tsx:128-133` — lo scheletro di caricamento è **una** riga di testo da 200px dentro una cella `colSpan={4}`, per una tabella 4×10. DESIGN.md chiede scheletri che imitino la disposizione reale.
- `InfluenceMaximization.tsx:115-121` — il segnaposto dell'intero Atto II è un rettangolo grigio da 300px senza etichetta: non dice cosa stia caricando.
- `TabellaBenchmark.tsx:73` e `AffidabilitaStimatori.tsx:64` mettono `font.display` in celle di tabella e in etichette di dato — vietato da DESIGN.md. `InfluenceGraphCanvas.tsx:249` fa lo stesso sulle etichette dei nodi, per giunta con uno stack scritto a mano invece di `tokens.font.display`.
- `ClassificheSeed.tsx:147,169,263` e `InfluenceGraphCanvas.tsx:273,292,440,442` scrivono a mano letterali `rgba(...)`. Sono gli «oltre mille letterali esadecimali» che `tokens` esiste per aver eliminato, che si riaccumulano.
- `ConfrontoGrafi.tsx:155-164` — un riquadro con bordo `subtle` + `radius.md` dentro un blocco con bordo `subtle` + `radius.xl`. Difendibile alla lettera (cambiano superficie e raggio), ma è un filetto da 1px dentro un filetto da 1px. `EsitoConfronto.tsx:140-148` risolve la stessa forma meglio, con l'esterno tonale invece che bordato.
- I raggi dei marcatori dati sono incoerenti: `2px` in `ConfrontoGrafi.tsx:142` e `ComposizioneRaggiunti.tsx:55,69`, `50%` in `CanvasCascata.tsx:104`. DESIGN.md specifica 4px.
- L'indice degli atti sparisce sotto `md` senza sostituto (`PaginaCapitolo.tsx:68`). Su una pagina di quattro atti lunga come questa, un lettore da telefono perde del tutto la mappa — e la giustificazione di DESIGN.md («coprirebbe il testo») vale per un indice fisso, non per un accordion o una barra di progresso.

## Domande da considerarsi

1. **Il canvas del grafo si guadagna i suoi 560px?** Non è leggibile da tastiera, i suoi numeri descrivono un campione di 400 nodi invece della cascata, ha bisogno di un paragrafo di disclaimer sopra e di una seconda legenda sotto per essere sicuro, e `AndamentoStep` risponde già a «fin dove arriva la propagazione» in modo più onesto e in un terzo dello spazio. È lì perché è il modo migliore di fare l'argomentazione, o perché da un capitolo sulle reti ci si aspetta l'immagine di una rete?

2. **Hai messo il nome della libreria nell'intestazione. Da cosa ti stavi difendendo?** «Grafo di Propagazione Apache ECharts» e «TELEMETRIA APACHE ECHARTS» sono gli unici due punti del capitolo in cui l'interfaccia parla di sé invece che del risultato. Tutto il resto è abbastanza sicuro da non farlo. Di cosa è in ansia la console del grafo che il resto del capitolo non è?

3. **L'argomento dell'Atto II è che il vincitore costoso non vale la spesa — allora perché è l'atto con più apparato non spiegato?** Se un commissario legge solo la prima frase di `EsitoConfronto` e salta il resto, ha perso qualcosa? Se no, perché quei quattro oggetti sono a grandezza piena invece che dietro una divulgazione «verifica»? Se sì, perché non hanno un titolo?

4. **`tinte.ts` è stato scritto proprio per impedire che il coral significasse due cose, e adesso ne significa tre in un atto solo — con accanto un commento che certifica il contrario.** Un file di token non può imporre la semantica, solo l'ortografia. Quale controllo avrebbe intercettato questo nel momento in cui `ComposizioneRaggiunti` è stato scritto, e quel controllo va in una regola di lint, in un test, o in un'API di componente che accetta solo costanti `TINTA_*` invece di stringhe di colore?
