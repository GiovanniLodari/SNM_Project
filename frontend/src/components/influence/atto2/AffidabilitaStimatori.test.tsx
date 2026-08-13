import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AffidabilitaStimatori from "./AffidabilitaStimatori.tsx";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";

const ALGORITMI: Record<string, InfluenceAlgorithmInfo> = {
  PMIA: { n_seeds: 822, est_spread: 1675.83, mc_spread: 2566.732, time_s: 4.4, seeds_sample: [] },
  "CELF++": { n_seeds: 822, est_spread: 2558.89, mc_spread: 2571.534, time_s: 4228.67, seeds_sample: [] },
  SKIM: { n_seeds: 405, est_spread: 2542.5, mc_spread: 1996.864, time_s: 0.81, seeds_sample: [] },
  degree: { n_seeds: 822, est_spread: null, mc_spread: 2563.206, time_s: 0.0, seeds_sample: [] },
};

describe("AffidabilitaStimatori", () => {
  it("mostra solo gli algoritmi che producono una stima", () => {
    render(<AffidabilitaStimatori algoritmi={ALGORITMI} />);
    expect(screen.getByText("PMIA")).toBeInTheDocument();
    expect(screen.getByText("SKIM")).toBeInTheDocument();
    // degree non stima nulla: includerlo con uno scarto nullo sarebbe falso.
    expect(screen.queryByText("degree")).not.toBeInTheDocument();
  });

  it("distingue la sottostima dalla sovrastima", () => {
    render(<AffidabilitaStimatori algoritmi={ALGORITMI} />);
    expect(screen.getByTestId("scarto-PMIA")).toHaveTextContent(/-3[45]/);
    expect(screen.getByTestId("scarto-SKIM")).toHaveTextContent(/\+27/);
  });
});
