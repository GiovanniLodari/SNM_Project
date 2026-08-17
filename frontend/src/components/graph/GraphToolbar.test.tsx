import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphToolbar } from "./GraphToolbar.tsx";

/**
 * La barra del grafo non aveva test, ed e' il comando piu' guardato della
 * Panoramica: sta sopra il canvas che finisce proiettato in aula.
 *
 * Questi casi bloccano i due difetti che la revisione ha trovato qui e che
 * nessun controllo automatico vedeva: le etichette tornate in inglese, e il
 * comando di riproduzione che prendeva in prestito tinte gia' assegnate ad
 * altro significato.
 */

function propsBase(sovrascritture: Partial<Parameters<typeof GraphToolbar>[0]> = {}) {
  return {
    graphMode: "all",
    onGraphModeChange: vi.fn(),
    searchQuery: "",
    onSearchQueryChange: vi.fn(),
    searchResults: [],
    searchLoading: false,
    selectedSearchAccount: null,
    onSelectSearchedAccount: vi.fn(),
    isPlaying: false,
    onTogglePlay: vi.fn(),
    onStepIncrement: vi.fn(),
    onResetGraph: vi.fn(),
    visibleCount: 12,
    totalNodesCount: 80,
    onVisibleCountChange: vi.fn(),
    speedMultiplier: 1,
    onSpeedMultiplierChange: vi.fn(),
    ...sovrascritture,
  };
}

function rendi(sovrascritture = {}) {
  return render(<GraphToolbar {...propsBase(sovrascritture)} />);
}

describe("GraphToolbar", () => {
  it("scrive i comandi in italiano corrente", () => {
    rendi();

    expect(screen.getByRole("button", { name: /avvia/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+3 account/i })).toBeInTheDocument();
    expect(screen.getByText("RIVELAZIONE PROGRESSIVA")).toBeInTheDocument();
    expect(screen.getByText("12 / 80 account")).toBeInTheDocument();
  });

  it("non lascia in interfaccia le etichette tecniche in inglese", () => {
    // Il file era tradotto a meta': l'etichetta dello slider arrivava a dire
    // `RENDER PROGRESSION ("POCHI NODI ALLA VOLTA")`, inglese con dentro
    // l'italiano fra virgolette. E' il tipo di residuo che si riforma a ogni
    // modifica se nessuno lo blocca.
    const { container } = rendi();
    const testo = container.textContent ?? "";

    for (const residuo of ["PLAY STREAM", "PAUSE STREAM", "STEP (+3)", "RENDER PROGRESSION", "Nodes", "Domain"]) {
      expect(testo).not.toContain(residuo);
    }
  });

  it("dice lo stato della riproduzione con l'etichetta, non con la tinta", async () => {
    const onTogglePlay = vi.fn();
    const { rerender } = render(<GraphToolbar {...propsBase({ onTogglePlay })} />);

    const avvia = screen.getByRole("button", { name: /avvia/i });
    await userEvent.click(avvia);
    expect(onTogglePlay).toHaveBeenCalledOnce();

    rerender(<GraphToolbar {...propsBase({ onTogglePlay, isPlaying: true })} />);
    expect(screen.getByRole("button", { name: /pausa/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /avvia/i })).not.toBeInTheDocument();
  });

  it("dichiara quale moltiplicatore di velocita' e' attivo", () => {
    // La selezione era affidata alla sola tinta di fondo: da tastiera e da
    // screen reader non c'era modo di sapere quale fosse in uso.
    rendi({ speedMultiplier: 2 });

    expect(screen.getByText("2x").closest('[aria-pressed]')).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1x").closest('[aria-pressed]')).toHaveAttribute("aria-pressed", "false");
  });

  it("da' un nome accessibile al cursore della rivelazione", () => {
    rendi();
    expect(screen.getByRole("slider", { name: /quanti account mostrare/i })).toBeInTheDocument();
  });

  it("blocca il comando di avanzamento quando gli account sono tutti visibili", () => {
    rendi({ visibleCount: 80, totalNodesCount: 80 });
    expect(screen.getByRole("button", { name: /\+3 account/i })).toBeDisabled();
  });
});
