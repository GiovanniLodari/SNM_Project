import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfrontoGrafi from "./ConfrontoGrafi.tsx";

const props = {
  nodiCompleto: 319096,
  archiCompleto: 1978155,
  nodiSottografo: 10000,
  archiSottografo: 313221,
  candidati: 822,
  kRichiesto: 1000,
};

describe("ConfrontoGrafi", () => {
  it("dichiara entrambi i grafi con le loro dimensioni", () => {
    render(<ConfrontoGrafi {...props} />);
    expect(screen.getByText("319.096")).toBeInTheDocument();
    expect(screen.getByText("10.000")).toBeInTheDocument();
  });

  it("dice quanto il sottografo pesa sul totale", () => {
    // Il difetto originale: chi legge confronta numeri che vengono da due grafi
    // diversi senza saperlo. La proporzione va scritta, non lasciata da calcolare.
    render(<ConfrontoGrafi {...props} />);
    expect(screen.getByText(/3,1\s*%/)).toBeInTheDocument();
  });

  it("avverte che i candidati sono meno del budget richiesto", () => {
    // Senza questa premessa i numeri dell'Atto II sono incomprensibili.
    render(<ConfrontoGrafi {...props} />);
    expect(screen.getByText(/822/)).toBeInTheDocument();
    expect(screen.getByText(/1\.000/)).toBeInTheDocument();
  });

  it("non avverte quando i candidati bastano", () => {
    render(<ConfrontoGrafi {...props} candidati={1500} />);
    expect(screen.queryByTestId("avviso-budget")).not.toBeInTheDocument();
  });

  it("scala il lato del quadrato interno di sqrt(rapporto), non di rapporto", () => {
    // Il difetto del round 1: un lato proporzionale a `rapporto` (o una
    // larghezza sola, ad altezza fissa) fa un'area che non e' il rapporto
    // reale. Qui si legge lo stile inline, non solo l'etichetta testuale,
    // cosi' un futuro regresso sulla geometria fa fallire il test anche se
    // il numero scritto accanto resta corretto.
    render(<ConfrontoGrafi {...props} />);
    const quadrato = screen.getByTestId("quadrato-interno");
    const latoAtteso = Math.sqrt(props.nodiSottografo / props.nodiCompleto) * 100;
    expect(parseFloat(quadrato.style.width)).toBeCloseTo(latoAtteso, 5);
    expect(parseFloat(quadrato.style.height)).toBeCloseTo(latoAtteso, 5);
  });
});
