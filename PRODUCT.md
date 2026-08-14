# Product

## Register

product

## Users

Il lettore primario è **il relatore e la commissione di tesi**: valutano in una sessione breve, spesso su schermo proiettato, e non rileggeranno il codice. Arrivano già competenti sul metodo scientifico ma non necessariamente sul Fediverso, su Mastodon o sui singoli rilevatori di testo sintetico (FastDetectGPT, Binoculars, Desklib, AdaDetectGPT). Il lavoro che devono poter fare è **giudicare**: capire cosa è stato misurato, con quale procedura, e quanto i risultati reggano.

Lettori secondari, che l'interfaccia deve continuare a servire ma senza dettare le scelte di design:

- **Colleghi e ricercatori** che clonano il repository e vogliono arrivare al dato grezzo per contestarlo.
- **L'autore stesso**, che usa `/pipelines` e `/db-sync` come strumenti operativi quotidiani.

Il contesto d'uso primario è la lettura sequenziale: si entra dalla Panoramica e si percorrono i capitoli in ordine (I corpus → II testo sintetico → III verifica → IV propagazione). L'esplorazione libera per filtro e tabella è il secondo movimento, non il primo.

## Product Purpose

SNM.Intelligence rende ispezionabile una pipeline di analisi del Fediverso che altrimenti vivrebbe come una collezione di script Python e file JSONL. Raccoglie post, account e archi di follow dalle istanze Mastodon; sottopone ogni testo a quattro rilevatori indipendenti di scrittura automatica; verifica le affermazioni verificabili con un LLM che cita le proprie fonti; misura da quali nodi conviene partire perché un contenuto raggiunga più persone possibile, e fin dove arriva davvero.

La domanda che il progetto pone è una: **quanta parte del Fediverso non l'ha scritta una persona, e quanto lontano arriva.**

Il successo si misura così: chi ha visto l'interfaccia esce convinto che **il lavoro tecnico sia serio ed eseguito bene** — quattro rilevatori indipendenti anziché uno, verdetti con le fonti allegate, un grafo sociale reale anziché sintetico — e sa dire, per ogni cifra vista, da dove viene.

## Brand Personality

**Sobria, rigorosa, verificabile.**

Tono da laboratorio di ricerca, non da prodotto. L'interfaccia non persuade e non celebra: espone. Non c'è enfasi tipografica dove non c'è enfasi nel dato, non ci sono cifre isolate dal loro margine di errore, non ci sono affermazioni che il database locale non possa sostenere. «Ogni numero che vedi qui viene dal database locale: nulla è simulato» non è una frase della hero, è il vincolo di progetto.

La lingua è l'italiano corrente, in tutto: codice, commenti, interfaccia. I titoli di capitolo sono domande («Quanto di questo testo l'ha scritto una macchina»), non etichette funzionali. La sigla non definita è un difetto, non un segno di competenza.

L'emozione da produrre è **fiducia nell'esecuzione**: la sensazione che chi ha costruito questo abbia guardato i casi difficili prima che glieli facessero notare.

## Anti-references

- **Dashboard admin generica.** Griglia di card identiche con icona + numero + freccia verde, template Material o Bootstrap riconoscibile a colpo d'occhio, KPI senza contesto. Le card sono la risposta pigra: si usano solo quando sono davvero l'affordance migliore, mai annidate.
- **Landing page SaaS.** Gradienti decorativi, glassmorphism, metriche gonfiate a effetto, strisce «Trusted by», CTA in ogni sezione. Vendere invece di mostrare. Vale anche per il template hero-metric: numero gigante, etichetta piccola, statistiche di supporto.
- **Progetto universitario improvvisato.** Il rischio opposto e altrettanto grave: grafici matplotlib grezzi, tabelle HTML nude, palette di default della libreria, nessuna gerarchia tipografica. Un'interfaccia trascurata mette in dubbio anche la pipeline che la alimenta.

## Design Principles

1. **Ogni numero porta con sé la sua provenienza.** Una cifra senza fonte, soglia o dimensione del campione è un'affermazione non verificabile. Se non c'è spazio per la provenienza accanto al dato, c'è spazio per un modo di raggiungerla.

2. **La competenza si dimostra dichiarando i limiti.** Il punto in cui i quattro rilevatori divergono è il contenuto più prezioso del capitolo II, non un imbarazzo da smussare. Una stima presentata come stima è più credibile di una certezza fabbricata.

3. **Spiegare prima di mostrare.** Ogni atto apre con la domanda a cui risponde, in italiano corrente. Il lettore non deve sapere cosa sia Binoculars per leggere il grafico che lo riguarda.

4. **La densità si guadagna.** La tabella con dodici colonne di filtri arriva dopo che il lettore ha il contesto per leggerla — non è la prima cosa che vede. La struttura a capitoli e atti esiste per questo: prima la domanda, poi il metodo, poi il dato grezzo.

5. **La coerenza è parte dell'argomentazione.** Un titolo che cambia misura fra due sezioni, una tinta duplicata a mano, un focus ring diverso da Chrome a Firefox: sono piccoli difetti che pesano perché suggeriscono la stessa distrazione anche a monte, nel codice che produce i numeri. La sorgente unica dei valori (`frontend/src/theme.ts`, `navigazione.ts`) esiste per rendere impossibile quella divergenza.

## Accessibility & Inclusion

> Sezione non confermata in intervista: dedotta dal codice e dal contesto d'uso. Da correggere se i vincoli reali sono altri.

- **WCAG 2.1 AA** come obiettivo: contrasto ≥4.5:1 sul testo corrente (≥3:1 sul testo grande), focus da tastiera sempre visibile — l'anello unico è già dichiarato in `theme.ts` (`MuiCssBaseline`, `focusBlue #4c6ee6`) — e navigazione completa da tastiera su filtri, tabelle ed esploratori.
- **Grafici leggibili senza colore.** Le distinzioni portanti (bot / umano, sopra / sotto soglia, nodo attivato / non attivato) non possono affidarsi alla sola tinta: servono forma, etichetta diretta o pattern. Riguarda in particolare le coppie rosso/verde già presenti nel grafo (`graphBot #ff5252` / `graphHuman #38bdf8`, `success` / `danger`).
- **`prefers-reduced-motion` rispettato.** Le animazioni framer-motion e la cascata di influenza devono avere un'alternativa senza moto — dissolvenza o stato finale immediato — mai un contenuto che appare solo a transizione avvenuta.
- **Leggibilità in proiezione.** Il contesto d'uso primario è un proiettore d'aula: contrasto alto, niente testo sotto i 14px nelle sezioni che raccontano un risultato, e nessuna informazione affidata a un hover.
