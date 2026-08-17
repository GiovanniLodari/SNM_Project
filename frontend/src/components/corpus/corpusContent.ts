/**
 * Testi e opzioni del capitolo sul corpus.
 *
 * Come per detectionContent.ts: la copia di una pagina che deve reggere la
 * lettura di un valutatore va riletta come un testo, non cercata dentro gli
 * attributi `sx`. Le opzioni dei filtri stanno qui accanto perche' etichetta e
 * valore inviato al backend devono restare la stessa cosa in un punto solo.
 */

import type { Atto } from "../narrativa/tipi.ts";

export const ATTI_CORPUS: readonly Atto[] = [
  {
    id: "composizione",
    numero: "I",
    titolo: "Di cosa e' fatto",
    domanda: "Che materiale e' stato raccolto, e da dove viene?",
  },
  {
    id: "archivio",
    numero: "II",
    titolo: "L'archivio",
    domanda: "Che cosa dicono, uno per uno, i post che il crawler ha trovato?",
  },
  {
    id: "prima-del-giudizio",
    numero: "III",
    titolo: "Prima del giudizio",
    domanda: "Quanta parte di questo corpus e' arrivata sotto gli occhi dei rilevatori?",
  },
];

/** Ordinamenti dell'archivio. I valori sono quelli accettati da /api/posts. */
export const ORDINAMENTI = [
  { valore: "archivio", etichetta: "Ordine di archivio" },
  { valore: "recenti", etichetta: "Piu' recenti" },
  { valore: "vecchi", etichetta: "Piu' vecchi" },
] as const;

/**
 * Filtro sull'autore. "Bot" e' la dichiarazione del profilo all'istanza, non il
 * giudizio di un rilevatore: sono due cose diverse e il capitolo successivo
 * vive proprio sulla loro distanza.
 */
export const AUTORI = [
  { valore: "tutti", etichetta: "Tutti" },
  { valore: "bot", etichetta: "Solo bot" },
  { valore: "umani", etichetta: "Solo umani" },
] as const;

/**
 * Nomi delle lingue piu' frequenti nel Fediverso. I codici che non compaiono
 * qui restano tali e quali: meglio un codice ISO onesto di una traduzione
 * inventata.
 */
const NOMI_LINGUA: Record<string, string> = {
  en: "Inglese",
  it: "Italiano",
  de: "Tedesco",
  fr: "Francese",
  es: "Spagnolo",
  pt: "Portoghese",
  nl: "Olandese",
  ja: "Giapponese",
  ru: "Russo",
  pl: "Polacco",
  sv: "Svedese",
  fi: "Finlandese",
  no: "Norvegese",
  da: "Danese",
  cs: "Ceco",
  tr: "Turco",
  zh: "Cinese",
  ko: "Coreano",
  ca: "Catalano",
  eu: "Basco",
  uk: "Ucraino",
  el: "Greco",
  hu: "Ungherese",
  ro: "Rumeno",
  ar: "Arabo",
};

export function nomeLingua(codice: string): string {
  // Mastodon usa anche varianti regionali ("pt-BR"): la radice basta a dare un
  // nome, e la variante resta visibile nel codice accanto.
  return NOMI_LINGUA[codice.toLowerCase().split("-")[0]] ?? codice.toUpperCase();
}
