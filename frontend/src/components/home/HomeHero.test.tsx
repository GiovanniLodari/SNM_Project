import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomeHero from "./HomeHero.tsx";
import { HERO } from "./homeContent.ts";
import type { DashboardStats } from "../../api/client.ts";

const statsDiProva: DashboardStats = {
  posts_total: 1836285,
  follows_total: 1521082,
  ai_done: 192822,
  ai_eligible: 192822,
  ai_classified: 20194,
  ai_threshold: 0.5,
  fact_check_done: 35767,
  fact_check_eligible: 192822,
};

function rendi(stats: DashboardStats | null, loading: boolean) {
  return render(
    <MemoryRouter>
      <HomeHero stats={stats} loading={loading} />
    </MemoryRouter>,
  );
}

describe("HomeHero", () => {
  it("presenta il progetto e le due chiamate all'azione", () => {
    rendi(statsDiProva, false);

    expect(screen.getByRole("heading", { name: HERO.titolo })).toBeInTheDocument();
    expect(screen.getByText(HERO.paragrafo)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(HERO.ctaPrimaria) })).toHaveAttribute(
      "href",
      "/posts",
    );
    expect(screen.getByRole("button", { name: new RegExp(HERO.ctaSecondaria) })).toBeInTheDocument();
  });

  it("formatta i numeri col separatore italiano", () => {
    rendi(statsDiProva, false);

    // it-IT usa il punto per le migliaia: un formato inglese qui sarebbe un
    // regresso rispetto a utils/format.ts, che accentra proprio questa scelta.
    expect(screen.getByText("1.836.285")).toBeInTheDocument();
    expect(screen.getByText("35.767")).toBeInTheDocument();
  });

  it("durante il caricamento mostra il testo ma non numeri", () => {
    const { container } = rendi(null, true);

    // Il punto della hero: il testo introduttivo c'e' da subito, senza
    // aspettare /api/dashboard.
    expect(screen.getByRole("heading", { name: HERO.titolo })).toBeInTheDocument();
    expect(container.querySelectorAll(".MuiSkeleton-root")).toHaveLength(4);
    expect(screen.queryByText("1.836.285")).not.toBeInTheDocument();
  });

  it("senza dati dichiara l'assenza invece di mostrare zero", () => {
    rendi(null, false);

    // Uno "0" qui sarebbe indistinguibile da un corpus vuoto reale.
    expect(screen.getAllByText("n/d")).toHaveLength(4);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
