---
target: la Panoramica (rotta /)
total_score: 20
p0_count: 2
p1_count: 3
timestamp: 2026-08-16T19-28-18Z
slug: frontend-src-pages-dashboard-tsx
---
Method: dual-agent (A: ad9fac76c1ceb84b4 · B: a926347f72c0b4fbe)

Target: rotta `/` — la Panoramica (`frontend/src/pages/Dashboard.tsx` e il suo albero).
Browser: **non disponibile** (estensione Chrome non connessa). Nessun overlay visibile è stato prodotto.

## Design Health Score

| # | Euristica | Voto | Problema chiave |
|---|-----------|-------|-----------|
| 1 | Visibilità dello stato | 2 | `DescriptiveStatsBlock` rende `null` in silenzio; metà pagina dietro `{stats && …}`; nessuna data del dato |
| 2 | Corrispondenza col mondo reale | 2 | Il grafo parla inglese tecnico dentro un prodotto che dichiara «italiano corrente, in tutto» |
| 3 | Controllo e libertà | 3 | Esc, pausa, reset ci sono; manca lo stato in URL (filtro, ricerca, avanzamento si perdono a F5) |
| 4 | Coerenza e standard | 1 | Quattro grammatiche per «la cifra»; due coppie bot/umano nello stesso canvas; raggi e ombre fuori sistema |
| 5 | Prevenzione dell'errore | 2 | `BOT RATIO` calcolato sui soli nodi visibili: cambia mentre lo si guarda |
| 6 | Riconoscere invece di ricordare | 2 | Nome, dominio e grado del nodo esistono **solo all'hover** — vietato da PRODUCT.md |
| 7 | Flessibilità ed efficienza | 3 | Prefetch e navigazione da tastiera del canvas ottimi; nessun export, nessun deep-link |
| 8 | Estetica e minimalismo | 2 | Gradienti, glow, blur, quattro numeri stampati due volte |
| 9 | Recupero dagli errori | 2 | Nessun «riprova»; `err.message` grezzo a schermo; nessun ramo d'errore nel blocco statistiche |
| 10 | Aiuto e documentazione | 1 | Nessun glossario, nessun link al repository o al metodo, `n/d` mai spiegato |
| **Totale** | | **20/40** | **Accettabile, bordo inferiore** |

## Anti-Patterns Verdict

**Sì, in metà pagina — e la metà sbagliata.**

**Valutazione LLM.** La Panoramica sembra scritta da due autori. Uno è attento: `homeContent.ts`, `HomeHero`, `HowItWorks`, `States`, l'accessibilità del canvas. L'altro produce esattamente gli anti-riferimenti di PRODUCT.md, e occupa il centro dello schermo. Tell concreti: `👉 Clicca per aprire il popup metadati completo!` (`GraphHero.tsx:1066`); interfaccia semi-tradotta (`NODES LOADED`, `ACTIVE EDGES`, `BOT RATIO`, `BOT DETECTED`, `PLAY STREAM`, e `RENDER PROGRESSION ("POCHI NODI ALLA VOLTA")` — un'etichetta inglese con dentro l'italiano fra virgolette); neon ciano `#00e5ff` come quinta tinta semantica non dichiarata; due radiali decorativi e `backdrop-filter` su cinque elementi; ombre dove il tema le azzera; la griglia di due card icona+numero+freccia di `Dashboard.tsx:90-187`, che è l'anti-riferimento «dashboard admin generica» parola per parola; «Spettro Continuo di Probabilità IA **(KDE)**» su un'area a dieci bucket discreti; commenti che citano un marchio esterno come sorgente di design (`{/* Cohere Deep Green Section */}`).

**Scansione deterministica.** 4 segnalazioni, tutte `advisory`, **tutte e quattro in `GraphHero.tsx`**: raggi `28px` (:757), `20px` (:884), `24px` (:969) fuori dalla scala `rounded` dichiarata, e `rgba(0,229,255,0.15)` (:787) fuori palette. Gli altri 9 file: zero. **Nessun falso positivo** — verificato con un controllo incrociato: alla riga 776 dello stesso file `rgba(255,119,89,0.15)` (il coral dichiarato) **non** viene segnalato, quindi il resolver discrimina davvero invece di fare rumore.

