import { describe, expect, it } from "vitest";
import {
  PAVIMENTO_TEMPO_LOG,
  composizioneRaggiunti,
  concentrazioneCascata,
  gruppiSeedIdentici,
  rapportoCostoBeneficio,
  scartoStimatore,
  tempoPerScalaLog,
} from "./influenceAnalysis.ts";
import type { InfluenceAlgorithmInfo, InfluenceStepStat } from "../api/client.ts";

/** Dati veri della run registrata in Max_Influence/confronto_algoritmi.json. */
const ALGORITMI: Record<string, InfluenceAlgorithmInfo> = {
  PMIA: { n_seeds: 822, est_spread: 1675.83, mc_spread: 2566.732, time_s: 4.4, seeds_sample: [] },
  "CELF++": { n_seeds: 822, est_spread: 2558.89, mc_spread: 2571.534, time_s: 4228.67, seeds_sample: [] },
  SKIM: { n_seeds: 405, est_spread: 2542.5, mc_spread: 1996.864, time_s: 0.81, seeds_sample: [] },
  degree: { n_seeds: 822, est_spread: null, mc_spread: 2563.206, time_s: 0.0, seeds_sample: [] },
  pagerank: { n_seeds: 822, est_spread: null, mc_spread: 2555.408, time_s: 0.11, seeds_sample: [] },
};

const JACCARD: Record<string, number> = {
  "PMIA|CELF++": 1.0,
  "PMIA|SKIM": 0.4927,
  "PMIA|degree": 1.0,
  "PMIA|pagerank": 1.0,
  "CELF++|SKIM": 0.4927,
  "CELF++|degree": 1.0,
  "CELF++|pagerank": 1.0,
  "SKIM|degree": 0.4927,
  "SKIM|pagerank": 0.4927,
  "degree|pagerank": 1.0,
};

const STEP: InfluenceStepStat[] = [
  { step: 0, new_nodes: 1000, new_ai: 1000, new_human: 0, cumulative_nodes: 1000, cumulative_pct: 0.313, fired_edges: 0 },
  { step: 1, new_nodes: 34595, new_ai: 279, new_human: 34316, cumulative_nodes: 35595, cumulative_pct: 11.155, fired_edges: 34595 },
  { step: 2, new_nodes: 11842, new_ai: 106, new_human: 11736, cumulative_nodes: 47437, cumulative_pct: 14.866, fired_edges: 11842 },
  { step: 3, new_nodes: 12193, new_ai: 54, new_human: 12139, cumulative_nodes: 59630, cumulative_pct: 18.687, fired_edges: 12193 },
];

describe("rapportoCostoBeneficio", () => {
  it("misura ogni algoritmo contro il migliore per spread", () => {
    const righe = rapportoCostoBeneficio(ALGORITMI);
    const perNome = Object.fromEntries(righe.map((r) => [r.nome, r]));

    // CELF++ e' il migliore: quota 1. degree lo insegue allo 0,32%.
    expect(perNome["CELF++"].quotaDelMigliore).toBeCloseTo(1, 5);
    expect(perNome.degree.quotaDelMigliore).toBeCloseTo(0.99676, 4);
    // L'affermazione della pagina: PMIA rende il 99,8% di CELF++.
    expect(perNome.PMIA.quotaDelMigliore).toBeCloseTo(0.99813, 4);
  });

  it("misura il costo in tempo rispetto al piu' veloce misurabile", () => {
    const righe = rapportoCostoBeneficio(ALGORITMI);
    const perNome = Object.fromEntries(righe.map((r) => [r.nome, r]));

    // L'affermazione della pagina: CELF++ costa 961 volte PMIA.
    expect(perNome["CELF++"].tempoS / perNome.PMIA.tempoS).toBeCloseTo(961, 0);
  });

  it("ordina per spread decrescente", () => {
    const nomi = rapportoCostoBeneficio(ALGORITMI).map((r) => r.nome);
    expect(nomi).toEqual(["CELF++", "PMIA", "degree", "pagerank", "SKIM"]);
  });

  it("segnala l'algoritmo il cui tempo non e' misurabile", () => {
    const righe = rapportoCostoBeneficio(ALGORITMI);
    const perNome = Object.fromEntries(righe.map((r) => [r.nome, r]));

    expect(perNome.degree.tempoNonMisurato).toBe(true);
    expect(perNome.degree.tempoPerGrafico).toBe(PAVIMENTO_TEMPO_LOG);
    expect(perNome.PMIA.tempoNonMisurato).toBe(false);
    expect(perNome.PMIA.tempoPerGrafico).toBe(4.4);
  });
});

