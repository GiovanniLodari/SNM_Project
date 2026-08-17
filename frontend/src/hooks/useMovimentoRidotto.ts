import { useEffect, useState } from "react";

/** La media query che il sistema operativo espone come "riduci le animazioni". */
const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Dice se chi guarda ha chiesto al sistema di ridurre le animazioni.
 *
 * Sostituisce `useReducedMotion` di framer-motion. La libreria serviva a questo
 * in due componenti su tre; nel terzo (`HomeHero`) animava una dissolvenza in
 * entrata, ora scritta in CSS. Restava quindi il motore completo di framer -
 * proiezione, layout animation, gestione dello scroll - nel chunk della
 * Panoramica, cioe' sulla rotta d'ingresso, per una preferenza booleana e una
 * transizione di 0,4 secondi.
 *
 * A differenza dell'originale la preferenza qui e' **reattiva**: framer legge
 * la media query una volta sola e ne conserva il risultato in un valore
 * condiviso a livello di modulo, quindi chi cambiava l'impostazione di sistema
 * a pagina aperta continuava a vedere le animazioni fino al ricaricamento.
 * Ascoltando `change` la pagina si adegua subito - ed e' anche cio' che
 * rendeva scomodi i test, che dovevano mockare l'hook per non farsi fissare la
 * preferenza dal primo caso eseguito.
 *
 * Fuori dal browser (jsdom senza `matchMedia`, render lato server) risponde
 * `false`: il valore prudente e' "anima", perche' e' il comportamento
 * predefinito atteso, e le animazioni interessate hanno comunque tutte una
 * versione senza moto.
 */
export function useMovimentoRidotto(): boolean {
  const [riduci, setRiduci] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const lista = window.matchMedia(QUERY);
    const aggiorna = (evento: MediaQueryListEvent) => setRiduci(evento.matches);

    // Allinea lo stato al valore corrente: fra il primo render e questo effetto
    // la preferenza puo' essere cambiata, e in quel caso nessun evento
    // `change` arriverebbe piu' a raccontarlo.
    setRiduci(lista.matches);
    lista.addEventListener("change", aggiorna);
    return () => lista.removeEventListener("change", aggiorna);
  }, []);

  return riduci;
}

export default useMovimentoRidotto;
