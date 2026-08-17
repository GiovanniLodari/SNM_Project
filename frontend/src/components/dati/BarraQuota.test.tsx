import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BarraQuota from "./BarraQuota.tsx";

describe("BarraQuota", () => {
  it("dimensiona ogni segmento sul totale condiviso", () => {
    render(
      <BarraQuota
        totale={200}
        segmenti={[
          { valore: 50, colore: "#000", etichetta: "un quarto" },
          { valore: 100, colore: "#fff", etichetta: "una meta'" },
        ]}
      />,
    );

    expect(screen.getByTitle("un quarto")).toHaveStyle({ width: "25%" });
    expect(screen.getByTitle("una meta'")).toHaveStyle({ width: "50%" });
  });

  it("lascia vuota la parte di totale non coperta dai segmenti", () => {
    // E' il caso della copertura parziale di un rilevatore: la barra deve
    // restare incompleta, non riempirsi come se il dato ci fosse tutto.
    render(
      <BarraQuota totale={100} segmenti={[{ valore: 30, colore: "#000", etichetta: "coperto" }]} />,
    );

    expect(screen.getByTitle("coperto")).toHaveStyle({ width: "30%" });
  });

  it("non rende nulla con totale zero invece di dividere per zero", () => {
    render(
      <BarraQuota totale={0} segmenti={[{ valore: 5, colore: "#000", etichetta: "assente" }]} />,
    );

    expect(screen.queryByTitle("assente")).toBeNull();
  });

  it("tronca a barra piena un segmento piu' grande del totale", () => {
    render(
      <BarraQuota totale={10} segmenti={[{ valore: 40, colore: "#000", etichetta: "eccedente" }]} />,
    );

    expect(screen.getByTitle("eccedente")).toHaveStyle({ width: "100%" });
  });
});
