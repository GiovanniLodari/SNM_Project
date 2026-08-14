import type { BotDetectorId, Post } from "../../api/client.ts";
import type { Atto } from "../narrativa/tipi.ts";
import { tokens } from "../../theme.ts";

/**
 * Testi e registro dei modelli del capitolo sul testo sintetico.
 *
 * I quattro rilevatori erano descritti in tre posti diversi - la mappa
 * `DETECTOR_CONFIGS` della pagina per singolo detector, le schede
 * dell'indagine bot nella pagina di confronto e la prosa che il backend
 * restituisce in `models` - e le tre versioni non concordavano: lo stesso
 * modello si chiamava "Desklib Detector", "Desklib AI" e "DESKLIB
 * (FINE-TUNED)" in tre schermate della stessa applicazione. Qui il registro e'
 * uno, e le pagine ne leggono i campi.
 *
 * Le chiavi `id` sono quelle che il backend accetta nel parametro `detector`
 * di `/api/ai-detection`: cambiarle qui senza cambiarle li' fa ricadere
 * silenziosamente la richiesta su FastDetectGPT.
 */

export type IdModello = "fastdetect" | "binoculars" | "desklib" | "ada";

export interface Modello {
  id: IdModello;
  /**
   * Chiave con cui il backend nomina lo stesso modello in `bot_investigation`
   * e in `models`. Non coincide con `id`, che e' invece il valore accettato dal
   * parametro `detector`: sono due nomenclature diverse per gli stessi quattro
   * modelli, e tipizzarla con l'unione del client impedisce di inventarne una
   * terza.
   */
  idIndagine: BotDetectorId;
  /** Nome proprio, come va scritto ovunque. */
  nome: string;
  /** Modello di base, in mono sotto il nome. */
  famiglia: string;
  /** Zero-shot o supervisionato: e' la distinzione che spiega le divergenze. */
  tipo: "Zero-shot" | "Supervisionato";
  /** Come funziona, in una frase. */
  descrizione: string;
  /** Tinta di riconoscimento, usata con parsimonia: chip e cifre, non superfici. */
  accento: string;
}

export const MODELLI: readonly Modello[] = [
  {
    id: "fastdetect",
    idIndagine: "fastdetectgpt",
    nome: "FastDetectGPT",
    famiglia: "GPT-Neo 2.7B",
    tipo: "Zero-shot",
    descrizione:
      "Misura la curvatura della probabilita' attorno al testo: un passaggio generato " +
      "siede su un massimo locale piu' netto di quanto faccia la scrittura umana.",
    accento: tokens.color.actionBlue,
  },
  {
    id: "binoculars",
    idIndagine: "binoculars",
    nome: "Binoculars",
    famiglia: "Qwen2.5-0.5B / Instruct",
    tipo: "Zero-shot",
    descrizione:
      "Confronta la perplessita' calcolata da due modelli, un osservatore e un esecutore: " +
      "il rapporto fra le due separa il testo sorprendente da quello soltanto insolito.",
    accento: tokens.color.deepGreen,
  },
  {
    id: "desklib",
    idIndagine: "desklib",
    nome: "Desklib AI Detector",
    famiglia: "Modello locale v1.01",
    tipo: "Supervisionato",
    descrizione:
      "Classificatore addestrato su testo etichettato. Essendo l'unico dei quattro ad " +
      "aver visto degli esempi, e' anche l'unico che puo' aver imparato le abitudini del " +
      "proprio insieme di addestramento.",
    accento: tokens.color.coral,
  },
  {
    id: "ada",
    idIndagine: "ada",
    nome: "AdaDetectGPT",
    famiglia: "GPT-Neo 2.7B",
    tipo: "Zero-shot",
    descrizione:
      "Variante adattiva della perturba-curvatura: stima la funzione di confronto sui " +
      "dati invece di fissarla in anticipo.",
    accento: tokens.color.purple,
  },
];

/** Il modello mostrato all'apertura del capitolo, se la URL non ne indica uno. */
export const MODELLO_PREDEFINITO: IdModello = "fastdetect";

/**
 * La probabilita' che un rilevatore ha assegnato a un post, letta dalla riga
 * che `/api/posts` restituisce.
 *
 * Sta nel registro e non nelle pagine perche' e' la terza nomenclatura degli
 * stessi quattro modelli - dopo `id` e `idIndagine`, i nomi dei campi della
 * riga - e tenerla altrove significherebbe riscrivere a mano una catena di
 * `if` ogni volta che un elenco di post vuole mostrare i punteggi.
 *
 * `undefined` = la riga non porta il campo, `null` = il modello non ha valutato
 * quel post: entrambi vanno mostrati come assenza, mai come zero.
 */
export function probabilitaDelPost(post: Post, modello: Modello): number | null | undefined {
  const per_id: Record<IdModello, number | null | undefined> = {
    fastdetect: post.fastdetect_prob,
    binoculars: post.binoculars_prob,
    desklib: post.desklib_prob,
    ada: post.ada_prob,
  };
  return per_id[modello.id];
}

/**
 * Risolve la chiave di un modello, accettando anche le forme che il backend
 * tollera e che compaiono nei vecchi indirizzi (`ada_local`, `adadetect`).
 * Un valore sconosciuto ricade sul modello predefinito invece di lasciare la
 * pagina senza contenuto.
 */
export function risolviModello(chiave: string | null | undefined): Modello {
  const normalizzata = (chiave ?? "").toLowerCase();
  const alias: Record<string, IdModello> = {
    ada_local: "ada",
    adadetect: "ada",
    adadetectgpt: "ada",
    fastdetectgpt: "fastdetect",
  };
  const id = alias[normalizzata] ?? normalizzata;
  return MODELLI.find((modello) => modello.id === id) ?? MODELLI[0];
}

export const ATTI_DETECTION: readonly Atto[] = [
  {
    id: "rilevatori",
    numero: "I",
    titolo: "I quattro rilevatori",
    domanda: "Con quali metodi si riconosce un testo scritto da una macchina?",
  },
  {
    id: "singolo-modello",
    numero: "II",
    titolo: "Il singolo modello",
    domanda: "Che cosa vede un rilevatore, preso da solo, sul corpus completo?",
  },
  {
    id: "confronto",
    numero: "III",
    titolo: "Dove non concordano",
    domanda: "Quando quattro giudici indipendenti si contraddicono, chi ha ragione?",
  },
];

/** Perche' i quattro metodi possono divergere: si legge in apertura dell'Atto I. */
export const PREMESSA_ATTO_I =
  "Nessuno dei quattro rilevatori dispone di una verita' di riferimento su questo corpus: " +
  "non esistono post etichettati a mano con cui misurarne l'accuratezza. Quello che segue " +
  "non e' quindi una classifica di bravura, ma una descrizione di cosa ciascun metodo " +
  "misura e di quanto spesso le loro risposte coincidano.";

/** Chiusura dell'Atto III: e' la lettura onesta dei numeri del consenso. */
export const ESITO_ATTO_III =
  "Un account automatizzato non equivale a testo generato da un modello: buona parte dei " +
  "bot del Fediverso ripubblica articoli di giornale e bollettini scritti da persone. E' " +
  "questa la ragione per cui il modello supervisionato marca come IA molti piu' post bot " +
  "degli altri tre: riconosce la rigidita' del formato, non l'origine del testo.";
