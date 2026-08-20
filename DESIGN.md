---
name: SNM.Intelligence
description: Sistema visivo dell'interfaccia di analisi del Fediverso — canvas editoriale, apparato in monospazio, tinte che significano una cosa sola.
colors:
  nero-marchio: "#17171c"
  nero-marchio-premuto: "#2e2e38"
  verde-capitolo: "#003c33"
  navy-capitolo: "#071829"
  coral-bot: "#ff7759"
  coral-bot-inchiostro: "#c03d20"
  coral-bot-premuto: "#e66043"
  coral-bot-tenue: "#ffad9b"
  viola-sintetico: "#7c3aed"
  blu-azione: "#1863dc"
  canvas: "#ffffff"
  pietra: "#eeece7"
  pietra-chiara: "#f9f8f6"
  fondo-coral: "#fff0ec"
  fondo-viola: "#f5f3ff"
  fondo-blu: "#f1f5ff"
  fondo-pericolo: "#fdf2f2"
  inchiostro: "#212121"
  testo-attenuato: "#69697e"
  testo-su-scuro: "#93939f"
  filetto: "#e5e7eb"
  filetto-marcato: "#d9d9dd"
  filetto-interno: "#f2f2f2"
  focus: "#4c6ee6"
  pericolo: "#b30000"
  successo: "#10b981"
  fondo-cascata: "#0d0d10"
  fondo-grafo: "#131924"
  fondo-console: "#050811"
  fondo-modale-scura: "#0b0f19"
  nodo-bot: "#ff5252"
  nodo-umano: "#38bdf8"
typography:
  heroDisplay:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "96px"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "-1.92px"
  productDisplay:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "-1.44px"
  sectionDisplay:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "60px"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "-1.2px"
  sectionHeading:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.48px"
  cardHeading:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.32px"
  featureHeading:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0"
  affermazione:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.35
  titoloVoce:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  numeroGrande:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "56px"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "-1.2px"
  bodyLarge:
    fontFamily: "Inter, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  monoLabel:
    fontFamily: "ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.28px"
  micro:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  chip: "30px"
  pill: "32px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
  xxl: "80px"
  xxxl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.nero-marchio}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "#000000"
    textColor: "{colors.canvas}"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-outlined-hover:
    backgroundColor: "{colors.pietra}"
    textColor: "{colors.inchiostro}"
  chip-tassonomia:
    backgroundColor: "{colors.fondo-coral}"
    textColor: "{colors.nero-marchio}"
    rounded: "{rounded.chip}"
    padding: "8px 18px"
  chip-tassonomia-attiva:
    backgroundColor: "{colors.coral-bot}"
    textColor: "{colors.nero-marchio}"
    rounded: "{rounded.chip}"
    padding: "8px 18px"
  blocco:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.xl}"
    padding: "32px"
  scheda-cifra:
    backgroundColor: "{colors.pietra}"
    textColor: "{colors.nero-marchio}"
    rounded: "{rounded.sm}"
    padding: "24px"
  banda-scura:
    backgroundColor: "{colors.verde-capitolo}"
    textColor: "{colors.canvas}"
    padding: "80px 48px"
  nav-voce:
    backgroundColor: "transparent"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
  nav-voce-attiva:
    backgroundColor: "{colors.nero-marchio}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
  campo-ricerca:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
---

# Design System: SNM.Intelligence

## 1. Overview

**Creative North Star: "L'edizione critica"**

Un'edizione critica è un testo accompagnato dal suo apparato: le note, le varianti, le sigle dei testimoni, il rimando alla fonte. Il testo si legge da solo; l'apparato è lì per chi vuole verificare. Questo sistema è costruito su quella divisione. Il canvas bianco continuo porta il testo — le domande che aprono ogni atto, i paragrafi che spiegano come va letto un grafico. Il monospazio porta l'apparato — «ATTO III — LA CASCATA», «QUARTILI», i codici lingua, le soglie. Non si mescolano mai: se un'informazione è apparato, sta in monospazio maiuscolo; se è testo, sta in Inter e si legge come una frase.

La densità cresce lungo la pagina, non è uniforme. Un capitolo apre con una domanda in corpo grande su molto bianco, attraversa i blocchi in cui il metodo viene spiegato, e solo alla fine consegna la tabella con dodici colonne di filtri. La banda scura a piena larghezza — verde di capitolo o navy — interrompe il bianco una volta per capitolo e porta il risultato: è la punteggiatura del sistema, non un elemento decorativo. Le superfici scure profonde (grafo, cascata, console) sono un'altra cosa ancora: sono strumenti, e il nero serve a far risaltare i nodi luminosi.