**Dove la scansione tace, e perché conta.** Il registro ha 44 antipattern, ma sui sorgenti `.tsx` girano solo il motore regex e le tre regole `design-system-*`. Restano **non valutati**: ombre, riquadri annidati, testo minuscolo, lunghezza di riga, titoli saltati e `low-contrast` — quest'ultimo perché dipende dai motori browser, non disponibili. Le ombre di `GraphHero.tsx:765` e delle quattro KPI, i riquadri annidati di `DescriptiveStatsBlock`, il corpo a 10px sulle badge del grafo e il `transition: "all 0.3s ease"` su una proprietà di layout sono reali e li ha trovati la revisione umana: **il «4» non è una pagella, è la copertura di un motore parziale.**

**Convergenza indipendente.** Le due valutazioni non si sono viste, e hanno puntato allo stesso file. Il detector concentra il 100% delle sue segnalazioni in `GraphHero.tsx`; la revisione design vi colloca il problema P1 e l'intero verdetto di slop. Quando strumento e giudizio arrivano da strade diverse allo stesso componente, l'epicentro è quello.

**Overlay visivo.** Non disponibile: l'estensione Chrome non è connessa. Nessun overlay è stato iniettato e nessuno è visibile nel browser. Di conseguenza il contrasto a runtime **non è stato misurato su nessuna superficie** — e la sezione accessibilità di PRODUCT.md è dichiarata «non confermata in intervista». Resta il buco aperto.

## Overall Impression

Questa non è un'interfaccia mediocre: è un'interfaccia **bipolare**, e questo è al tempo stesso il problema e la buona notizia. Le parti scritte contro PRODUCT.md sono notevoli — la hero progettata sul caso di fallimento invece che su quello felice, i capitoli derivati da `navigazione.ts` perché non possano divergere, il canvas con `role="img"` e una `aria-label` che descrive cosa il grafo *misura*. Sono dettagli che la maggior parte del software in produzione non ha.

Il guaio è che il difetto si concentra nell'oggetto più grande, più proiettato e più fotografato della pagina. La commissione ricorderà il grafo; il grafo è il punto in cui la pagina cambia lingua, palette ed elevazione, e ci mette un'emoji con punto esclamativo.

**La singola opportunità più grande:** il grafo non è un problema di dieci difetti sparsi, è un file che non ha ricevuto lo stesso trattamento di tutto il resto. Sistemare `GraphHero.tsx` + `GraphToolbar.tsx` sposta contemporaneamente il verdetto di slop, l'euristica 2, la 4 e la 8 — ed è l'unico intervento della lista che si veda da tre metri.

## What's Working

**1. La hero è progettata sul fallimento, non sul successo.** Riceve `stats` per props, mostra scheletri durante il caricamento e `n/d` (mai `0`) quando il dato manca; l'animazione dichiara `opacity: 1` come stato base e parte da `from`, senza `fill-mode: backwards`. Funziona perché elimina l'unico modo in cui la prima schermata poteva umiliare l'autore davanti a una commissione — restare bianca — e perché onora alla lettera «uno 0 inventato è indistinguibile da uno 0 misurato».

**2. I quattro capitoli sono derivati, non riscritti.** `homeContent.ts:49-58` costruisce gli step da `CAPITOLI_NUMERATI`: titolo, sommario, etichetta e rotta vengono dallo stesso oggetto che alimenta sidebar e intestazione. Rende *impossibile* la divergenza che il principio 5 teme: homepage e navigazione non possono più raccontare due strutture diverse.

**3. Il canvas è accessibile sul serio.** `tabIndex={0}`, `role="img"`, `aria-label` che dice cosa il grafo misura; frecce e Invio che scrivono nello stesso stato del mouse, quindi una sola interfaccia da tenere allineata; `aria-live` che annuncia **solo** la selezione da tastiera, perché annunciare ogni nodo sfiorato col mouse sarebbe un flusso continuo; `outlineOffset: -3px` perché l'anello globale verrebbe tagliato dall'`overflow: hidden`. È più di quanto faccia la maggior parte dei canvas in produzione.

