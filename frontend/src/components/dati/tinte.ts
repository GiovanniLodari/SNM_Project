import { tokens } from "../../theme.ts";

/**
 * Le tinte delle categorie ricorrenti del Capitolo I.
 *
 * Le stesse due distinzioni - dichiarato bot o no, testo giudicato sintetico o
 * no - compaiono su entrambe le pagine del capitolo, in barre, chip e
 * classifiche. Finche' ogni componente sceglieva il proprio colore, il coral
 * voleva dire "bot" in un riquadro e "IA" in quello accanto, e la legenda
 * andava riletta a ogni blocco. Qui la corrispondenza si dichiara una volta.
 *
 * Bot e IA non sono la stessa cosa e non condividono la tinta di proposito: e'
 * la distanza fra le due che il capitolo mette in scena.
 */

/** Account che si dichiara automatizzato nel proprio profilo. */
export const TINTA_BOT = tokens.color.coral;

/** Account che non si dichiara tale. Non significa "verificato umano". */
export const TINTA_UMANO = tokens.color.deepGreen;

/** Testo che il rilevatore marca come sintetico. */
export const TINTA_IA = tokens.color.purple;

/** Materiale su cui nessun rilevatore si e' ancora pronunciato. */
export const TINTA_NON_VALUTATO = tokens.color.borderStrong;
