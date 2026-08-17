import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import TabellaBenchmark from "./TabellaBenchmark.tsx";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";
import { NON_DISPONIBILE } from "../../../utils/format.ts";

const ALGORITMI: Record<string, InfluenceAlgorithmInfo> = {
  PMIA: { n_seeds: 822, est_spread: 1675.83, mc_spread: 2566.732, time_s: 4.4, seeds_sample: [] },
  "CELF++": { n_seeds: 822, est_spread: 2558.89, mc_spread: 2571.534, time_s: 4228.67, seeds_sample: [] },
  SKIM: { n_seeds: 405, est_spread: 2542.5, mc_spread: 1996.864, time_s: 0.81, seeds_sample: [] },
  degree: { n_seeds: 822, est_spread: null, mc_spread: 2563.206, time_s: 0.0, seeds_sample: [] },
  pagerank: { n_seeds: 822, est_spread: null, mc_spread: 2555.408, time_s: 0.11, seeds_sample: [] },
};

describe("TabellaBenchmark", () => {
  it("mostra il tempo reale di un algoritmo sotto il pavimento, non un segnaposto", () => {
    render(<TabellaBenchmark algoritmi={ALGORITMI} kRichiesto={1000} />);
    // degree ha time_s = 0.0: e' una misura reale, non un dato mancante.
    expect(screen.getByText("0 s")).toBeInTheDocument();
  });

  it("dichiara n/d quando il tempo non e' registrato nei dati, senza inventare un valore", () => {
    const algoritmiConTempoAssente: Record<string, InfluenceAlgorithmInfo> = {
      ...ALGORITMI,
      SKIM: { ...ALGORITMI.SKIM, time_s: null },
    };
    render(<TabellaBenchmark algoritmi={algoritmiConTempoAssente} kRichiesto={1000} />);
    // Scoperto sulla riga di SKIM: degree e pagerank hanno gia' un legittimo
    // "n/d" nella colonna spread stimato (non producono alcuna stima), quindi
    // una query globale su NON_DISPONIBILE troverebbe piu' di un elemento.
    const rigaSkim = screen.getByText("SKIM").closest("tr");
    expect(rigaSkim).not.toBeNull();
    expect(within(rigaSkim as HTMLElement).getByText(NON_DISPONIBILE)).toBeInTheDocument();
  });
});
