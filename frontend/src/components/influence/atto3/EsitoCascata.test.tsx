import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EsitoCascata from "./EsitoCascata.tsx";

const META = {
  nodes: 319096, edges: 1978155, seeds: 1000,
  reached_nodes: 80943, reached_pct: 25.366, num_steps: 11,
  note: "propagazione = una realizzazione Independent Cascade dai seed",
};

const STEP = [
  { step: 0, new_nodes: 1000, new_ai: 1000, new_human: 0, cumulative_nodes: 1000, cumulative_pct: 0.313, fired_edges: 0 },
  { step: 1, new_nodes: 34595, new_ai: 279, new_human: 34316, cumulative_nodes: 35595, cumulative_pct: 11.155, fired_edges: 34595 },
  { step: 2, new_nodes: 11842, new_ai: 106, new_human: 11736, cumulative_nodes: 47437, cumulative_pct: 14.866, fired_edges: 11842 },
  { step: 3, new_nodes: 12193, new_ai: 54, new_human: 12139, cumulative_nodes: 59630, cumulative_pct: 18.687, fired_edges: 12193 },
];

const DEMOGRAFIA = {
  activated_total: 80943, activated_ai: 1523, activated_human: 79420,
  seeds_ai: 1000, seeds_human: 0,
};

describe("EsitoCascata", () => {
  it("dichiara che il numero e' una singola realizzazione, non un valore atteso", () => {
    // Il difetto originale: meta.note lo diceva, ma restava in un campo JSON.
    render(<EsitoCascata meta={META} stepStats={STEP} demografia={DEMOGRAFIA} />);
    expect(screen.getByTestId("avvertenza-realizzazione")).toHaveTextContent(/realizzazione/i);
  });

  it("dice che la cascata si concentra nei primi step", () => {
    render(<EsitoCascata meta={META} stepStats={STEP} demografia={DEMOGRAFIA} />);
    expect(screen.getByTestId("concentrazione")).toHaveTextContent(/4[23]/);
  });

  it("dice che chi viene raggiunto e' quasi sempre umano", () => {
    render(<EsitoCascata meta={META} stepStats={STEP} demografia={DEMOGRAFIA} />);
    expect(screen.getByTestId("composizione")).toHaveTextContent(/98/);
  });
});