## Priority Issues

### [P0] Metà Panoramica sparisce quando il backend tace, e nulla lo dichiara
**Cosa.** `Dashboard.tsx:78` chiude blocco statistiche, due card e banda dentro `{stats && …}`; `DescriptiveStatsBlock.tsx:46-48` fa `return null` finché la propria query non risponde, e non ha alcun ramo d'errore. Se `/api/dashboard` risponde ma la query detection no, il blocco statistiche sparisce **senza un carattere di spiegazione**.
**Perché conta.** La commissione valuta in una sessione breve. A backend lento la pagina cresce sotto gli occhi spostando lo scroll; a backend spento la Panoramica sembra solo più corta e più povera di quanto sia. Un errore silenzioso su una pagina che promette che ogni numero ha una fonte è un'autocontraddizione.
**Fix.** Rendere sempre la struttura: scheletri che imitino la disposizione reale (DESIGN.md §5) e, a errore, `ErrorState`/`EmptyState` che dicano *quali* cifre mancano e perché. L'assenza di una sezione non deve mai essere il messaggio.
**Comando:** `/impeccable harden`

### [P0] «Fediverso Live» è una spia verde cablata
**Cosa.** `App.tsx:383-401`: pallino `success` con alone `0 0 6px` e la scritta «Fediverso Live», costanti su ogni pagina, indipendenti da qualunque stato di rete.
**Perché conta.** È l'unica affermazione fabbricata dell'interfaccia, dentro il prodotto il cui vincolo dichiarato è «non ci sono affermazioni che il database locale non possa sostenere». Nel caso peggiore compare a un metro da un riquadro rosso che dice che il backend non risponde. Chi nota la contraddizione smette di fidarsi anche delle cifre corrette.
**Fix.** Legarla allo stato reale della query: verde con «Aggiornato alle 14:32», grigio con «Non raggiungibile». Se non vale il costo, cancellarla: un ornamento che mente è peggio di uno spazio vuoto.
**Comando:** `/impeccable harden`

### [P1] Il grafo tradisce insieme il sistema visivo e la lingua del progetto
**Cosa.** In un solo componente: ombra `0 20px 40px -15px` (:765), due radiali decorativi (:768-790), `backdrop-filter` su cinque elementi, raggi 28/20/24px estranei alla scala token *(confermati dal detector)*, `accentCyan #00e5ff` come quinta tinta semantica **assente da DESIGN.md** *(confermato dal detector alla riga 787)*, un glow ciano sul focus che compete con l'anello unico, **due sistemi di colore bot/umano nello stesso canvas** (nodi `coral`/`success` a :520-526, particelle `graphBot`/`graphHuman` a :483), ogni etichetta in inglese, e l'emoji con esclamativo a :1066.
**Perché conta.** È l'oggetto che verrà proiettato e ricordato: ogni difetto qui vale doppio, e sono difetti che DESIGN.md proibisce per nome. Peggio: le due palette rendono la legenda letteralmente sbagliata rispetto a ciò che si muove sugli archi.
**Fix.** Tradurre in italiano corrente («ACCOUNT MOSTRATI», «RELAZIONI ATTIVE», «QUOTA DICHIARATA BOT»); cancellare emoji ed esclamativo; rimuovere ombra, gradienti e `backdrop-filter`; portare i raggi su `tokens.radius`; usare `graphBot`/`graphHuman` per nodi **e** particelle; eliminare `accentCyan` o promuoverlo a token dichiarato in `tinte.ts` con un significato scritto.
**Comando:** `/impeccable polish`

