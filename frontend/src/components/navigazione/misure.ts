/**
 * Le misure della sidebar, condivise fra il pannello e il guscio della pagina.
 *
 * A riposo resta la sola colonna delle icone. Aperto **al passaggio del mouse**
 * il pannello scorre *sopra* il contenuto invece di spingerlo, e l'area
 * contenuto non si muove: spingerla significherebbe ricalcolare il layout
 * dell'intera pagina a ogni passaggio del mouse - e su questa applicazione vuol
 * dire ridisegnare il canvas del grafo e i grafici della dashboard, che sarebbe
 * visibilmente lento oltre che inutile.
 *
 * Aperto **col comando di blocco** invece la pagina gli fa spazio, di scatto e
 * senza animazione. E' una scelta esplicita e rara, quindi il riflusso si paga
 * una volta; e chi la fa ha chiesto che le etichette restino, non che un quinto
 * della pagina resti coperto.
 *
 * Per lo stesso motivo il contenuto interno del pannello resta sempre largo
 * `LARGHEZZA_SIDEBAR` e viene ritagliato: a cambiare e' solo la larghezza del
 * foglio, quindi nessuna riga di testo va mai a capo mentre il pannello si
 * apre.
 */

/** Larghezza a riposo: icona da 18px piu' i margini, che la lasciano centrata. */
export const LARGHEZZA_RAIL = 72;

/** Larghezza a pannello aperto. */
export const LARGHEZZA_SIDEBAR = 260;

/** Durata dell'apertura, azzerata se il sistema chiede meno movimento. */
export const DURATA_TRANSIZIONE_MS = 180;

/**
 * Identificativo del pannello temporaneo, per l'`aria-controls` del pulsante
 * nella barra superiore.
 *
 * Un comando che sta *fuori* da cio' che apre deve poter dire quale pannello
 * apre: senza, chi ascolta sente "apri la navigazione" e non ha modo di sapere
 * che cosa e' comparso ne' dove. Il comando di blocco, che invece vive dentro il
 * pannello desktop, non ha bisogno dell'equivalente: gli basta `aria-expanded`.
 */
export const ID_NAVIGAZIONE_MOBILE = "navigazione-mobile";
