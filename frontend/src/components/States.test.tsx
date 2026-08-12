import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState, ErrorState, LoadingState } from "./States.tsx";

describe("ErrorState", () => {
  it("non rende nulla senza messaggio", () => {
    // Contratto su cui si appoggiano tutte le pagine: montano <ErrorState
    // message={error} /> incondizionatamente e si aspettano che sparisca
    // quando `error` e' null.
    const { container } = render(<ErrorState message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("non rende nulla con messaggio vuoto", () => {
    const { container } = render(<ErrorState message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra il messaggio quando c'e'", () => {
    render(<ErrorState message="Backend non raggiungibile" />);
    expect(screen.getByText("Backend non raggiungibile")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("mostra il messaggio ricevuto", () => {
    render(<EmptyState message="Nessun post corrisponde ai filtri." />);
    expect(screen.getByText("Nessun post corrisponde ai filtri.")).toBeInTheDocument();
  });
});

describe("LoadingState", () => {
  it("espone un indicatore accessibile", () => {
    render(<LoadingState />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
