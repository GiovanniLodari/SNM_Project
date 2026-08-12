/**
 * Formattazione di numeri, percentuali e date.
 *
 * Prima ogni componente chiamava `toLocaleString` per conto proprio, 75 volte,
 * e 28 di quelle chiamate erano senza locale: usavano quindi quello del
 * browser, per cui su una macchina inglese la stessa pagina poteva mostrare
 * "1.234" accanto a "1,234". Qui il locale si decide una volta.
 *
 * Le funzioni accettano null e undefined perche' l'API restituisce
 * legittimamente null quando una misura non e' calcolabile: il ripiego e'
 * "n/d", che dichiara l'assenza invece di mascherarla con uno zero.
 */

const LOCALE = "it-IT";

/** Ripiego mostrato quando il valore non e' disponibile. */
export const NON_DISPONIBILE = "n/d";

export function formatNumber(
  valore: number | null | undefined,
  opzioni?: Intl.NumberFormatOptions,
): string {
  if (valore === null || valore === undefined || Number.isNaN(valore)) {
    return NON_DISPONIBILE;
  }
  return valore.toLocaleString(LOCALE, opzioni);
}

/** Numero con un tetto ai decimali, per medie e tempi. */
export function formatDecimal(
  valore: number | null | undefined,
  decimali = 1,
): string {
  return formatNumber(valore, { maximumFractionDigits: decimali });
}

/**
 * Percentuale gia' espressa sulla scala 0-100 (com'e' nell'API), non 0-1:
 * `formatPercent(25.4)` restituisce "25,4%".
 */
export function formatPercent(
  valore: number | null | undefined,
  decimali = 1,
): string {
  if (valore === null || valore === undefined || Number.isNaN(valore)) {
    return NON_DISPONIBILE;
  }
  return `${formatNumber(valore, { maximumFractionDigits: decimali })}%`;
}

/** Data ISO in forma breve; stringhe non valide danno il ripiego. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return NON_DISPONIBILE;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? NON_DISPONIBILE : d.toLocaleDateString(LOCALE);
}

/** Data e ora, per i timestamp dei post. Su input non valido rende la stringa
 * originale: e' piu' utile del ripiego quando il dato grezzo dice qualcosa. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(LOCALE);
}
