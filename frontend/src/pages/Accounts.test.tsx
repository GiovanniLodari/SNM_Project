import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import Accounts from "./Accounts.tsx";
import { theme } from "../theme.ts";
import type { AccountsStats } from "../api/client.ts";

const accounts = vi.fn();
const accountDetail = vi.fn();

vi.mock("../api/client.ts", () => ({
  api: {
    accounts: () => accounts(),
    accountDetail: (id: number) => accountDetail(id),
  },
}));

/**
 * Cifre scelte tutte diverse fra loro: le celle della matrice si verificano per
 * valore, e due caselle con lo stesso numero renderebbero l'asserzione ambigua.
 */
const stats: AccountsStats = {
  bot_total: 100,
  nonbot_total: 900,
  ai_producers_total: 110,
  ai_and_bot: 30,
  ai_and_not_bot: 80,

  detector: "FastDetectGPT",
  ai_threshold: 0.5,
  accounts_total: 1000,
  accounts_con_post: 600,
  valutati_bot: 75,
  valutati_human: 400,
  posts_bot: 250,
  posts_human: 750,
  istanze: [{ domain: "mastodon.example", accounts: 700, bot_accounts: 90 }],
  followers_bot: { accounts: 40, mediana: 12, massimo: 900, scartati: 0 },
  followers_human: { accounts: 500, mediana: 88, massimo: 5000, scartati: 3 },
  piu_seguiti: [
    { id: 7, acct: "istituzione@mastodon.example", bot: false, domain: "mastodon.example", followers: 5000 },
  ],
  top_produttori: [
    {
      id: 42,
      acct: "bollettino@mastodon.example",
      bot: true,
      domain: "mastodon.example",
      followers: 900,
      posts: 64,
      posts_scored: 60,
      ai_posts: 55,
      mean_prob: 0.91,
    },
  ],
};

function rendi() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={["/accounts"]}>
          <Accounts />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("Accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accounts.mockResolvedValue(stats);
    accountDetail.mockResolvedValue({
      account: {
        id: 42,
        acct: "bollettino@mastodon.example",
        username: "bollettino",
        display_name: "Bollettino automatico",
        bot: true,
        domain: "mastodon.example",
      },
    });
  });

  it("incrocia la dichiarazione bot con il giudizio del rilevatore", async () => {
    rendi();

    // Le sei caselle della matrice: la terza colonna e' quella che la pagina
    // esisteva per non nascondere, gli account su cui non si sa nulla.
    expect(await screen.findByText("30")).toBeInTheDocument(); // bot, produce IA
    expect(screen.getByText("45")).toBeInTheDocument(); // bot valutati sotto soglia
    expect(screen.getByText("25")).toBeInTheDocument(); // bot senza post valutati
    expect(screen.getByText("80")).toBeInTheDocument(); // non bot, produce IA
    expect(screen.getByText("320")).toBeInTheDocument(); // non bot sotto soglia
    expect(screen.getByText("500")).toBeInTheDocument(); // non bot senza post valutati
  });

  it("calcola i tassi sui soli account valutati, non su tutti", async () => {
    rendi();

    // 30/75 = 40%, non 30/100 = 30%: contare anche i non valutati come "non
    // produce IA" trasformerebbe un'assenza di misura in una misura.
    const lettura = await screen.findByText(/dei bot dichiarati scrive testo/i);
    expect(lettura).toHaveTextContent("40%");
    expect(lettura).toHaveTextContent("20%"); // 80/400 fra i non dichiarati bot
  });

  it("dichiara quale rilevatore ha emesso i giudizi", async () => {
    rendi();

    // La pagina parla di un solo modello, non del consenso a quattro del
    // Capitolo II: tacerlo lascerebbe credere il contrario.
    expect(await screen.findByText(/Rilevatore: FastDetectGPT/i)).toBeInTheDocument();
  });

  it("apre il profilo archiviato di un produttore", async () => {
    rendi();

    await userEvent.click(
      await screen.findByRole("button", { name: "bollettino@mastodon.example" }),
    );

    await waitFor(() => expect(accountDetail).toHaveBeenCalledWith(42));
    const modale = await screen.findByRole("dialog");
    expect(within(modale).getByText(/Bollettino automatico/i)).toBeInTheDocument();
  });

  it("dichiara i contatori di follower scartati invece di farli sparire", async () => {
    rendi();

    // Nei dati veri alcuni profili dichiarano miliardi di follower: escluderli
    // e' giusto, tacerlo renderebbe la copertura del dato incomprensibile.
    expect(await screen.findByText(/3 scartati/i)).toBeInTheDocument();
  });

  it("mostra l'errore invece di una pagina vuota", async () => {
    accounts.mockRejectedValue(new Error("backend spento"));
    rendi();

    expect(
      await screen.findByText(/Impossibile caricare le statistiche sugli account/i),
    ).toBeInTheDocument();
  });
});