### [P1] Quattro grammatiche per «la cifra», e gli stessi numeri stampati due volte
**Cosa.** Convivono `HeroMetric` (filetto sinistro, 34px), le due card di `Dashboard.tsx:90-187` (pietra, icona in alto a destra, `variant="h1"` a 64px, bottone freccia), le KPI di `DescriptiveStatsBlock` (card bianca **con ombra**, 38px, tinta assegnata per posizione), e la `KpiCard` di `StatsModal` (pietra, filetto 3px in alto, 40px). Nessuna delle prime tre è la `scheda-cifra` specificata in DESIGN.md §5. In più `posts_total` e `follows_total` compaiono **due volte** sulla stessa pagina, a 34px e a 64px, con note quasi identiche.
**Perché conta.** Il principio 5 di PRODUCT.md dice che l'incoerenza *è* un argomento: «pesano perché suggeriscono la stessa distrazione anche a monte, nel codice che produce i numeri». Quattro dialetti per lo stesso oggetto su una schermata sola è la prova a carico più facile da esibire.
**Fix.** Un solo componente conforme (pietra, filetto 3px in alto, etichetta mono, display 32px, nota) in tutti e quattro i posti. Cancellare le due card grandi: la hero porta già quei numeri. E togliere `variant="h1"` dai numeri.
**Comando:** `/impeccable extract`

### [P1] Cifre senza denominatore e senza provenienza, sulla pagina che promette la provenienza
**Cosa.** `BOT RATIO` è calcolato sui soli nodi **visibili** (:711-716) e scorre mentre l'animazione avanza. `NODES LOADED 12 / 80` non dice che 80 è il tetto della chiamata e non la dimensione della rete, né con che criterio quegli 80 siano scelti. Nessuna data d'istantanea, nessuna finestra di raccolta, nessun link al metodo o al repository. La nota che chiarisce che `bot=true` è auto-dichiarato — ottima — sta dentro `StatsModal`, a tre clic dalla cifra che la rende necessaria.
**Perché conta.** È il rovescio esatto del primo principio del progetto: «una cifra senza fonte, soglia o dimensione del campione è un'affermazione non verificabile». La cifra più citabile della pagina è anche la meno difendibile.
**Fix.** Riga di provenienza in monospazio sotto le metriche della hero (istantanea, finestra, numero di istanze, link al repository); sul grafo, «campione di 80 account su N» e quota bot calcolata sul campione intero; nota su `bot=true` promossa accanto alla cifra.
**Comando:** `/impeccable clarify`

## Persona Red Flags

**Alex (power user) — qui è l'autore che usa le pagine ogni giorno.** Filtro, ricerca e avanzamento del grafo non sono nell'URL: F5 riparte da zero e non può condividere il sottografo che sta guardando. Per vedere il grafo completo deve aspettare 2 nodi ogni 1400 ms (80 nodi ≈ 56 s), premere `STEP (+3)` 26 volte, o scoprire da sé che lo slider serve a saltare alla fine. Il Reset è l'unico controllo della barra senza etichetta testuale.

**Sam (screen reader / solo tastiera).** **Tre `<h1>` sulla pagina**: i due numeri delle card usano `variant="h1"`, quindi l'indice dei titoli letto da NVDA diventa «Quanta parte del Fediverso non l'ha scritta una persona?», «48.213», «12.004». Livelli saltati e doppi: h2 «La rete dei follow, nodo per nodo» → h3 «Rete dei follow» (stesso oggetto, titolo ripetuto) → h4. Nessuno skip-link: otto voci di sidebar prima del contenuto, su ogni pagina. Legenda per sola tinta, con coral/verde — la coppia peggiore per il daltonismo, ed è la distinzione portante della pagina. Due trattamenti di focus concorrenti.

