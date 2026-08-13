import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import {
  Storage as RaccoltaIcon,
  Psychology as RilevamentoIcon,
  FactCheck as FactCheckIcon,
  TrendingUp as InfluenzaIcon,
} from "@mui/icons-material";

/**
 * Testi della homepage, raccolti qui invece che sparsi nel JSX.
 *
 * La homepage e' la sola pagina il cui compito e' spiegare il progetto a chi
 * non lo conosce: la sua copia va riletta e corretta come un testo, non cercata
 * dentro gli attributi `sx`. Tenerla in un modulo separato rende anche i
 * componenti di presentazione verificabili con contenuti finti.
 */

/** Ancora del blocco "Come funziona", condivisa fra la CTA della hero e la sezione. */
export const ANCORA_COME_FUNZIONA = "come-funziona";

export const HERO = {
  eyebrow: "SNM · ANALISI DEL FEDIVERSO",
  titolo: "Quanta parte del Fediverso non l'ha scritta una persona?",
  paragrafo:
    "Questo progetto raccoglie post e relazioni di follow dalle istanze del Fediverso, " +
    "passa ogni testo attraverso quattro rilevatori di scrittura automatica, verifica le " +
    "affermazioni verificabili e ricostruisce come un contenuto si propaga nella rete. " +
    "Ogni numero che vedi qui viene dal database locale: nulla e' simulato.",
  ctaPrimaria: "Esplora il corpus",
  ctaSecondaria: "Come funziona",
} as const;

export interface HomeStep {
  /** Progressivo mostrato in mono, "01" - "04". */
  numero: string;
  titolo: string;
  descrizione: string;
  ctaLabel: string;
  /** Rotta gia' registrata in App.tsx. */
  path: string;
  icona: ComponentType<SvgIconProps>;
}

export const STEPS: readonly HomeStep[] = [
  {
    numero: "01",
    titolo: "Raccolta",
    descrizione:
      "Un crawler percorre le istanze del Fediverso e archivia post, account e archi di follow, " +
      "costruendo il corpus su cui lavora tutto il resto.",
    ctaLabel: "Sfoglia i post",
    path: "/posts",
    icona: RaccoltaIcon,
  },
  {
    numero: "02",
    titolo: "Rilevamento del testo sintetico",
    descrizione:
      "Quattro rilevatori indipendenti - FastDetectGPT, Binoculars, Desklib e AdaDetectGPT - " +
      "leggono lo stesso testo. Dove non concordano, il confronto lo mostra.",
    ctaLabel: "Confronta i detector",
    path: "/detector-comparison",
    icona: RilevamentoIcon,
  },
  {
    numero: "03",
    titolo: "Verifica dei fatti",
    descrizione:
      "Le affermazioni verificabili vengono controllate da un LLM che cita le sue fonti, " +
      "cercate su DuckDuckGo e Wikipedia.",
    ctaLabel: "Leggi i verdetti",
    path: "/fact-check",
    icona: FactCheckIcon,
  },
  {
    numero: "04",
    titolo: "Bot e influenza",
    descrizione:
      "Quali account sono automatizzati, e da quali nodi conviene partire perche' un " +
      "contenuto raggiunga piu' persone possibile.",
    ctaLabel: "Vedi la diffusione",
    path: "/influence-maximization",
    icona: InfluenzaIcon,
  },
];
