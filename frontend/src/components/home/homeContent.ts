import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import { CAPITOLI_NUMERATI } from "../../navigazione.ts";

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
  /** Numero romano del capitolo, lo stesso che porta la sidebar. */
  numero: string;
  titolo: string;
  descrizione: string;
  ctaLabel: string;
  /** Rotta gia' registrata in App.tsx. */
  path: string;
  icona: ComponentType<SvgIconProps>;
}

/**
 * I quattro passi, derivati dai capitoli invece che riscritti.
 *
 * Erano un secondo elenco, numerato "01"-"04" e con titoli propri ("Raccolta",
 * "Bot e influenza") che non comparivano da nessun'altra parte: la homepage
 * prometteva quattro passi con certi nomi e la sidebar ne offriva dodici con
 * nomi diversi. Derivandoli, la promessa e la navigazione non possono piu'
 * divergere - e un capitolo che cambia nome lo cambia in entrambi i posti.
 */
export const STEPS: readonly HomeStep[] = CAPITOLI_NUMERATI.map((capitolo) => ({
  // I capitoli numerati hanno sempre un numero: e' la condizione con cui sono
  // stati selezionati.
  numero: capitolo.numero ?? "",
  titolo: capitolo.etichetta,
  descrizione: capitolo.sommario,
  ctaLabel: capitolo.ctaLabel,
  path: capitolo.voci[0].path,
  icona: capitolo.icona,
}));
