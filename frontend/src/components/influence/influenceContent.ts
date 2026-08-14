/**
 * Testi della sezione Influence Maximization.
 *
 * Come per homeContent.ts: questa sezione deve reggere la lettura di un
 * valutatore, quindi la sua copia va riletta come un testo e non cercata dentro
 * gli attributi `sx`. Tenerla qui rende anche i componenti verificabili.
 */

import type { Atto } from "../narrativa/tipi.ts";

export const ATTI: readonly Atto[] = [
  {
    id: "problema",
    numero: "I",
    titolo: "Il problema",
    domanda: "Quali account scegliere per far arrivare un contenuto al maggior numero di persone?",
  },
  {
    id: "algoritmo",
    numero: "II",
    titolo: "Quale algoritmo",
    domanda: "Fra cinque metodi di selezione, quale conviene davvero usare?",
  },
  {
    id: "cascata",
    numero: "III",
    titolo: "La cascata sul grafo reale",
    domanda: "Applicando l'algoritmo scelto all'intera rete, fin dove arriva la propagazione?",
  },
  {
    id: "limiti",
    numero: "IV",
    titolo: "Limiti",
    domanda: "Che cosa questi numeri non dimostrano?",
  },
];

export const PROBLEMA = {
  enunciato:
    "Dato il grafo diretto G = (V, E), le probabilita' di attivazione p_ic sugli archi, " +
    "l'insieme dei candidati C incluso in V (gli account classificati come IA) e un budget k, " +
    "scegliere S incluso in C con |S| <= k che massimizzi sigma(S), il numero atteso di nodi " +
    "attivati sotto il modello Independent Cascade.",
  perche_difficile:
    "Calcolare sigma esattamente e' #P-hard e il problema di massimizzazione e' NP-hard. " +
    "La submodularita' di sigma garantisce pero' al greedy un'approssimazione (1 - 1/e): " +
    "e' la ragione per cui esistono piu' algoritmi da confrontare invece di una sola risposta.",
};

export const MODELLO_IC = {
  metodo: "independent_trials",
  formula: "p(u,v) = min( 1 - (1 - p0)^peso(u,v) , tetto )",
  p0: 0.05,
  tetto: 0.999,
  spiegazione:
    "Ogni unita' di peso dell'arco e' un tentativo indipendente con probabilita' p0. " +
    "Il tetto evita archi a probabilita' esattamente 1, degeneri per PMIA che calcola la " +
    "probabilita' di un cammino come prodotto delle probabilita' degli archi.",
  sorgente: "Max_Influence/graph_builder.py",
};

export interface Limite {
  titolo: string;
  testo: string;
}

export const LIMITI: Limite[] = [
  {
    titolo: "Una sola realizzazione, non un valore atteso",
    testo:
      "I nodi raggiunti dalla cascata provengono da una singola realizzazione Independent " +
      "Cascade, come dichiara il campo note dei dati. Non e' una stima di sigma(S) e non " +
      "ha un intervallo di confidenza: una seconda esecuzione darebbe un numero diverso.",
  },
  {
    titolo: "Il confronto gira su un frammento della rete",
    testo:
      "Gli algoritmi sono confrontati su un sottografo snowball che rappresenta circa il 3% " +
      "dei nodi. I tempi e gli spread misurati li' non si trasferiscono automaticamente alla " +
      "scala piena, dove anzi il piu' costoso — 4.228,67 s su un grafo circa 32 volte piu' " +
      "piccolo di quello completo — avrebbe un tempo proibitivo, non dimostrabilmente infinito.",
  },
  {
    titolo: "Il vincolo di budget non e' mai attivo",
    testo:
      "Si richiedono k = 1000 seed ma i candidati disponibili nel sottografo sono 822. " +
      "Quattro algoritmi su cinque li prendono tutti: in queste condizioni il confronto " +
      "misura l'ordinamento dei candidati, non la selezione sotto vincolo, che e' il " +
      "problema originale.",
  },
  {
    titolo: "Il problema non discrimina gli algoritmi",
    testo:
      "Una sovrapposizione di Jaccard pari a 1 fra quattro algoritmi significa che su questo " +
      "sottografo il problema e' troppo facile per distinguerli. Il confronto dice quale " +
      "metodo costa meno, non quale sceglie meglio.",
  },
];
