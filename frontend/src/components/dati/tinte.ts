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

/**
 * La tinta dei bot quando deve essere letta invece che riempita: la cifra di
 * una SchedaCifra, l'etichetta che la sormonta, un numero in corpo grande.
 *
 * `TINTA_BOT` e' pensata come fondo - una barra, una chip, un quadratino - e su
 * fondo chiaro non arriva ne' a 4.5:1 come testo ne' a 3:1 come segno. Le altre
 * tre tinte non hanno questo problema (il viola da' 4.8:1 sulla pietra, il
 * verde 10.5:1), quindi la variante "inchiostro" esiste solo qui: aggiungerne
 * altre tre inutilizzate renderebbe piu' difficile capire quando serve questa.
 */
export const TINTA_BOT_INK = tokens.color.coralInk;

/** Account che non si dichiara tale. Non significa "verificato umano". */
export const TINTA_UMANO = tokens.color.deepGreen;

/** Testo che il rilevatore marca come sintetico. */
export const TINTA_IA = tokens.color.purple;

/** Materiale su cui nessun rilevatore si e' ancora pronunciato. */
export const TINTA_NON_VALUTATO = tokens.color.borderStrong;
