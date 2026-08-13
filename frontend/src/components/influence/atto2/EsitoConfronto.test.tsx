import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EsitoConfronto from "./EsitoConfronto.tsx";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";

const ALGORITMI: Record<string, InfluenceAlgorithmInfo> = {
  PMIA: { n_seeds: 822, est_spread: 1675.83, mc_spread: 2566.732, time_s: 4.4, seeds_sample: [] },
  "CELF++": { n_seeds: 822, est_spread: 2558.89, mc_spread: 2571.534, time_s: 4228.67, seeds_sample: [] },
  SKIM: { n_seeds: 405, est_spread: 2542.5, mc_spread: 1996.864, time_s: 0.81, seeds_sample: [] },
  degree: { n_seeds: 822, est_spread: null, mc_spread: 2563.206, time_s: 0.0, seeds_sample: [] },
  pagerank: { n_seeds: 822, est_spread: null, mc_spread: 2555.408, time_s: 0.11, seeds_sample: [] },
};

describe("EsitoConfronto", () => {
  it("nomina il vincitore e subito quanto poco vince", () => {
    // Il difetto originale: un badge "vincitore CELF++" tecnicamente vero ma
    // fuorviante, perche' il margine e' dello 0,3% a fronte di 961 volte il tempo.
    render(<EsitoConfronto algoritmi={ALGORITMI} vincitore="CELF++" />);
    expect(screen.getByText(/CELF\+\+/)).toBeInTheDocument();
    expect(screen.getByText(/0,3\s*%/)).toBeInTheDocument();
  });

  it("dichiara il costo in tempo del vincitore", () => {
    render(<EsitoConfronto algoritmi={ALGORITMI} vincitore="CELF++" />);
    expect(screen.getByText(/961/)).toBeInTheDocument();
  });

  it("indica l'algoritmo scelto per la simulazione finale", () => {
    render(<EsitoConfronto algoritmi={ALGORITMI} vincitore="CELF++" />);
    expect(screen.getByTestId("algoritmo-scelto")).toHaveTextContent("PMIA");
  });
});
