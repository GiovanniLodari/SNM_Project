import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountDetailModal from "./AccountDetailModal.tsx";
import type { AccountDetail } from "../api/client.ts";

const account: AccountDetail = {
  id: 1,
  acct: "@tizio@mastodon.social",
  username: "tizio",
  display_name: "Tizio",
  bot: false,
  domain: "mastodon.social",
  url: "https://mastodon.social/@tizio",
  followers_count: 10,
  following_count: 5,
  statuses_count: 42,
  note: "",
};

describe("AccountDetailModal", () => {
  it("mostra l'errore invece di sparire in silenzio", () => {
    // Regressione: prima, se la chiamata falliva, il modale si apriva, il
    // caricamento finiva e il componente rendeva null - una finestra che si
    // apre e svanisce senza spiegazione.
    render(
      <AccountDetailModal
        open
        onClose={vi.fn()}
        account={null}
        error="Impossibile caricare i dettagli dell'account."
      />,
    );

    expect(screen.getByText("Dettagli non disponibili")).toBeInTheDocument();
    expect(
      screen.getByText("Impossibile caricare i dettagli dell'account."),
    ).toBeInTheDocument();
  });

  it("non rende nulla senza account, senza caricamento e senza errore", () => {
    const { container } = render(
      <AccountDetailModal open onClose={vi.fn()} account={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra i dati dell'account quando ci sono", () => {
    render(<AccountDetailModal open onClose={vi.fn()} account={account} />);
    expect(screen.getByText("Tizio")).toBeInTheDocument();
    expect(screen.getByText("@tizio@mastodon.social")).toBeInTheDocument();
  });

  it("non inventa metriche: mostra quelle ricevute", () => {
    // Regressione: i rami .then() e .catch() costruivano un account di ripiego
    // con followers_count = degree * 12, following_count = 5 e
    // statuses_count = 42, presentati nel modale come dati reali.
    render(<AccountDetailModal open onClose={vi.fn()} account={account} />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