Il sistema rifiuta tre cose per iscritto, ereditate da PRODUCT.md. Non è una **dashboard admin generica**: niente griglie di card identiche con icona, numero e freccia verde. Non è una **landing page SaaS**: niente gradienti, glassmorphism, metriche gonfiate, CTA in ogni sezione. E non è un **progetto universitario improvvisato**: niente palette di default della libreria, niente tabelle nude, niente grafici che escono dal grafico. Il pubblico primario è una commissione di tesi che guarda su proiettore: ogni scelta si giudica lì.

**Key Characteristics:**
- Canvas bianco come superficie predefinita; il colore arriva dai dati, mai dall'ornamento.
- Titoli in Space Grotesk con crenatura negativa; corpo in Inter; apparato tecnico in monospazio maiuscolo.
- Ogni atto apre con una domanda in italiano corrente, prima di qualunque cifra.
- Una banda scura per capitolo, a piena larghezza, che porta il risultato di quel capitolo.
- Nessuna ombra: la profondità viene dall'alternanza di superfici e da filetti da 1px.
- Angoli generosi sui riquadri di contenuto (22px), stretti sui marcatori dati (4px), a pastiglia sui controlli (30-32px).
- Quattro tinte semantiche fisse — bot, umano, sintetico, non valutato — che non cambiano significato da una pagina all'altra.
- Indice laterale sticky degli atti su desktop, che sparisce sotto `md` invece di comprimersi.

## 2. Colors

Una palette quasi monocroma — nero, bianco, pietra — in cui ogni tinta satura è stata assegnata a un significato e non è disponibile per altro.

### Primary

- **Nero di marchio** (`#17171c`): il colore delle azioni primarie, della voce di navigazione attiva, dei titoli, del monogramma. È il nero dell'interfaccia, non il nero puro: `#000000` resta riservato allo stato premuto del bottone pieno, dove «più scuro» non sarebbe altrimenti disponibile.
- **Nero premuto** (`#2e2e38`): l'unica variante *più chiara* usata come hover, sui fondi che sono già quasi neri (voce di navigazione attiva, gruppi di toggle selezionati).

### Secondary

Le due tinte scure di capitolo. Servono a distinguere un capitolo dall'altro senza cambiare famiglia di colore: la banda che chiude il Capitolo II non deve somigliare a quella del Capitolo III.

- **Verde di capitolo** (`#003c33`): fondo della banda scura per il testo sintetico e la propagazione. È anche la tinta semantica dell'account che *non* si dichiara bot.
- **Navy di capitolo** (`#071829`): fondo della banda scura per la verifica dei fatti.

### Tertiary

Le tinte semantiche. Ognuna significa **una cosa sola** in tutta l'applicazione, dichiarata in `frontend/src/components/dati/tinte.ts`.

- **Coral dei bot** (`#ff7759`): account che si dichiara automatizzato nel proprio profilo. È anche la tinta di riconoscimento del rilevatore Desklib. Come riempimento e come marcatore su fondo scuro, mai come testo su fondo chiaro (vedi la regola qui sotto).
- **Coral inchiostro** (`#c03d20`): la stessa tinta quando deve essere *letta* invece che riempita — la cifra di una scheda, l'etichetta che la sormonta, il numero romano del capitolo nella sidebar, il tratto di un grafico su fondo chiaro. Stessa hue OKLCH del coral, sola lightness ridotta: il legame semantico regge, la lettura anche. 5,3:1 sul canvas, 4,5:1 sulla pietra.
- **Coral premuto** (`#e66043`) e **coral tenue** (`#ffad9b`): l'unica variante scura e l'unica chiara del coral, per stato premuto e bordo a riposo delle pastiglie di tassonomia.
- **Viola del sintetico** (`#7c3aed`): testo che un rilevatore marca come scritto da una macchina. Tinta di riconoscimento di AdaDetectGPT.
- **Blu d'azione** (`#1863dc`): link editoriali e tinta di riconoscimento di FastDetectGPT. Non è il colore del focus, che deve restare distinguibile da un link.

### Neutral

- **Canvas** (`#ffffff`): fondo di pagina, dei blocchi di contenuto e dei campi. La superficie predefinita del sistema.
- **Pietra** (`#eeece7`): fondo della scheda cifra e hover del bottone contornato. Il neutro caldo che stacca un dato dal canvas senza aggiungere un bordo.
- **Pietra chiara** (`#f9f8f6`): scheletri di caricamento e hover delle righe d'elenco, dove pietra sarebbe troppo marcata.
- **Inchiostro** (`#212121`): testo corrente. Rapporto 15.9:1 sul canvas.
- **Testo attenuato** (`#69697e`): descrizioni dei blocchi, note delle schede, metadati, etichette in monospazio a riposo. È il grigio delle superfici chiare, calcolato sulla peggiore fra quelle su cui compare: 5,4:1 sul canvas, 4,5:1 sulla pietra, 5,1:1 su `surfaceWarm`.
- **Testo su scuro** (`#93939f`): il grigio secondario delle superfici scure — grafo, cascata, console, modali scure, card delle pipeline. 5,9:1 sul nero di marchio, 6,3:1 sul fondo del grafo. **Non regge sulle bande verdi** (4,1:1): lì il testo secondario è `rgba(255,255,255,0.72)` e l'occhiello `rgba(255,255,255,0.7)`.
- **Filetto** (`#e5e7eb`), **filetto marcato** (`#d9d9dd`), **filetto interno** (`#f2f2f2`): i tre spessori di separazione, dal bordo di un blocco alla riga dentro una card.

