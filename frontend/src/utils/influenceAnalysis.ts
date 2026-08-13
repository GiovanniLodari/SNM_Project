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
 * Valore sostitutivo per i tempi non misurabili sull'asse logaritmico.
 *
 * `degree` ha `time_s = 0.0` e lo zero su scala logaritmica non esiste. Il
 * sostituto non va mai presentato come una misura: chi lo usa deve accompagnarlo
 * con l'etichetta "< 0,1 s" (vedi `tempoPerScalaLog`).
 */
export const PAVIMENTO_TEMPO_LOG = 0.05;

export interface RigaCostoBeneficio {
  nome: string;
  spreadMc: number;
  /** Spread rispetto al migliore, fra 0 e 1. */
  quotaDelMigliore: number;
  /** Tempo misurato, cosi' com'e' nei dati. */
  tempoS: number;
  /** Tempo utilizzabile su asse logaritmico. */
  tempoPerGrafico: number;
  /** Vero quando il tempo era zero o sotto il pavimento. */
  tempoNonMisurato: boolean;
}

export function tempoPerScalaLog(tempoS: number): { valore: number; nonMisurato: boolean } {
  if (tempoS < PAVIMENTO_TEMPO_LOG) {
    return { valore: PAVIMENTO_TEMPO_LOG, nonMisurato: true };
  }
  return { valore: tempoS, nonMisurato: false };
}

export function rapportoCostoBeneficio(
  algoritmi: Record<string, InfluenceAlgorithmInfo>,
): RigaCostoBeneficio[] {
  const voci = Object.entries(algoritmi);
  if (voci.length === 0) return [];

  const migliore = Math.max(...voci.map(([, a]) => a.mc_spread));

  return voci
    .map(([nome, a]) => {
      const { valore, nonMisurato } = tempoPerScalaLog(a.time_s);
      return {
        nome,
        spreadMc: a.mc_spread,
        quotaDelMigliore: migliore > 0 ? a.mc_spread / migliore : 0,
        tempoS: a.time_s,
        tempoPerGrafico: valore,
        tempoNonMisurato: nonMisurato,
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
