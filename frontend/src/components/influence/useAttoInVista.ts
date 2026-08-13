import { useEffect, useState } from "react";
import { ATTI } from "./influenceContent.ts";

// Fascia orizzontale, espressa come margini negativi sul viewport, entro cui
// una sezione conta come "quella che si sta leggendo": un terzo dall'alto.
// Non e' il centro esatto perche' lo sguardo si posa piu' in alto della meta'
// dello schermo, e non e' il bordo superiore perche' li' la sezione successiva
// diventerebbe attiva mentre la precedente occupa ancora tutto lo schermo.
const FASCIA_DI_LETTURA = "-33% 0px -67% 0px";

/**
 * Id dell'atto attualmente in vista, per evidenziarlo nell'indice laterale.
 *
 * Osserva le quattro sezioni con un `IntersectionObserver` invece che con un
 * listener di scroll: il browser calcola le intersezioni fuori dal thread di
 * rendering, quindi l'evidenziazione non costa un reflow a ogni pixel di
 * scorrimento.
 *
 * Se `IntersectionObserver` non esiste (jsdom nei test, browser molto vecchi)
 * la funzione non fallisce: resta attivo il primo atto e l'indice continua a
 * funzionare come lista di ancore, che e' il suo compito principale.
 */
export function useAttoInVista(): string {
  const [attivo, setAttivo] = useState<string>(ATTI[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sezioni = ATTI.map((atto) => document.getElementById(atto.id)).filter(
      (elemento): elemento is HTMLElement => elemento !== null,
    );
    if (sezioni.length === 0) return;

    // La fascia e' alta zero: al piu' una sezione la interseca per volta,
    // quindi non serve arbitrare fra piu' candidati. Quando la fascia cade in
    // un vuoto fra due sezioni nessuna emette, e l'ultimo atto attivo resta:
    // e' il comportamento voluto, l'indice non deve sfarfallare.
    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const voce of voci) {
          if (voce.isIntersecting) setAttivo(voce.target.id);
        }
      },
      { rootMargin: FASCIA_DI_LETTURA },
    );

    for (const sezione of sezioni) osservatore.observe(sezione);
    return () => osservatore.disconnect();
  }, []);

  return attivo;
}
