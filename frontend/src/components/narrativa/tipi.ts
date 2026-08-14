/**
 * Tipi e costanti della narrazione per atti.
 *
 * Il pattern nasce nella sezione Influence Maximization - una domanda per atto,
 * un indice laterale che segue la lettura - ed e' l'unico punto in cui il
 * frontend spiegava se stesso invece di limitarsi a mostrare dei numeri. Qui
 * diventa disponibile a tutti i capitoli: `components/narrativa/` contiene la
 * forma, ogni capitolo porta i propri contenuti.
 */

export interface Atto {
  /** Ancora per l'indice laterale, unica dentro un capitolo. */
  id: string;
  /** Progressivo in numeri romani, "I" - "IV". */
  numero: string;
  titolo: string;
  /** La domanda con cui l'atto si apre. */
  domanda: string;
}

/**
 * Altezza dello sticky top dell'indice, in pixel. Governa anche lo
 * `scrollMarginTop` delle sezioni: le due cose devono restare uguali perche'
 * l'ancora atterri esattamente sotto l'indice, quindi vivono in questo unico
 * valore condiviso invece che duplicate come numeri scritti a mano.
 */
export const OFFSET_INDICE_PX = 96;
