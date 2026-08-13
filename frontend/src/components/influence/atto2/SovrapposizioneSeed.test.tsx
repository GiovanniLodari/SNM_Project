import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SovrapposizioneSeed from "./SovrapposizioneSeed.tsx";

const JACCARD: Record<string, number> = {
  "PMIA|CELF++": 1.0, "PMIA|SKIM": 0.4927, "PMIA|degree": 1.0, "PMIA|pagerank": 1.0,
  "CELF++|SKIM": 0.4927, "CELF++|degree": 1.0, "CELF++|pagerank": 1.0,
  "SKIM|degree": 0.4927, "SKIM|pagerank": 0.4927, "degree|pagerank": 1.0,
};

describe("SovrapposizioneSeed", () => {
  it("dice in una frase che quattro algoritmi scelgono lo stesso insieme", () => {
    // Il difetto originale: questo risultato era una matrice di numeri in fondo
    // alla pagina, dove nessuno lo leggeva.
    render(<SovrapposizioneSeed jaccard={JACCARD} />);
    const frase = screen.getByTestId("frase-seed-identici");
    expect(frase).toHaveTextContent("CELF++");
    expect(frase).toHaveTextContent("PMIA");
    expect(frase).toHaveTextContent("degree");
    expect(frase).toHaveTextContent("pagerank");
  });

  it("mostra comunque la matrice come dettaglio di supporto", () => {
    render(<SovrapposizioneSeed jaccard={JACCARD} />);
    expect(screen.getByTestId("matrice-jaccard")).toBeInTheDocument();
  });

  it("tace quando nessun gruppo coincide del tutto", () => {
    render(<SovrapposizioneSeed jaccard={{ "A|B": 0.8 }} />);
    expect(screen.queryByTestId("frase-seed-identici")).not.toBeInTheDocument();
  });
});
