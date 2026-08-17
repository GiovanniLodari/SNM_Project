import { useCallback, useState } from "react";
import { api, type AccountDetail } from "../api/client.ts";

interface StatoDettaglio {
  aperto: boolean;
  account: AccountDetail | null;
  caricamento: boolean;
  errore: string | null;
}

const CHIUSO: StatoDettaglio = {
  aperto: false,
  account: null,
  caricamento: false,
  errore: null,
};

/**
 * Apertura del modale con il profilo di un account, a partire dal solo id.
 *
 * Le classifiche del progetto - i seed della propagazione, i maggiori
 * produttori di testo sintetico - portano un id e poco altro, e ogni pagina che
 * voleva mostrarne il profilo si riscriveva quattro `useState` piu' la catena
 * `then/catch/finally`. Erano una trentina di righe identiche, tranne nel punto
 * che conta: la gestione dell'errore, che in una delle copie mancava e faceva
 * aprire e svanire il modale in silenzio.
 *
 * Lo stato e' un oggetto solo e non quattro variabili: apertura, dati, attesa
 * ed errore cambiano sempre insieme, e tenerli separati permetteva stati
 * impossibili come "in caricamento con un errore gia' a schermo".
 */
export function useDettaglioAccount() {
  const [stato, setStato] = useState<StatoDettaglio>(CHIUSO);

  const apri = useCallback((id: number | string) => {
    const identificativo = typeof id === "number" ? id : parseInt(id, 10);
    if (Number.isNaN(identificativo)) return;

    setStato({ aperto: true, account: null, caricamento: true, errore: null });

    api
      .accountDetail(identificativo)
      .then((risposta) => {
        setStato({
          aperto: true,
          account: risposta.account,
          caricamento: false,
          errore: risposta.account
            ? null
            : `Nessun dettaglio in archivio per l'account #${identificativo}.`,
        });
      })
      .catch((errore: unknown) => {
        setStato({
          aperto: true,
          account: null,
          caricamento: false,
          errore:
            errore instanceof Error
              ? `Impossibile caricare i dettagli dell'account: ${errore.message}`
              : "Impossibile caricare i dettagli dell'account.",
        });
      });
  }, []);

  const chiudi = useCallback(() => setStato(CHIUSO), []);

  return { ...stato, apri, chiudi };
}
