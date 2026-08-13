import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HowItWorks from "./HowItWorks.tsx";
import { ANCORA_COME_FUNZIONA, STEPS } from "./homeContent.ts";

function rendi() {
  return render(
    <MemoryRouter>
      <HowItWorks />
    </MemoryRouter>,
  );
}

describe("HowItWorks", () => {
  it("mostra tutti i passi con titolo e descrizione", () => {
    rendi();

    STEPS.forEach((step) => {
      expect(screen.getByText(step.titolo)).toBeInTheDocument();
      expect(screen.getByText(step.descrizione)).toBeInTheDocument();
      expect(screen.getByText(step.numero)).toBeInTheDocument();
    });
  });

  it("ogni passo porta alla propria pagina", () => {
    rendi();

    STEPS.forEach((step) => {
      const link = screen.getByRole("link", { name: new RegExp(step.ctaLabel) });
      expect(link).toHaveAttribute("href", step.path);
    });
  });

  it("espone l'ancora usata dalla CTA della hero", () => {
    // Se l'id cambia senza aggiornare la costante, il bottone "Come funziona"
    // smette di scorrere e fallisce in silenzio.
    const { container } = rendi();
    expect(container.querySelector(`#${ANCORA_COME_FUNZIONA}`)).not.toBeNull();
  });
});
