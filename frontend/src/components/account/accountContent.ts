/**
 * Testi del capitolo sugli account.
 *
 * Come per corpusContent.ts e detectionContent.ts: la copia sta fuori dai
 * componenti, cosi' puo' essere riletta come un testo continuo - che e' il modo
 * in cui la leggera' chi valuta il progetto.
 */

import type { Atto } from "../narrativa/tipi.ts";

export const ATTI_ACCOUNT: readonly Atto[] = [
  {
    id: "popolazione",
    numero: "I",
    titolo: "La popolazione",
    domanda: "Chi sono gli account che hanno scritto il corpus, e da dove vengono?",
  },
  {
    id: "dichiarazione",
    numero: "II",
    titolo: "Dichiarazione e sospetto",
    domanda: "Dirsi bot e scrivere come una macchina sono la stessa cosa?",
  },
  {
    id: "peso",
    numero: "III",
    titolo: "Il peso nella rete",
    domanda: "Questi account, quanta voce hanno?",
  },
];

/**
 * Le tre colonne della matrice dell'Atto II. Sono tre e non due perche' "non
 * produce testo sintetico" e "non ha post valutati" sono cose diverse: fonderle
 * spaccerebbe un'assenza di misura per una misura, ed e' l'errore che questa
 * pagina esiste per non fare.
 */
export const COLONNE_MATRICE = [
  {
    id: "ia",
    titolo: "Produce testo sintetico",
    spiegazione: "Media dei punteggi del rilevatore sopra la soglia",
  },
  {
    id: "non-ia",
    titolo: "Valutato, sotto soglia",
    spiegazione: "Il rilevatore ha letto i suoi post e li ha lasciati passare",
  },
  {
    id: "non-valutato",
    titolo: "Nessun post valutato",
    spiegazione: "Nessun punteggio disponibile: su questi non si sa nulla",
  },
] as const;
