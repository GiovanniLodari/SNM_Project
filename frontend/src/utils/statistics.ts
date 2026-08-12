/** Un bucket dell'istogramma restituito dall'API (`distribution_curve`). */
export interface HistogramBucket {
  count: number;
}

/**
 * Percentile ricavato per interpolazione lineare su un istogramma a bucket di
 * ampiezza uniforme, sulla scala 0-100.
 *
 * Sostituisce la formula `mediana ± deviazione * 0.674`, che assume una
 * distribuzione normale: le probabilita' dei detector IA sono fortemente
 * bimodali, si addensano cioe' agli estremi 0 e 1, quindi quella formula
 * produceva quartili scorretti che venivano poi mostrati in tabella come se
 * fossero misurati. Resta una stima, limitata dalla granularita' dei bucket,
 * ma deriva dai dati osservati.
 *
 * @param curva  bucket in ordine crescente; `count` e' la frequenza assoluta.
 * @param frazione  quantile desiderato in [0,1], es. 0.25 per il primo quartile.
 * @returns il valore sulla scala 0-100, oppure null se l'istogramma e' vuoto.
 */
export function percentileDaIstogramma(
  curva: HistogramBucket[] | undefined | null,
  frazione: number,
): number | null {
  if (!curva || curva.length === 0) return null;

  const totale = curva.reduce((acc, b) => acc + b.count, 0);
  if (totale === 0) return null;

  const obiettivo = totale * frazione;
  const ampiezza = 100 / curva.length;
  let cumulato = 0;

  for (let i = 0; i < curva.length; i++) {
    const conteggio = curva[i].count;
    if (cumulato + conteggio >= obiettivo && conteggio > 0) {
      const quotaNelBucket = (obiettivo - cumulato) / conteggio;
      return +(i * ampiezza + quotaNelBucket * ampiezza).toFixed(1);
    }
    cumulato += conteggio;
  }
  return 100;
}
