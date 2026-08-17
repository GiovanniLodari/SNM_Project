import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GraficoCostoBeneficio from "./GraficoCostoBeneficio.tsx";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";

const ALGORITMI: Record<string, InfluenceAlgorithmInfo> = {
  PMIA: { n_seeds: 822, est_spread: 1675.83, mc_spread: 2566.732, time_s: 4.4, seeds_sample: [] },
  "CELF++": { n_seeds: 822, est_spread: 2558.89, mc_spread: 2571.534, time_s: 4228.67, seeds_sample: [] },
  SKIM: { n_seeds: 405, est_spread: 2542.5, mc_spread: 1996.864, time_s: 0.81, seeds_sample: [] },
  degree: { n_seeds: 822, est_spread: null, mc_spread: 2563.206, time_s: 0.0, seeds_sample: [] },
  pagerank: { n_seeds: 822, est_spread: null, mc_spread: 2555.408, time_s: 0.11, seeds_sample: [] },
};

describe("GraficoCostoBeneficio", () => {
  it("descrive un tempo sotto il pavimento come reale, col suo valore, non come '0,00 s'", () => {
    // degree ha time_s = 0.0: e' una misura reale sotto il pavimento
    // rappresentabile su scala log, non un dato mancante ne' un valore
    // scritto a mano nella didascalia.
    render(<GraficoCostoBeneficio algoritmi={ALGORITMI} />);
    const didascalia = screen.getByTestId("didascalia-pavimento");
    expect(didascalia).toHaveTextContent("degree");
    // formatDecimal(0, 2) rende "0", non "0,00": toLocaleString non aggiunge
    // zeri decimali che maximumFractionDigits non richiede esplicitamente.
    expect(didascalia).toHaveTextContent("degree (0 s)");
    expect(screen.queryByTestId("didascalia-assente")).not.toBeInTheDocument();
  });

  it("dichiara assente un tempo che manca dai dati, senza spacciarlo per una misura", () => {
    // In JS `null < 0.05` vale true: senza un controllo esplicito il grafico
    // tratterebbe un tempo mancante come se fosse sotto lo 0,1 s misurato.
    const algoritmiConTempoAssente: Record<string, InfluenceAlgorithmInfo> = {
      ...ALGORITMI,
      SKIM: { ...ALGORITMI.SKIM, time_s: null },
    };
    render(<GraficoCostoBeneficio algoritmi={algoritmiConTempoAssente} />);
    const didascaliaAssente = screen.getByTestId("didascalia-assente");
    expect(didascaliaAssente).toHaveTextContent("SKIM");
    expect(didascaliaAssente).toHaveTextContent("non risulta registrato");
    // La didascalia sul pavimento resta solo per degree: SKIM non vi compare,
    // perche' il suo problema e' un dato mancante, non un tempo piccolo.
    const didascaliaPavimento = screen.getByTestId("didascalia-pavimento");
    expect(didascaliaPavimento).not.toHaveTextContent("SKIM");
  });

  it("non mostra alcuna didascalia quando ogni tempo e' misurato sopra il pavimento", () => {
    const soloMisurati: Record<string, InfluenceAlgorithmInfo> = {
      PMIA: ALGORITMI.PMIA,
      "CELF++": ALGORITMI["CELF++"],
      SKIM: ALGORITMI.SKIM,
    };
    render(<GraficoCostoBeneficio algoritmi={soloMisurati} />);
    expect(screen.queryByTestId("didascalia-pavimento")).not.toBeInTheDocument();
    expect(screen.queryByTestId("didascalia-assente")).not.toBeInTheDocument();
  });
});
