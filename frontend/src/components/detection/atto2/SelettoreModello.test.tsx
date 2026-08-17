import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelettoreModello from "./SelettoreModello.tsx";
import { MODELLI, risolviModello } from "../detectionContent.ts";

describe("SelettoreModello", () => {
  it("mostra il modello attivo con la sua famiglia", () => {
    const modello = risolviModello("binoculars");
    render(<SelettoreModello modello={modello} onChange={() => {}} />);

    expect(screen.getByText(modello.nome)).toBeInTheDocument();
    expect(screen.getByText(modello.famiglia)).toBeInTheDocument();
  });

  it("offre tutti e quattro i rilevatori e riporta quello scelto", async () => {
    const onChange = vi.fn();
    render(<SelettoreModello modello={MODELLI[0]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox", { name: /scegli il rilevatore/i }));

    const opzioni = await screen.findAllByRole("option");
    expect(opzioni).toHaveLength(MODELLI.length);

    await userEvent.click(screen.getByRole("option", { name: new RegExp(MODELLI[2].nome, "i") }));
    expect(onChange).toHaveBeenCalledWith(MODELLI[2].id);
  });
});
