import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { capitoloDaRotta } from "../navigazione.ts";

/** Nome dell'applicazione in coda al titolo del documento. */
const NOME_APP = "SNM.Intelligence";

/**
 * Quello che un cambio di rotta deve fare oltre a sostituire il contenuto:
 * aggiornare il titolo del documento e riportare il focus all'inizio.
 *
 * In un'applicazione a pagina singola il browser non fa nessuna delle due cose.
 * Il titolo restava "SNM Project" su tutte e dodici le pagine, quindi la
 * cronologia e le schede aperte erano indistinguibili fra loro e chi usa uno
 * screen reader non riceveva alcun segnale che la pagina fosse cambiata. Il
 * focus restava sulla voce di navigazione appena premuta, quindi il tasto Tab
 * ripartiva da dentro la sidebar invece che dal contenuto nuovo.
 *
 * `primoRender` esiste perche' al primo montaggio non c'e' stato alcun cambio di
 * rotta: spostare il focus allora lo strapperebbe a chi non ha ancora fatto
 * niente, e su un caricamento diretto e' anche il momento in cui il browser sta
 * ancora ripristinando la propria posizione di scorrimento.
 *
 * Restituisce il ref da mettere sull'elemento che deve ricevere il focus -
 * `<main>`, con `tabIndex={-1}`, perche' e' l'inizio del contenuto e non un
 * comando.
 */
export function useCambioRotta() {
  const location = useLocation();
  const contenuto = useRef<HTMLElement>(null);
  const primoRender = useRef(true);

  useEffect(() => {
    const capitolo = capitoloDaRotta(location.pathname);
    document.title = capitolo
      ? `${capitolo.etichetta} — ${NOME_APP}`
      : NOME_APP;

    if (primoRender.current) {
      primoRender.current = false;
      return;
    }

    contenuto.current?.focus();
  }, [location.pathname]);

  return contenuto;
}

export default useCambioRotta;