describe("tempoPerScalaLog", () => {
  it("porta lo zero al pavimento e lo dichiara non misurato", () => {
    // Su scala logaritmica lo zero non esiste: va sostituito, ma senza
    // spacciare il sostituto per una misura.
    expect(tempoPerScalaLog(0)).toEqual({ valore: PAVIMENTO_TEMPO_LOG, nonMisurato: true });
  });

  it("lascia intatti i tempi misurati", () => {
    expect(tempoPerScalaLog(0.11)).toEqual({ valore: 0.11, nonMisurato: false });
    expect(tempoPerScalaLog(4228.67)).toEqual({ valore: 4228.67, nonMisurato: false });
  });

  it("tratta come non misurato anche cio' che sta sotto il pavimento", () => {
    expect(tempoPerScalaLog(0.01)).toEqual({ valore: PAVIMENTO_TEMPO_LOG, nonMisurato: true });
  });
});

describe("scartoStimatore", () => {
  it("quantifica quanto la stima interna sbaglia rispetto al Monte Carlo", () => {
    // Affermazioni della pagina: PMIA sottostima del 35%, SKIM sovrastima del 27%.
    expect(scartoStimatore(ALGORITMI.PMIA)).toBeCloseTo(-0.347, 3);
    expect(scartoStimatore(ALGORITMI.SKIM)).toBeCloseTo(0.273, 3);
    expect(scartoStimatore(ALGORITMI["CELF++"])).toBeCloseTo(-0.005, 3);
  });

  it("restituisce null per le baseline che non stimano nulla", () => {
    expect(scartoStimatore(ALGORITMI.degree)).toBeNull();
    expect(scartoStimatore(ALGORITMI.pagerank)).toBeNull();
  });
});

describe("gruppiSeedIdentici", () => {
  it("raggruppa gli algoritmi che scelgono lo stesso identico insieme", () => {
    // Il risultato che la pagina mette in prima pagina: quattro algoritmi su
    // cinque non scelgono insiemi simili, scelgono lo stesso insieme.
    expect(gruppiSeedIdentici(JACCARD)).toEqual([["CELF++", "PMIA", "degree", "pagerank"]]);
  });

  it("non raggruppa chi ha sovrapposizione parziale", () => {
    expect(gruppiSeedIdentici({ "A|B": 0.99, "A|C": 0.5, "B|C": 0.5 })).toEqual([]);
  });

  it("regge piu' gruppi distinti", () => {
    const gruppi = gruppiSeedIdentici({ "A|B": 1, "C|D": 1, "A|C": 0.2 });
    expect(gruppi).toEqual([["A", "B"], ["C", "D"]]);
  });
});

describe("concentrazioneCascata", () => {
  it("misura quanta cascata avviene nel primo step", () => {
    // Affermazione della pagina: il 43% degli attivati arriva allo step 1.
    expect(concentrazioneCascata(STEP, 80943).quotaPrimoStep).toBeCloseTo(0.427, 3);
  });

  it("misura quanta cascata e' conclusa entro un dato step", () => {
    // Affermazione della pagina: il 74% entro il terzo step.
    expect(concentrazioneCascata(STEP, 80943).quotaEntroTerzoStep).toBeCloseTo(0.737, 3);
  });

  it("non divide per zero su una cascata vuota", () => {
    expect(concentrazioneCascata([], 0)).toEqual({ quotaPrimoStep: 0, quotaEntroTerzoStep: 0 });
  });
});

describe("composizioneRaggiunti", () => {
  it("separa umani e account IA fra i nodi attivati", () => {
    // Affermazione della pagina: il 98,1% dei raggiunti e' umano.
    const c = composizioneRaggiunti({
      activated_total: 80943, activated_ai: 1523, activated_human: 79420,
      seeds_ai: 1000, seeds_human: 0,
    });
    expect(c.quotaUmani).toBeCloseTo(0.981, 3);
    expect(c.quotaIa).toBeCloseTo(0.019, 3);
  });

  it("non divide per zero quando non c'e' stata attivazione", () => {
    const c = composizioneRaggiunti({
      activated_total: 0, activated_ai: 0, activated_human: 0, seeds_ai: 0, seeds_human: 0,
    });
    expect(c).toEqual({ quotaUmani: 0, quotaIa: 0 });
  });
});