**Riley (stress tester).** Backend spento: hero con quattro `n/d`, riquadro rosso, overlay sul grafo… poi la pagina finisce, e il pallino «Fediverso Live» resta verde. `/api/dashboard` viva ma detection fallita: il blocco statistiche scompare in silenzio. `err.message` grezzo a schermo («…: Failed to fetch», inglese in un'interfaccia italiana). «Ingrandisci il grafo» non porta a schermo intero: cambia l'altezza da 440px a 75vh.

**Prof.ssa Neri, relatrice (persona di progetto) — guarda in proiezione, una volta sola.** Corpo a 10px sulle badge del grafo e a 12px sulle caption, sotto il minimo di 14px che PRODUCT.md fissa proprio per il proiettore. Legge «BOT RATIO 24%» e non può rispondere a nessuna delle tre domande che si farà: su quanti account, dichiarati o rilevati, a quale data. «Rilevamento del testo sintetico (4 modelli)» ha una sola barra, etichettata FastDetectGPT: gli altri tre non hanno alcuna cifra. L'ultima impressione della pagina è «12,4%» — la Panoramica si chiude su due indicatori di lavoro incompleto invece che su un risultato. E non c'è una data da nessuna parte.

**Dott. Ferri, ricercatore che vuole il dato grezzo (persona di progetto).** Il footer ha una frase e un `©`: nessun link al repository, alla licenza, alle API, nessun export. Il lettore che PRODUCT.md descrive come «clona il repository» non trova il repository. «(KDE)» su un'area a 10 bucket, smentito nella stessa riga da una chip «10 Bucket Fine-Grained»: perde fiducia qui, non al terzo capitolo. «Probabilità media IA 38%» senza soglia e senza *n*. Merito: «Q1 (da istogramma)» e «IQR (da istogramma)» in `StatsModal` sono etichette oneste che dichiarano il metodo — registro giusto, posto sbagliato.

## Minor Observations

- L'occhiello della hero, «SNM · ANALISI DEL FEDIVERSO», trascrive il lockup di marchio che sta a cinque centimetri: viola la regola dell'occhiello che informa.
- La hero **non usa `tokens.type.heroDisplay`**: riscrive a mano 72px con la crenatura di `productDisplay`. L'unica pagina che ha diritto al ruolo più alto si presenta con il titolo di un capitolo qualsiasi.
- La banda di chiusura non è `BandaScura`: è costruita a mano, non va a filo, e non ha né titolo né cifre chiave.
- Riquadri annidati in `DescriptiveStatsBlock:103-330` — contenitore pietra con bordo che contiene quattro card con bordo e ombra. DESIGN.md §4: «un blocco dentro un blocco è sempre sbagliato».
- Tinte assegnate per posizione: «TOKEN MEDI PER POST» in `deepGreen` (che significa «non dichiarato bot»), «LUNGHEZZA MEDIA POST» in `actionBlue` (che significa link / FastDetectGPT). La regola del significato unico, rovesciata.
- `n/d` non è spiegato da nessuna parte sulla pagina in cui compare.
- `ErrorState` è posizionato **dopo** «I quattro capitoli»: l'avviso che il backend non risponde compare a mezza pagina, sotto contenuti che sembrano funzionare.
- `transition: "all 0.3s ease"` sul contenitore del canvas anima `height` — proprietà di layout, vietata da DESIGN.md §6, e costringe a un relayout del canvas per 300 ms.
- `LinearProgress` `determinate` a 0 quando `ai_eligible` è 0: una barra vuota indistinguibile da «0% reale». Stessa famiglia dello 0 inventato.

## Questions to Consider

- **Se la Panoramica dovesse convincere la commissione senza mostrare un solo numero, quale frase resterebbe?** Oggi la pagina affida l'argomento ai conteggi, che sono la parte meno persuasiva del lavoro: nessuno si impressiona per 48.000 post. Il capitale è il metodo, e sulla Panoramica il metodo compare come quattro card di navigazione.
- **Il grafo è la prova o è la copertina?** Se è la prova, perché è un campione di 80 nodi non dichiarato con un'animazione da quasi un minuto? Se è la copertina, perché ha nove controlli esperti sopra la piega? Deciderlo scioglie da solo metà dei problemi elencati.
- **PRODUCT.md dice che il contenuto più prezioso è il punto in cui i quattro rilevatori divergono. Perché la pagina d'ingresso non lo mostra affatto, e mostra invece una barra di avanzamento?** Un'unica cifra — «sui post analizzati da tutti e quattro, concordano nel X% dei casi» — farebbe alla Panoramica ciò che oggi non fa nessuno dei venti elementi presenti.
- **Che cosa vede la commissione se stacchi la rete a metà discussione, e quello che vede è ancora un argomento a tuo favore?** Oggi la risposta è: una pagina più corta e una spia verde che mente.
- **Quante delle undici destinazioni della pagina sopravviverebbero se potessi tenerne tre?** E se la risposta è «i quattro capitoli», perché la hero punta a `/posts` invece che al primo capitolo?