### Superfici scure profonde

Quattro tinte vicine ma non intercambiabili, ognuna fondo di un contenuto diverso: **fondo cascata** (`#0d0d10`, il più scuro, per far risaltare i nodi attivati), **fondo grafo** (`#131924`, il riquadro dei follow in panoramica), **fondo console** (`#050811`, i log delle pipeline: nero bluastro da terminale), **fondo modale scura** (`#0b0f19`).

### Velature

Le trasparenze del sistema sono dichiarate per contesto in `tokens.overlay`, non scritte dove servono. Erano diciassette letterali `rgba` sparsi, fra cui tre alfa diversi dello stesso coral e sei del bianco: un'alfa in più o in meno non si nota quando la si scrive, e si nota sempre quando due elementi che dovevano essere uguali finiscono diversi.

- **Sulle bande di capitolo:** `testoSuBanda` (bianco 72%, il paragrafo), `etichettaSuBanda` (bianco 70%, occhiello ed etichette delle cifre), `filettoSuBanda` (bianco 24%, la regola sopra una cifra).
- **Sulle superfici scure profonde:** `filettoSuScuro` (bianco 10%, fra le fasce di un pannello), `filettoSuScuroMarcato` (bianco 20%, un filetto che deve essere visto: bordo del tooltip, binario dello slider), `velaturaSuScuro` (bianco 6%, fondo di un controllo), `disabilitatoSuScuro` (bianco 28%), `bordoNodoSpento` (bianco 40%), `arcoSpento` (bianco 4%), `arcoAttivato` (ciano 40%).
- **Velature delle tinte semantiche su superficie chiara:** `velaturaCoral` (coral 12%, fondo di una chip o di un controllo in tinta bot), `velaturaCoralTenue` (coral 8%, riga selezionata), `bordoCoral` (coral 40%), `velaturaBlu` (blu d'azione 12%).

Chi ne cerca una nuova deve prima accorgersi che quel mestiere non c'è ancora: il nome dice il mestiere, non il valore.

### Semantiche di stato

**Focus** (`#4c6ee6`, anello 2px con offset 2px), **pericolo** (`#b30000` su fondo `#fdf2f2`), **successo** (`#10b981`).

### Named Rules

**La regola del significato unico.** Una tinta satura significa una cosa sola in tutto il sistema. Coral è «bot dichiarato», viola è «testo sintetico», verde è «non dichiarato bot». Bot e IA non condividono la tinta *di proposito*: è la distanza fra le due che il Capitolo I mette in scena. Riusare il coral per indicare l'IA in un riquadro accanto rende la legenda da rileggere a ogni blocco, ed è il difetto che `tinte.ts` esiste per impedire.

**La regola dei due coral.** Il coral pieno su fondo chiaro dà 2,2:1 sulla pietra e 2,6:1 sotto testo bianco: **vietato come colore del testo, dei numeri e delle etichette su superficie chiara.** Lì vive come riempimento con testo nero di marchio sopra, come bordo, come marcatore di 14px. Quando la tinta deve dire «bot» *ed essere letta*, si usa il coral inchiostro (`#c03d20`), che è la stessa tinta più scura. Su fondo scuro il coral pieno è corretto e resta la scelta giusta (6,8:1 sul nero di marchio). Se stai per scrivere `color: coral` su un fondo chiaro, o quella tinta va nel fondo, o è l'inchiostro che ti serve.

**La regola delle quattro superfici scure.** Un grafo, una cascata, un terminale e una modale non condividono il fondo. Uniformarle appiattirebbe la distinzione fra strumenti che fanno cose diverse. La tinta si sceglie dal contenuto, non dalla comodità.

**La regola della legenda sul proprio fondo.** Una legenda vive sulla superficie che descrive, non su quella della pagina. Le quattro tinte dei nodi della cascata sono tinte da superficie scura: rese come pallini sul canvas bianco davano 1,5:1 il ciano, 2,2:1 il verde, 2,6:1 il coral — tre su quattro sotto il 3:1 che serve a un segno che porta informazione, e il ciano praticamente invisibile. Le etichette accanto salvavano il significato ma non il legame fra tinta e significato, che è l'unico mestiere di una legenda. La legenda della cascata sta quindi dentro il pannello scuro, in una fascia a filo del grafo: `CanvasCascata` la compone e `InfluenceGraphCanvas` la rende. Vale in generale — se una legenda usa tinte di una superficie, sta su quella superficie.

**La regola del colore che viene dai dati.** Il canvas è bianco e resta bianco. Nessuna superficie prende colore per «dare energia alla sezione»: il colore entra quando c'è un dato che lo richiede (una categoria, uno stato, un rilevatore) o quando un capitolo si chiude con la sua banda.

## 3. Typography

**Display:** Space Grotesk (con fallback Inter, sans-serif) — titoli, cifre grandi, voci di navigazione.
**Corpo:** Inter (con fallback sans-serif) — paragrafi, etichette, tabelle, controlli.
**Apparato:** `ui-monospace, monospace` — marcatori di sezione, codici, unità, soglie.

**Carattere:** un geometrico stretto contro un umanista neutro. Space Grotesk porta le sue forme larghe e le sue crenature negative ai titoli, dove la compressione fa apparire il testo carved anziché arioso; Inter sparisce nel corpo, che è quello che deve fare quando un paragrafo spiega come leggere un grafico. Il monospazio è la terza voce e non è decorativa: segnala che quel testo è apparato tecnico e non prosa.

### Hierarchy

- **heroDisplay** (400, 96px desktop → 40px mobile, LH 1.0, LS -1.92px): la dichiarazione della Panoramica. Una sola per applicazione.
- **productDisplay** (400, 72px → 34px, LH 1.0): apertura di un capitolo.
- **sectionDisplay** (400, 60px → 32px, LH 1.0): titolo della banda scura, con `maxWidth: 20ch`.
- **sectionHeading** (400, 40px → 26px, LH 1.2): **la domanda che apre un atto**, con `maxWidth: 24ch`.
- **cardHeading** (400, 32px → 24px, LH 1.2): titolo di blocco maggiore, e la cifra della scheda dati.
- **featureHeading** (500, 24px, LH 1.3): titolo di un blocco dentro un atto. È l'unico ruolo display con peso 500.
- **affermazione** (400, 24px → 20px, LH 1.35): la frase con cui un atto risponde alla propria domanda («PMIA raggiunge il 99,4% dello spread del migliore in 4,3 s»). Non è un titolo e non va marcata come intestazione: è prosa, in corpo grande perché porta il risultato.
- **titoloVoce** (600, 18px, LH 1.3): titolo di una voce dentro un elenco di voci titolate — i limiti dell'Atto IV. Sta sotto `featureHeading`, che titola il blocco che le contiene.
- **numeroGrande** (400, 56px → 40px, LH 1.0): la cifra chiave dentro una banda scura.
- **bodyLarge** (400, 18px → 16px, LH 1.4): paragrafo guida sotto un titolo. Su fondo scuro, `maxWidth: 62ch`.
- **body** (400, 16px, LH 1.5): testo corrente. Prosa entro 65-75ch; le descrizioni dei blocchi sono limitate a 70ch.
- **monoLabel** (400, 14px, LS 0.28px, maiuscolo): l'apparato. Taglia `micro` a 11px/0.5px per le intestazioni di gruppo della sidebar.
- **micro** (400, 12px, LH 1.4): piè di pagina, metadati, note.

Le misure sono già responsive dentro il token (`tokens.type` in `frontend/src/theme.ts`): chi lo usa non reintroduce un breakpoint a mano.

### Named Rules

**La regola della domanda.** Un atto apre con una domanda in italiano corrente in `sectionHeading`, non con un'etichetta funzionale. «Quanto di questo testo l'ha scritto una macchina» e non «Analisi rilevatori». La domanda viene prima dei dati e in corpo grande perché è quella a dare senso ai grafici che seguono: chi legge sa cosa sta cercando prima di trovarselo davanti.

**La regola dell'occhiello che informa.** L'etichetta in monospazio sopra un titolo è consentita solo quando dice qualcosa che il titolo non dice: la posizione nella narrazione («ATTO III — LA CASCATA»), l'unità di misura, la tassonomia, la soglia. **Vietato l'occhiello che ripete il titolo con altre parole** o che esiste solo per riempire lo spazio sopra un'intestazione: è il kicker decorativo, e ripetuto sopra ogni sezione diventa grammatica automatica invece che voce.

**La regola del display fuori dai controlli.** Space Grotesk non entra nelle etichette dei campi, nel testo delle celle di tabella, nei valori dei dati. Titoli, cifre e navigazione: nient'altro. Un font display su un'etichetta di form fa sembrare l'interfaccia travestita.

**La regola della dichiarazione unica.** `heroDisplay` compare una volta sola, in Panoramica. Un secondo titolo da 96px in un'altra pagina non è enfasi, è rumore: la gerarchia si costruisce con la distanza fra i ruoli, non alzando il ruolo più alto.

## 4. Elevation

**Il sistema non usa ombre.** `MuiCard` e `MuiPaper` hanno `boxShadow: none` in tema, e `MuiButton` lo azzera anche in hover. La profondità viene da tre cose: l'alternanza di superficie (canvas → pietra → banda scura → fondo grafo), i filetti da 1px in tre spessori, e gli angoli. Un box-shadow su una card, in questo sistema, è sempre un errore.

Le eccezioni sono quattro, tutte funzionali e tutte dichiarate qui. Un'ombra che non è in questo elenco è un errore, e un'ombra che diventa necessaria si aggiunge a questo elenco prima che al codice.

1. **Il glow da 6px del pallino di stato** «Fediverso Live» nella sidebar: il pallino misura 6px, e a quella dimensione il bagliore è ciò che lo rende un indicatore acceso invece di un punto.
2. **Le superfici scure profonde**, dove il contrasto col canvas fa da sé tutto il lavoro di stacco.
3. **L'ombra del pannello di navigazione**, ma **solo quando è aperto al passaggio del mouse** (`overlay.ombraPannello`). In quello stato il pannello scorre *sopra* il contenuto, e senza stacco si fonderebbe con la pagina che sta coprendo. A pannello bloccato l'ombra sparisce: lì la pagina gli ha fatto spazio, non c'è più niente sotto, e l'ombra lo farebbe galleggiare senza motivo.
4. **Il bagliore dei nodi seed** nel grafo della cascata (`shadowBlur: 20` in `InfluenceGraphCanvas`): su fondo `darkCanvas` è ciò che distingue i sessanta punti di origine dai nodi che raggiungono. È limitato ai soli seed — l'aveva anche ogni nodo appena attivato, che a ogni passo sono decine o centinaia, e ridisegnare un'ombra sfocata su tutti loro tre volte al secondo era il grosso del costo della riproduzione.

**Non è più un'eccezione il vetro della barra superiore.** Era bianco al 90% con `backdrop-filter: blur(8px)`: su un canvas bianco, con sotto contenuto bianco, era indistinguibile da una barra opaca per quasi tutta la pagina, e si vedeva solo quando ci passava sotto una superficie scura — dove sfocava il grafo invece di tagliarlo netto. Ora è fondo pieno.

### Vocabolario delle superfici

- **Piatta** (nessun bordo, fondo canvas): testo corrente, elenchi separati da filetti, aperture di atto.
- **Contenuta** (`1px solid #e5e7eb`, raggio 22px, fondo canvas): il blocco, unità di contenuto dentro un atto.
- **Tonale** (fondo pietra `#eeece7`, nessun bordo, raggio 8px): la scheda cifra, con filetto colorato da 3px in alto.
- **Banda** (fondo verde o navy a piena larghezza, nessun raggio quando esce dai margini): la chiusura di un capitolo.
- **Profonda** (fondi da `#050811` a `#131924`): grafi, cascate, console. Lo stacco è il contrasto stesso.

### Named Rules

**La regola del piatto per difetto.** Le superfici sono piatte a riposo. Nessuna elevazione «per dare respiro»: se due elementi non si distinguono, la risposta è un filetto, un cambio di fondo o più spazio, in quest'ordine. Test in una frase: se sembra un'app del 2014, l'ombra c'è e non doveva esserci.

**La regola del riquadro guadagnato.** Un contenuto viene riquadrato solo se il riquadro serve a separarlo da un vicino con cui verrebbe confuso. Elenchi, righe di ricerca e aperture di sezione stanno nudi sul canvas. **Riquadri annidati: vietati.** Una scheda cifra dentro un blocco è corretta perché cambiano superficie e raggio; un blocco dentro un blocco no.

**La regola della banda unica.** Una banda scura per capitolo. Due bande nella stessa pagina non raddoppiano l'enfasi: annullano quella della prima. Nelle pagine con indice laterale la banda usa la variante `colonna` (angoli 22px, dentro la propria colonna), perché a piena larghezza scavalcherebbe l'indice.

## 5. Components

Carattere generale: **sobri ma tattili.** Bordo da 1px, nessuna ombra, angoli generosi — ma ogni controllo risponde. Transizioni brevi (150 ms, `ease` o `ease-in-out`) su colore e fondo; mai sulle proprietà di layout. Un controllo che non cambia niente al passaggio del mouse è considerato incompleto.

### Buttons

- **Forma:** pastiglia piena (32px), padding `10px 24px`, `text-transform: none`, peso 500 a 14px.
- **Primario:** fondo nero di marchio, testo canvas. Hover: nero puro `#000000`. È la singola azione più importante della schermata.
- **Contornato:** bordo `#d9d9dd`, testo inchiostro, fondo trasparente. Hover: fondo pietra, bordo che passa a nero di marchio.
- **Testuale:** azione secondaria, sottolineata o allineata a filetto, senza fondo.
- **Focus:** anello `2px solid #4c6ee6` con offset 2px, uguale su tutta l'applicazione — dichiarato una volta in `MuiCssBaseline` perché l'outline predefinito cambia tinta e spessore fra Chrome e Firefox, e navigando da tastiera la pagina sembrava di un altro progetto.
- **Distruttivo:** pericolo `#b30000`, premuto `#800000`. Solo per l'arresto di una pipeline.

### Chips

- **Tassonomia (lingue del corpus):** pastiglia da 30px, corpo 15px — deliberatamente più grande di un tag normale, perché la tassonomia qui è un controllo di primo piano e non un filtro accessorio. A riposo: fondo `#fff0ec`, bordo coral tenue, testo nero di marchio. Attiva: fondo coral, **testo nero di marchio** (mai bianco: 2.6:1). Il codice ISO precede il nome in monospazio 13px.
- **Toggle (tipo di autore, ordinamento):** pastiglia contornata, fondo canvas, selezionata a fondo nero di marchio con testo canvas.
- **Pastiglie dei rilevatori:** quattro quadrati da 14px con raggio 4px, uno per rilevatore, nel colore di riconoscimento del modello. Pieno = sintetico sopra soglia; contornato = sotto soglia; **tratteggiato = non valutato**. Accanto, in monospazio 12px, «3/4 lo dicono sintetico». Si contano a colpo d'occhio, che è la domanda che ci si pone scorrendo l'archivio; la percentuale esatta resta nel titolo e nel dettaglio.

### Cards / Containers

- **Blocco** (l'unità di contenuto): raggio 22px, bordo `1px solid #e5e7eb`, fondo canvas, padding 32px (24px sotto `md`). Intestazione con occhiello mono opzionale, titolo in `featureHeading`, descrizione entro 70ch, e uno slot azione allineato a destra del titolo per filtri e menu.
- **Scheda cifra:** fondo pietra, raggio 8px, padding 24px, **filetto superiore da 3px** nella tinta dell'accento. Etichetta mono, numero in display 32px, nota esplicativa. Non calcola e non arrotonda: riceve il valore già formattato, e chi la usa passa `n/d` quando il dato manca — uno 0 inventato sarebbe indistinguibile da uno 0 misurato.
- **Filtri:** stessa forma del blocco ma fondo `#fafaf8`, appena più caldo del canvas, per distinguere i controlli dal contenuto senza aggiungere un bordo in più.

### Inputs / Fields

- **Campo di testo:** contorno MUI, fondo canvas, **raggio a pastiglia** (32px), corpo 15px, taglia `small`. Icona di ricerca 18px in `#93939f` come adornment iniziale; quando c'è testo, un bottone tondo di cancellazione a destra.
- **Select:** stessa forma a pastiglia, larghezza minima 180px, voci di menu a 14px.
- **Focus:** l'anello globale. Nessun trattamento speciale per campo.
- **Nome accessibile obbligatorio:** `inputProps={{ "aria-label": ... }}` — scritto sulla radice, MUI lo passerebbe al `FormControl` e il campo resterebbe senza nome.

### Navigation

- **Sidebar** (colonna di icone da 72px su desktop, 260px da aperta; drawer temporaneo sotto `sm`): monogramma nero 32px con «SNM», nome applicazione in display 15px/700, sottotitolo in monospazio 10px maiuscolo. Le voci sono raggruppate **per capitolo della pipeline**, ogni gruppo introdotto dal numero romano in coral su fondo `#fff0ec` (raggio 4px) e dall'etichetta in monospazio 11px.
- **I due modi di aprirla, e la differenza non è cosmetica.** *Al passaggio del mouse o del focus* il pannello scorre **sopra** il contenuto: il foglio è in posizione fissa, la pagina sotto non si accorge di nulla e non viene ridisegnata — è il caso frequente e transitorio, e ridisegnare a ogni passaggio del mouse vorrebbe dire rifare il canvas del grafo e i grafici della dashboard. *Col comando di blocco* il pannello **spinge** il contenuto: chi lo preme ha chiesto che le etichette restino, non che un quinto della pagina resti coperto. È il caso raro e deliberato, quindi il riflusso si paga volentieri. L'ombra compare solo nel primo caso (vedi Elevation).
- **Il comando di blocco** sta in una riga sua in cima al pannello, allineato a sinistra perché deve restare dentro i 72px visibili a riposo: un comando fuori da quella striscia sarebbe raggiungibile solo dopo essere riusciti ad aprire il pannello. Porta `aria-expanded` e `aria-controls`. Esiste perché l'hover non è disponibile a tutti: da 600px in su non c'era il pulsante della barra e non c'era l'hover, quindi su un tablet o un portatile touch le etichette restavano invisibili per sempre e toccare una voce navigava prima che si potesse leggerne il nome.
- **Voce:** raggio 8px, padding `7px 10px`, corpo 13.5px peso 500, icona 18px in testo attenuato. Hover: fondo pietra. Sotto `@media (pointer: coarse)` l'altezza minima passa a 44px: la misura cambia col puntatore e non con la larghezza dello schermo, perché un portatile touch è largo e si usa col dito.
- **Etichette:** a pannello chiuso svaniscono in opacità, non escono dal documento. `display: none` cambierebbe il nome accessibile del collegamento a seconda della posizione del mouse, e chi naviga con uno screen reader troverebbe otto link chiamati come la loro icona, cioè per niente.
- **Voce attiva:** fondo nero di marchio, testo canvas peso 600, **icona coral**. È l'unico punto in cui il coral appare senza significare «bot»: qui significa «sei qui».
- **Prefetch:** su `mouseenter`, `focus` e `touchstart` la voce precarica sia il chunk della rotta sia i dati. La navigazione deve sembrare istantanea.
- **Piè di sidebar:** pallino di stato 6px in successo con glow, «Fediverso Live» in monospazio 11px, versione a destra in testo tenue 10px.

### Indice degli atti (componente distintivo)

Colonna sticky a sinistra (3/12) con le voci degli atti: numero romano in monospazio 12px, titolo in display 14px. La voce corrente passa a nero di marchio peso 600 e porta `aria-current`; le altre restano in testo attenuato. Sparisce sotto `md` invece di comprimersi — un indice fisso su schermo stretto coprirebbe il testo invece di accompagnarlo. Lo scorrimento è gestito a mano (l'app monta un `HashRouter`, e lasciar seguire al browser un `href="#atto"` sostituirebbe la rotta), ma l'`href` resta perché è ciò che rende queste voci dei link per la tastiera e per gli screen reader.

### Banda scura (componente distintivo)

Fascia a piena larghezza che chiude un capitolo. Occhiello mono in bianco al 60%, titolo in `sectionDisplay` entro 20ch, paragrafo in bianco al 72% entro 62ch, e da due a quattro cifre chiave — oltre le quattro la banda smette di avere un fuoco. **Le cifre non sono in card:** ognuna sta sotto un filetto bianco al 24%, perché dentro una banda scura la separazione la fa la regola, non il riquadro. I margini negativi che la portano a filo dei bordi vengono dallo stesso token del padding del container, quindi non possono divergere.

### Stati di pagina

- **Caricamento:** spinner nero di marchio centrato su 60vh *solo* per la pagina intera. Dentro una sezione si usano scheletri che imitano la disposizione reale (griglie, tabelle, il riquadro del grafo) — un rettangolo generico darebbe un segnale di caricamento peggiore.
- **Errore:** riquadro contornato pericolo su fondo `#fdf2f2`, raggio 16px, messaggio in peso 600. Se il messaggio è vuoto il componente non rende nulla.
- **Vuoto:** riquadro contornato neutro, padding 48px, testo centrato in testo attenuato, che dice **cosa manca e perché** — non «nessun risultato».

## 6. Do's and Don'ts

### Do:

- **Do** partire dal canvas bianco e lasciare che il colore arrivi dai dati: una categoria, uno stato, un rilevatore, una banda di chiusura.
- **Do** aprire ogni atto con la domanda a cui risponde, in `sectionHeading` entro 24ch, prima di qualunque cifra.
- **Do** usare le tinte di `tinte.ts` per bot (coral), non-dichiarato-bot (verde), sintetico (viola) e non valutato (`#d9d9dd`). Se serve una quinta categoria, si dichiara lì, non nel componente.
- **Do** usare il coral pieno come riempimento con testo nero di marchio sopra, come marcatore, o come tinta su fondo scuro; il coral inchiostro (`TINTA_BOT_INK`) quando la stessa tinta deve essere letta su fondo chiaro.
- **Do** scegliere il grigio dalla famiglia della superficie: `textMuted` sulle chiare, `textOnDark` sulle scure, bianco trasparente al 70-72% sulle bande verdi e navy.
- **Do** mostrare `n/d` quando il dato manca. Uno 0 inventato è indistinguibile da uno 0 misurato.
- **Do** dare a ogni controllo interattivo default, hover, focus, premuto e disabilitato. Transizioni a 150 ms su colore e fondo.
- **Do** usare gli scheletri di caricamento che imitano la disposizione reale della sezione, e lo spinner solo per la pagina intera.
- **Do** dichiarare il nome accessibile dei campi *e dei menu* con `inputProps={{ "aria-label": ... }}`, e distinguere le categorie dei grafici con forma o etichetta oltre che con la tinta.
- **Do** rendere ogni azione raggiungibile da tastiera con un elemento nominato. Una riga di tabella cliccabile non basta: il bersaglio è il nome nella cella, reso come bottone, e il clic sulla riga resta per il mouse. Un `onClick` su un `tr` senza `tabIndex`, `role` e gestione dei tasti è un comando che esiste solo per chi vede il cursore cambiare forma.
- **Do** marcare la prima cella di ogni riga di dati con `component="th" scope="row"`: è il nome che dice di chi sono i numeri accanto, e in una matrice è l'unica cosa che dice a quale coppia appartiene un valore.
- **Do** dare `tabIndex={0}`, `role="region"` e un `aria-label` a ogni contenitore che scorre. Un'area che scorre col mouse e non con la tastiera tiene fuori portata proprio le colonne per cui scorre.
- **Do** dare un nome ai grafici che non hanno alternativa testuale (`role="img"` più `aria-label` che riassuma i numeri, o che indichi la tabella dove sono). Se invece i valori sono già nel testo accanto, `aria-hidden` sulla grafica: ripeterli non è accesso, è rumore.
- **Do** importare da `tokens` (`frontend/src/theme.ts`): i colori erano finiti duplicati in oltre mille letterali esadecimali, le trasparenze in diciassette letterali `rgba`, e le varianti sbagliate passavano inosservate.
- **Do** far passare da `escapeHtml` (`utils/html.ts`) qualunque dato che finisca in una stringa HTML — oggi solo il `formatter` del tooltip di ECharts. `acct` e `id` dei nodi arrivano dalle istanze Mastodon remote: sono l'unico dato non fidato dell'applicazione che diventa markup.

### Don't:

- **Don't** costruire una **dashboard admin generica**: griglie di card identiche con icona + numero + freccia verde, KPI senza contesto, template Material riconoscibile a colpo d'occhio.
- **Don't** costruire una **landing page SaaS**: gradienti decorativi, glassmorphism, metriche gonfiate a effetto, strisce «Trusted by», CTA in ogni sezione. Compreso il template hero-metric — numero gigante, etichetta piccola, statistiche di supporto.
- **Don't** consegnare un **progetto universitario improvvisato**: grafici grezzi della libreria, tabelle nude, palette di default, nessuna gerarchia tipografica. Un'interfaccia trascurata mette in dubbio anche la pipeline che la alimenta.
- **Don't** mettere ombre sulle card. Nessuna. La profondità è alternanza di superficie e filetti da 1px.
- **Don't** annidare riquadri. Un blocco dentro un blocco è sempre sbagliato.
- **Don't** usare `border-left` o `border-right` colorati di spessore maggiore di 1px come accento. Il filetto da 3px della scheda cifra sta **in alto**, ed è l'unico consentito.
- **Don't** mettere due bande scure nella stessa pagina, né usare la variante a piena larghezza in una pagina con indice laterale.
- **Don't** mettere un occhiello in monospazio sopra ogni sezione. Solo quando dice qualcosa che il titolo non dice.
- **Don't** usare Space Grotesk nelle etichette di form, nelle celle di tabella o nei valori dei dati.
- **Don't** usare `textOnDark` (`#93939f`) su una superficie chiara: dà 3,0:1. È il grigio delle superfici scure, e sotto `textMuted` non esiste un grigio che passi AA sul bianco — se serve de-enfasi, si usa il corpo o il peso, non un grigio più chiaro.
- **Don't** scrivere testo bianco su coral (2,6:1) né su verde di stato (2,6:1). Su una tinta satura chiara si scrive in nero di marchio.
- **Don't** uniformare le quattro superfici scure: grafo, cascata, console e modale hanno fondi diversi perché contengono cose diverse.
- **Don't** animare proprietà di layout, né aggiungere sequenze d'ingresso alla pagina. Il movimento comunica uno stato: cambio, risposta, caricamento. Nient'altro.
- **Don't** affidare a un passaggio del mouse un'informazione che serve. Nessun attributo `title` come unico portatore di una nota: non compare al tocco, non si raggiunge da tastiera se sta su un elemento che non prende focus, e su un proiettore nessuno lo vedrà mai. Se è provenienza di un dato, sta in pagina.
- **Don't** reinventare affordance standard — scrollbar custom oltre il filetto da 4px già in sidebar, controlli di form fuori vocabolario, modali dove basterebbe una sezione in linea.
