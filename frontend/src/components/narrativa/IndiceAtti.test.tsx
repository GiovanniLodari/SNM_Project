import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashRouter, Route, Routes } from "react-router-dom";
import IndiceAtti from "./IndiceAtti.tsx";
import type { Atto } from "./tipi.ts";

const ATTI_FINTI: readonly Atto[] = [
  { id: "problema", numero: "I", titolo: "Il problema", domanda: "Che problema?" },
  { id: "cascata", numero: "II", titolo: "La cascata", domanda: "Fin dove arriva?" },
];

describe("IndiceAtti", () => {
  it("elenca tutti gli atti con un collegamento alla propria ancora", () => {
    render(<IndiceAtti atti={ATTI_FINTI} attivo="problema" />);
    ATTI_FINTI.forEach((atto) => {
      const voce = screen.getByRole("link", { name: new RegExp(atto.titolo, "i") });
      expect(voce).toHaveAttribute("href", `#${atto.id}`);
    });
  });

  it("segnala quale atto e' quello corrente", () => {
    render(<IndiceAtti atti={ATTI_FINTI} attivo="cascata" />);
    expect(screen.getByTestId("voce-cascata")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("voce-problema")).not.toHaveAttribute("aria-current");
  });

  it("saltare a un atto non cambia la rotta", async () => {
    // L'app monta un HashRouter: l'hash e' la rotta. Lasciando che il browser
    // seguisse l'href, "#/capitolo" diventava "#cascata", nessuna rotta
    // corrispondeva e la pagina si svuotava. Qui si verifica che il contenuto
    // della rotta sia ancora montato dopo il clic.
    window.location.hash = "#/capitolo";

    render(
      <HashRouter>
        <Routes>
          <Route
            path="/capitolo"
            element={<IndiceAtti atti={ATTI_FINTI} attivo="problema" />}
          />
        </Routes>
      </HashRouter>,
    );

    await userEvent.click(screen.getByTestId("voce-cascata"));

    expect(window.location.hash).toBe("#/capitolo");
    expect(screen.getByTestId("voce-cascata")).toBeInTheDocument();
  });
});
