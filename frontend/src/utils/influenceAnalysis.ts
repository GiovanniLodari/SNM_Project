import type {
  InfluenceAlgorithmInfo,
  InfluenceDemographics,
  InfluenceStepStat,
} from "../api/client.ts";

/**
 * Calcoli derivati della sezione Influence Maximization.
 *
 * Ogni affermazione che la pagina fa a parole ("costa 961 volte di piu'",
 * "sottostima del 35%", "il 43% nello step 1") e' uno di questi calcoli. Stanno
 * qui, e non dentro il JSX, perche' un numero sbagliato dentro una frase e' una
 * bugia che nessuno nota: qui invece ogni frase ha un test che la sorveglia.
 */

/**
 * Valore sostitutivo per i tempi non rappresentabili sull'asse logaritmico
 * (zero, sotto il pavimento, o assenti dai dati). Lo zero su scala
 * logaritmica non esiste, quindi serve comunque un punto dove disegnare
 * questi casi; il sostituto pero' non va mai presentato come una misura: chi
 * lo usa deve accompagnarlo con l'etichetta corretta per lo `statoTempo`
 * della riga (vedi `tempoPerScalaLog`).
 */
export const PAVIMENTO_TEMPO_LOG = 0.05;

/**
 * Stato del tempo di un algoritmo ai fini della rappresentazione:
 * - "misurato": il valore in `tempoS` e' una misura affidabile, usabile cosi' com'e';
 * - "sotto_pavimento": il tempo e' stato misurato (non e' assente) ma e' troppo
 *   piccolo per la scala logaritmica — puo' anche essere 0,0 s, come `degree`,
 *   o un futuro tempo piccolo ma diverso da zero (es. 0,03 s): in entrambi i
 *   casi il valore reale resta quello di `tempoS`, non "0,00 s" scritto a mano;
 * - "assente": il backend non ha registrato alcun tempo per questa run
 *   (`time_s` e' null/undefined/NaN nella sorgente). Non e' un tempo vicino
 *   allo zero: e' un dato mancante, e va dichiarato come tale.
 */
export type StatoTempo = "misurato" | "sotto_pavimento" | "assente";

export interface RigaCostoBeneficio {
  nome: string;
  spreadMc: number;
  /** Spread rispetto al migliore, fra 0 e 1. */
  quotaDelMigliore: number;
  /** Tempo misurato, cosi' com'e' nei dati. null quando il dato manca dalla sorgente. */
  tempoS: number | null;
  /** Tempo utilizzabile su asse logaritmico. */
  tempoPerGrafico: number;
  /** Vedi `StatoTempo`: distingue un tempo misurato da uno sotto il pavimento e da uno assente. */
  statoTempo: StatoTempo;
}

export function tempoPerScalaLog(
  tempoS: number | null | undefined,
): { valore: number; stato: StatoTempo } {
  if (tempoS === null || tempoS === undefined || Number.isNaN(tempoS)) {
    return { valore: PAVIMENTO_TEMPO_LOG, stato: "assente" };
  }
  if (tempoS < PAVIMENTO_TEMPO_LOG) {
    return { valore: PAVIMENTO_TEMPO_LOG, stato: "sotto_pavimento" };
  }
  return { valore: tempoS, stato: "misurato" };
}

export function rapportoCostoBeneficio(
  algoritmi: Record<string, InfluenceAlgorithmInfo>,
): RigaCostoBeneficio[] {
  const voci = Object.entries(algoritmi);
  if (voci.length === 0) return [];

  const migliore = Math.max(...voci.map(([, a]) => a.mc_spread));

  return voci
    .map(([nome, a]) => {
      const { valore, stato } = tempoPerScalaLog(a.time_s);
      return {
        nome,
        spreadMc: a.mc_spread,
        quotaDelMigliore: migliore > 0 ? a.mc_spread / migliore : 0,
        tempoS: a.time_s,
        tempoPerGrafico: valore,
        statoTempo: stato,
      };
    })
    .sort((x, y) => y.spreadMc - x.spreadMc);
}

/**
 * Scarto relativo fra la stima interna dell'algoritmo e lo spread misurato in
 * Monte Carlo. Negativo = sottostima, positivo = sovrastima. `null` per le
 * baseline (degree, pagerank), che non producono alcuna stima.
 */
export function scartoStimatore(a: InfluenceAlgorithmInfo): number | null {
  if (a.est_spread === null || a.mc_spread === 0) return null;
  return (a.est_spread - a.mc_spread) / a.mc_spread;
}

/**
 * Gruppi di algoritmi che hanno scelto lo stesso identico insieme di seed
 * (Jaccard esattamente 1). Le chiavi in ingresso hanno forma "A|B".
 *
 * E' l'osservazione centrale dell'Atto II, e va calcolata invece che scritta a
 * mano: se una run futura desse gruppi diversi, la pagina deve dirlo da sola.
 */
export function gruppiSeedIdentici(jaccard: Record<string, number>): string[][] {
  const vicini = new Map<string, Set<string>>();

  for (const [chiave, valore] of Object.entries(jaccard)) {
    if (valore !== 1) continue;
    const [a, b] = chiave.split("|");
    if (!a || !b) continue;
    if (!vicini.has(a)) vicini.set(a, new Set());
    if (!vicini.has(b)) vicini.set(b, new Set());
    vicini.get(a)!.add(b);
    vicini.get(b)!.add(a);
  }

  const visitati = new Set<string>();
  const gruppi: string[][] = [];

  for (const partenza of Array.from(vicini.keys()).sort()) {
    if (visitati.has(partenza)) continue;

    const gruppo: string[] = [];
    const coda = [partenza];
    visitati.add(partenza);

    while (coda.length > 0) {
      const corrente = coda.shift()!;
      gruppo.push(corrente);
      for (const vicino of vicini.get(corrente) ?? []) {
        if (!visitati.has(vicino)) {
          visitati.add(vicino);
          coda.push(vicino);
        }
      }
    }

    if (gruppo.length > 1) gruppi.push(gruppo.sort());
  }

  return gruppi;
}

export function concentrazioneCascata(
  step: InfluenceStepStat[],
  totaleRaggiunti: number,
): { quotaPrimoStep: number; quotaEntroTerzoStep: number } {
  if (totaleRaggiunti <= 0) return { quotaPrimoStep: 0, quotaEntroTerzoStep: 0 };

  const primo = step.find((s) => s.step === 1);
  const terzo = step.find((s) => s.step === 3);

  return {
    quotaPrimoStep: primo ? primo.new_nodes / totaleRaggiunti : 0,
    quotaEntroTerzoStep: terzo ? terzo.cumulative_nodes / totaleRaggiunti : 0,
  };
}

export function composizioneRaggiunti(
  d: InfluenceDemographics,
): { quotaUmani: number; quotaIa: number } {
  if (d.activated_total <= 0) return { quotaUmani: 0, quotaIa: 0 };
  return {
    quotaUmani: d.activated_human / d.activated_total,
    quotaIa: d.activated_ai / d.activated_total,
  };
}
