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
    // fuorviante, perche' costa 961 volte il tempo di PMIA per un margine
    // reale, sul secondo classificato (PMIA), dello 0,2%. Lo 0,3% verificato
    // qui sotto e' un fatto distinto: e' il margine di CELF++ su un ordinamento
    // per grado (`degree`), non sul secondo classificato — vedi il commento
    // di testa di EsitoConfronto.tsx per il calcolo completo.
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

  it("non calcola un margine sul secondo quando il vincitore dichiarato non e' il primo per spread reale", () => {
    // Il backend ha un default scritto a mano ("CELF++") per winner_by_mc_spread
    // quando il dato manca: se quel nome non e' davvero il primo per spread
    // (qui il primo e' CELF++, non degree), "secondo classificato" punterebbe a
    // chi in realta' vince, e il margine risulterebbe negativo pur presentato
    // come il vantaggio del vincitore.
    render(<EsitoConfronto algoritmi={ALGORITMI} vincitore="degree" />);
    // La frase col margine calcolato inizia con "vince per spread Monte
    // Carlo": deve mancare. La spiegazione dell'incoerenza menziona a parole
    // "un margine sul secondo classificato" (per dire che non lo si riporta),
    // quindi non basta cercare quella sottostringa per verificarne l'assenza.
    expect(screen.queryByText(/vince per spread Monte Carlo/)).not.toBeInTheDocument();
    expect(screen.getByText(/non e' il primo per spread Monte Carlo/)).toBeInTheDocument();
  });

  it("torna a calcolare il margine quando il vincitore dichiarato coincide col primo per spread", () => {
    render(<EsitoConfronto algoritmi={ALGORITMI} vincitore="CELF++" />);
    expect(screen.getByText(/vince per spread Monte Carlo/)).toBeInTheDocument();
  });
});
