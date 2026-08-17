import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.tsx";
import { CAPITOLI } from "./navigazione.ts";

// Le pagine sono caricate in lazy e ognuna chiama l'API: qui interessa solo il
// guscio - sidebar e barra superiore - quindi il client viene neutralizzato.
vi.mock("./api/client.ts", () => ({
  api: new Proxy({}, { get: () => () => new Promise(() => {}) }),
}));

/**
 * Il pannello permanente, quello del desktop.
 *
 * Va distinto esplicitamente perche' il pannello temporaneo di mobile resta
 * montato (`keepMounted`, cosi' aprendolo non si ricostruisce): ogni voce di
 * navigazione esiste quindi due volte nel documento, e una ricerca globale
 * finirebbe sulla copia mobile - che non ha ne' larghezza variabile ne'
 * gestori del focus.
 */
function pannelloDesktop(): HTMLElement {
  return screen.getByTestId("sidebar-desktop");
}

/** La voce di navigazione di un capitolo, per nome, nel pannello desktop. */
function voce(nome: string) {
  return within(pannelloDesktop()).getByRole("link", { name: new RegExp(nome, "i") });
}

describe("Sidebar", () => {
  beforeEach(() => {
    window.location.hash = "#/";
  });

  it("elenca i capitoli con le loro voci", () => {
    render(<App />);
    for (const capitolo of CAPITOLI) {
      for (const v of capitolo.voci) {
        expect(voce(v.testo)).toBeInTheDocument();
      }
    }
  });

  it("mantiene le etichette accessibili e navigabili da tastiera", () => {
    render(<App />);
    const collegamento = voce("Fact checking");
    expect(collegamento).toHaveAccessibleName(/fact checking/i);
    collegamento.focus();
    expect(collegamento).toHaveFocus();
  });

  it("mostra il capitolo corrente nella barra superiore", async () => {
    render(<App />);

    await userEvent.click(voce("Fact checking"));

    expect(
      await screen.findByText(/Capitolo III · La verifica dei fatti/i),
    ).toBeInTheDocument();
  });
});
