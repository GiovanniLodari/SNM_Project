import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import {
  Home as PanoramicaIcon,
  Article as PostsIcon,
  People as AccountsIcon,
  Psychology as RilevamentoIcon,
  FactCheck as FactCheckIcon,
  TrendingUp as PropagazioneIcon,
  PlayCircle as PipelineIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";

/**
 * Struttura della navigazione, sorgente unica.
 *
 * Il progetto e' una pipeline in quattro passaggi - si raccoglie un corpus dal
 * Fediverso, si stabilisce quanto ne sia scritto da una macchina, si verificano
 * le affermazioni verificabili, si misura come un contenuto si propaga - ma la
 * navigazione era un elenco piatto di dodici voci in cui quell'ordine non si
 * vedeva: quattro voci "IA:" consecutive per lo stesso strumento, e i due
 * strumenti operativi mescolati ai risultati.
 *
 * Qui i capitoli sono dichiarati una volta e letti da tre posti che prima si
 * ripetevano a mano e divergevano: la sidebar di App.tsx, i quattro passi della
 * homepage (che numeravano "01"-"04" mentre la sidebar non numerava affatto) e
 * l'intestazione di ogni pagina.
 */

export interface VoceNav {
  testo: string;
  /** Rotta gia' registrata in App.tsx. */
  path: string;
  icona: ComponentType<SvgIconProps>;
}

export interface Capitolo {
  /** Chiave stabile, usata per i riferimenti nel codice. */
  id: string;
  /** Numero romano. Assente per Panoramica e Strumenti, che non sono passaggi della pipeline. */
  numero?: string;
  /** Nome breve, quello che si legge nella sidebar e nell'occhiello di pagina. */
  etichetta: string;
  /** Titolo esteso della pagina principale del capitolo. */
  titolo: string;
  /** Paragrafo che inquadra il capitolo, in apertura di pagina. */
  guida: string;
  /** Una frase per la homepage: cosa fa questo passaggio. */
  sommario: string;
  /** Testo del bottone che porta al capitolo dalla homepage. */
  ctaLabel: string;
  icona: ComponentType<SvgIconProps>;
  voci: readonly VoceNav[];
}

export const CAPITOLO_PANORAMICA: Capitolo = {
  id: "panoramica",
  etichetta: "Panoramica",
  titolo: "Quanta parte del Fediverso non l'ha scritta una persona?",
  guida:
    "Il percorso completo in quattro capitoli, dal corpus grezzo alla misura di quanto " +
    "lontano arriva un contenuto nella rete.",
  sommario: "Il progetto in breve e i numeri complessivi del corpus.",
  ctaLabel: "Vai alla panoramica",
  icona: PanoramicaIcon,
  voci: [{ testo: "Panoramica", path: "/", icona: PanoramicaIcon }],
};

export const CAPITOLO_CORPUS: Capitolo = {
  id: "corpus",
  numero: "I",
  etichetta: "Il corpus",
  titolo: "Che cosa e' stato raccolto dal Fediverso",
  guida:
    "Un crawler percorre le istanze del Fediverso e archivia post, account e archi di follow. " +
    "E' il materiale grezzo su cui lavorano tutti i capitoli successivi: qui lo si sfoglia " +
    "cosi' com'e', prima che qualsiasi modello lo giudichi.",
  sommario:
    "Post, account e relazioni di follow archiviati dalle istanze del Fediverso, " +
    "il materiale grezzo di tutto il resto.",
  ctaLabel: "Sfoglia il corpus",
  icona: PostsIcon,
  voci: [
    { testo: "Post", path: "/posts", icona: PostsIcon },
    { testo: "Account & bot", path: "/accounts", icona: AccountsIcon },
  ],
};

export const CAPITOLO_TESTO_SINTETICO: Capitolo = {
  id: "testo-sintetico",
  numero: "II",
  etichetta: "Il testo sintetico",
  titolo: "Quanto di questo testo l'ha scritto una macchina",
  guida:
    "Quattro rilevatori indipendenti leggono lo stesso corpus. Prima si vede come " +
    "funzionano, poi cosa vede ciascuno preso da solo, infine dove le loro risposte " +
    "divergono - che e' il punto in cui i numeri smettono di essere rassicuranti.",
  sommario:
    "Quattro rilevatori indipendenti - FastDetectGPT, Binoculars, Desklib e AdaDetectGPT - " +
    "leggono lo stesso testo. Dove non concordano, il confronto lo mostra.",
  ctaLabel: "Leggi il capitolo",
  icona: RilevamentoIcon,
  voci: [{ testo: "Rilevamento IA", path: "/detection", icona: RilevamentoIcon }],
};

export const CAPITOLO_VERIFICA: Capitolo = {
  id: "verifica",
  numero: "III",
  etichetta: "La verifica dei fatti",
  titolo: "Le affermazioni verificabili reggono al controllo?",
  guida:
    "Le affermazioni verificabili vengono controllate da un LLM che cita le proprie fonti, " +
    "cercate su DuckDuckGo e Wikipedia. Ogni verdetto porta con se' il ragionamento che " +
    "lo ha prodotto, cosi' da poter essere contestato.",
  sommario:
    "Le affermazioni verificabili vengono controllate da un LLM che cita le sue fonti, " +
    "cercate su DuckDuckGo e Wikipedia.",
  ctaLabel: "Leggi i verdetti",
  icona: FactCheckIcon,
  voci: [{ testo: "Fact checking", path: "/fact-check", icona: FactCheckIcon }],
};

export const CAPITOLO_PROPAGAZIONE: Capitolo = {
  id: "propagazione",
  numero: "IV",
  etichetta: "La propagazione",
  titolo: "Propagazione e penetrazione del grafo sociale",
  guida:
    "Quattro atti: che problema si sta risolvendo, quale algoritmo conviene usare, fin dove " +
    "arriva la cascata sul grafo Mastodon reale e cosa questi numeri non dimostrano.",
  sommario:
    "Da quali nodi conviene partire perche' un contenuto raggiunga piu' persone possibile, " +
    "e fin dove arriva davvero.",
  ctaLabel: "Vedi la diffusione",
  icona: PropagazioneIcon,
  voci: [
    { testo: "Influence maximization", path: "/influence-maximization", icona: PropagazioneIcon },
  ],
};

export const CAPITOLO_STRUMENTI: Capitolo = {
  id: "strumenti",
  etichetta: "Strumenti",
  titolo: "Strumenti operativi",
  guida: "Esecuzione delle pipeline e sincronizzazione del database.",
  sommario: "Esecuzione delle pipeline e sincronizzazione del database.",
  ctaLabel: "Apri gli strumenti",
  icona: PipelineIcon,
  voci: [
    { testo: "Pipelines", path: "/pipelines", icona: PipelineIcon },
    { testo: "Database sync", path: "/db-sync", icona: SyncIcon },
  ],
};

/** I capitoli nell'ordine in cui compaiono nella sidebar. */
export const CAPITOLI: readonly Capitolo[] = [
  CAPITOLO_PANORAMICA,
  CAPITOLO_CORPUS,
  CAPITOLO_TESTO_SINTETICO,
  CAPITOLO_VERIFICA,
  CAPITOLO_PROPAGAZIONE,
  CAPITOLO_STRUMENTI,
];

/**
 * I quattro passaggi della pipeline, senza Panoramica e Strumenti: sono i
 * capitoli numerati, ed e' esattamente l'elenco che la homepage racconta.
 */
export const CAPITOLI_NUMERATI: readonly Capitolo[] = CAPITOLI.filter((c) => c.numero);

/**
 * Capitolo a cui appartiene una rotta, per l'indicatore nella barra superiore.
 *
 * Confronta i prefissi perche' le rotte di dettaglio (`/posts/42`) devono
 * risolvere al capitolo del loro elenco. La rotta "/" e' un caso a parte:
 * essendo prefisso di tutto, va confrontata per intero.
 */
export function capitoloDaRotta(pathname: string): Capitolo | undefined {
  if (pathname === "/") return CAPITOLO_PANORAMICA;
  return CAPITOLI.find((capitolo) =>
    capitolo.voci.some(
      (voce) => voce.path !== "/" && (pathname === voce.path || pathname.startsWith(`${voce.path}/`)),
    ),
  );
}
