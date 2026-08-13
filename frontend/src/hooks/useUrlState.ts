import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Stato di navigazione tenuto nella query string invece che in `useState`.
 *
 * Ricerca, filtri e pagina descrivono *quale vista* si sta guardando: se
 * vivono solo nella memoria del componente, quella vista non e' raggiungibile
 * se non ripetendo i clic a mano. Per un progetto di ricerca conta: mandare a
 * un collega il link ai post che contengono un certo termine, o tornare fra
 * una settimana sulla stessa selezione, diventa possibile. In piu' il tasto
 * Indietro del browser inizia a comportarsi come ci si aspetta.
 *
 * Le scritture usano `replace: true`: digitare in un campo di ricerca non deve
 * riempire la cronologia di una voce per carattere.
 */

/** Rimuove il parametro quando vale il default: la URL resta leggibile. */
function scriviParametro(
  params: URLSearchParams,
  chiave: string,
  valore: string | string[],
  predefinito: string | string[],
): void {
  const vuoto =
    Array.isArray(valore)
      ? valore.length === 0
      : valore === "" || valore === String(predefinito);

  if (vuoto) {
    params.delete(chiave);
    return;
  }
  params.delete(chiave);
  if (Array.isArray(valore)) {
    for (const v of valore) params.append(chiave, v);
  } else {
    params.set(chiave, valore);
  }
}

/** Opzioni comuni ai setter di questo modulo. */
export interface OpzioniScrittura {
  /**
   * Altri parametri da riportare al default (rimuovere) nella STESSA
   * navigazione di questa scrittura. Serve per il caso ricorrente "cambia un
   * filtro o la ricerca e torna a pagina 1".
   *
   * Farlo con un secondo setter separato non funziona: react-router calcola
   * ogni scrittura dallo stesso snapshot corrente della URL (`location.search`
   * non cambia fino al render successivo), quindi due chiamate sincrone a
   * `setSearchParams` si sovrascrivono e sopravvive solo l'ultima. Il caso
   * tipico `setFiltro(x); setPage(1)` perdeva il filtro e lasciava solo il
   * reset di pagina — cioe' niente — e il controllo sembrava morto. Fondendo le
   * due modifiche in un'unica navigazione entrambe restano.
   */
  azzera?: string[];
}

/** Rimuove i parametri elencati in `azzera`, riportandoli al loro default. */
function azzeraParametri(params: URLSearchParams, opzioni?: OpzioniScrittura): void {
  for (const chiave of opzioni?.azzera ?? []) params.delete(chiave);
}

export function useUrlString(
  chiave: string,
  predefinito = "",
): [string, (valore: string, opzioni?: OpzioniScrittura) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const valore = searchParams.get(chiave) ?? predefinito;

  const imposta = useCallback(
    (nuovo: string, opzioni?: OpzioniScrittura) => {
      setSearchParams(
        (precedenti) => {
          const successivi = new URLSearchParams(precedenti);
          scriviParametro(successivi, chiave, nuovo, predefinito);
          azzeraParametri(successivi, opzioni);
          return successivi;
        },
        { replace: true },
      );
    },
    [chiave, predefinito, setSearchParams],
  );

  return [valore, imposta];
}

/** Aggiornamento diretto o calcolato dal valore corrente, come in useState. */
type Aggiornamento<T> = T | ((precedente: T) => T);

export function useUrlNumber(
  chiave: string,
  predefinito: number,
): [number, (valore: Aggiornamento<number>, opzioni?: OpzioniScrittura) => void] {
  const [grezzo, impostaGrezzo] = useUrlString(chiave, String(predefinito));
  // Una URL scritta a mano puo' contenere qualunque cosa: un valore non
  // numerico ricade sul predefinito invece di propagare NaN nei calcoli.
  const numero = Number(grezzo);
  const valore = Number.isFinite(numero) ? numero : predefinito;

  // Accetta anche la forma con funzione, `setPage(p => p + 1)`: e' il
  // contratto di useState, e i chiamanti la usano gia'.
  const imposta = useCallback(
    (nuovo: Aggiornamento<number>, opzioni?: OpzioniScrittura) => {
      const risolto = typeof nuovo === "function" ? nuovo(valore) : nuovo;
      impostaGrezzo(String(risolto), opzioni);
    },
    [impostaGrezzo, valore],
  );

  return [valore, imposta];
}

export function useUrlList(
  chiave: string,
): [string[], (valore: string[], opzioni?: OpzioniScrittura) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  // useMemo perche' getAll() crea un array nuovo a ogni render: senza, ogni
  // hook che lo riceve come dipendenza si rilancerebbe di continuo.
  const valore = useMemo(() => searchParams.getAll(chiave), [searchParams, chiave]);

  const imposta = useCallback(
    (nuovo: string[], opzioni?: OpzioniScrittura) => {
      setSearchParams(
        (precedenti) => {
          const successivi = new URLSearchParams(precedenti);
          scriviParametro(successivi, chiave, nuovo, []);
          azzeraParametri(successivi, opzioni);
          return successivi;
        },
        { replace: true },
      );
    },
    [chiave, setSearchParams],
  );

  return [valore, imposta];
}
