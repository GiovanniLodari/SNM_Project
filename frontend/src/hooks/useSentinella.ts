import { useCallback, useEffect, useRef, useState } from "react";

/** Quanto prima del bordo inferiore far scattare la sentinella. */
const ANTICIPO = "400px";

/**
 * Segnala quando un elemento segnaposto entra in vista, per caricare altro
 * contenuto prima che l'utente arrivi in fondo.
 *
 * L'anticipo di 400px esiste perche' una sentinella che scatta esattamente al
 * bordo arriverebbe sempre in ritardo: si vedrebbe l'elenco finire, poi lo
 * spazio vuoto, poi il caricamento. Facendola scattare mentre c'e' ancora
 * schermo da scorrere, il blocco successivo di norma e' gia' arrivato quando
 * serve.
 *
 * Usa `IntersectionObserver` invece di un listener di scroll: le intersezioni
 * il browser le calcola fuori dal thread di rendering, quindi la verifica non
 * costa un reflow a ogni pixel. Dove non esiste (jsdom nei test, browser molto
 * vecchi) la funzione non fallisce e resta il bottone esplicito, che e' il
 * motivo per cui quel bottone c'e' anche quando la sentinella funziona.
 */
export function useSentinella(attiva: boolean, quandoVisibile: () => void) {
  // Il nodo sta in uno stato, non in un ref: cosi' l'effetto si riaggancia se
  // React ne monta uno nuovo. Con un ref l'osservatore continuerebbe a
  // sorvegliare il nodo vecchio, ormai staccato dal documento, e non
  // scatterebbe mai piu' - un guasto silenzioso, perche' la pagina resta
  // perfettamente funzionante ma smette di caricare da sola.
  const [nodo, setNodo] = useState<HTMLDivElement | null>(null);

  // La callback vive in un ref: cambia a ogni render del chiamante, e senza
  // questo l'osservatore verrebbe smontato e rimontato di continuo.
  const callback = useRef(quandoVisibile);
  callback.current = quandoVisibile;

  const riferimento = useCallback((elemento: HTMLDivElement | null) => {
    setNodo(elemento);
  }, []);

  useEffect(() => {
    if (!attiva || !nodo) return;
    if (typeof IntersectionObserver === "undefined") return;

    const osservatore = new IntersectionObserver(
      (voci) => {
        if (voci.some((voce) => voce.isIntersecting)) callback.current();
      },
      { rootMargin: `0px 0px ${ANTICIPO} 0px` },
    );

    osservatore.observe(nodo);
    return () => osservatore.disconnect();
  }, [attiva, nodo]);

  return riferimento;
}
