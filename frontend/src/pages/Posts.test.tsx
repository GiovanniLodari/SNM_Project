import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import Posts from "./Posts.tsx";
import { theme } from "../theme.ts";
import type { CorpusResponse, FiltriPost, Post } from "../api/client.ts";

const posts = vi.fn();
const corpus = vi.fn();
const detectorComparisonSummary = vi.fn();

vi.mock("../api/client.ts", () => ({
  api: {
    posts: (filtri: FiltriPost) => posts(filtri),
    corpus: () => corpus(),
    detectorComparisonSummary: () => detectorComparisonSummary(),
  },
}));

/** Un blocco di post finti, numerati per poterli riconoscere a schermo. */
function blocco(numeroBlocco: number, quanti: number, hasNext: boolean) {
  const elenco: Post[] = Array.from({ length: quanti }, (_, i) => ({
    id: numeroBlocco * 100 + i,
    language: "en",
    content: `Contenuto del post ${numeroBlocco}-${i}`,
    created_at: "2026-01-01T00:00:00Z",
    acct: `autore${numeroBlocco}-${i}`,
    bot: false,
    domain: "mastodon.example",
  }));
  return {
    posts: elenco,
    available_langs: ["en", "it"],
    selected_langs: [],
    page: numeroBlocco,
    page_size: quanti,
    total_count: hasNext ? quanti * 10 : quanti * numeroBlocco,
    has_next: hasNext,
    search: "",
    author: "tutti",
    order: "archivio",
  };
}

const composizione: CorpusResponse = {
  posts_total: 12000,
  authors_total: 120,
  instances_total: 4,
  first_post_at: "2025-01-01T00:00:00Z",
  last_post_at: "2026-01-01T00:00:00Z",
  posts_bot: 3000,
  posts_human: 9000,
  posts_senza_lingua: 100,
  lingue: [{ lang: "en", posts: 7200 }],
  istanze: [{ domain: "mastodon.example", posts: 10800, accounts: 100, bot_posts: 2000 }],
};

function rendi(percorso = "/posts") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[percorso]}>
          <Posts />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("Posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    posts.mockImplementation((filtri: FiltriPost) =>
      Promise.resolve(blocco(filtri.page ?? 1, 10, (filtri.page ?? 1) < 4)),
    );
    corpus.mockResolvedValue(composizione);
    detectorComparisonSummary.mockResolvedValue({ models: [] });
  });

  it("i blocchi si accumulano invece di sostituirsi", async () => {
    rendi();
    expect(await screen.findByText("Contenuto del post 1-0")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /carica altri/i }));

    // Il primo blocco deve essere ancora a schermo: e' la differenza fra
    // caricare progressivamente e impaginare.
    expect(await screen.findByText("Contenuto del post 2-0")).toBeInTheDocument();
    expect(screen.getByText("Contenuto del post 1-0")).toBeInTheDocument();
    expect(screen.getByText(/20 post a schermo/i)).toBeInTheDocument();
  });

  it("ripristina dalla URL quanti blocchi erano aperti", async () => {
    // Lo scenario che la paginazione copriva e che lo scorrimento infinito
    // perde di solito: si apre un post dal fondo di un elenco lungo e si torna
    // indietro. Senza il conteggio nella URL si ricomincerebbe da dieci post.
    rendi("/posts?pagine=3");

    await waitFor(() => {
      expect(screen.getByText(/30 post a schermo/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Contenuto del post 3-9")).toBeInTheDocument();
    expect(posts).toHaveBeenCalledTimes(3);
  });

  it("non chiede blocchi oltre la fine dell'elenco", async () => {
    posts.mockImplementation((filtri: FiltriPost) =>
      Promise.resolve(blocco(filtri.page ?? 1, 10, false)),
    );
    rendi("/posts?pagine=50");

    await waitFor(() => {
      expect(screen.getByText(/fine dell'elenco/i)).toBeInTheDocument();
    });
    // `has_next: false` sul primo blocco chiude l'elenco: le altre 49 pagine
    // richieste dalla URL non devono tradursi in richieste.
    expect(posts).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /carica altri/i })).toBeNull();
  });

  it("cambiando lingua riparte da un blocco solo", async () => {
    rendi("/posts?pagine=3");
    await waitFor(() => expect(screen.getByText(/30 post a schermo/i)).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /filtra per lingua: italiano/i }));

    await waitFor(() => {
      expect(screen.getByText(/10 post a schermo/i)).toBeInTheDocument();
    });
    expect(posts).toHaveBeenLastCalledWith(
      expect.objectContaining({ lang: ["it"], page: 1, pageSize: 10 }),
    );
  });

  it("la ricerca arriva all'API e azzera i blocchi gia' aperti", async () => {
    rendi("/posts?pagine=3");
    await waitFor(() => expect(screen.getByText(/30 post a schermo/i)).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/cerca nel testo dei post/i), "elezioni");

    // Il ritardo evita una richiesta per tasto premuto: quella che parte porta
    // il termine intero, non le sue otto forme parziali.
    await waitFor(() => {
      expect(posts).toHaveBeenCalledWith(expect.objectContaining({ search: "elezioni", page: 1 }));
    });
    expect(posts).not.toHaveBeenCalledWith(expect.objectContaining({ search: "elezi" }));
  });

  it("il filtro sull'autore viaggia nella URL e nella richiesta", async () => {
    rendi();
    expect(await screen.findByText("Contenuto del post 1-0")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /solo bot/i }));

    await waitFor(() => {
      expect(posts).toHaveBeenLastCalledWith(expect.objectContaining({ author: "bot" }));
    });
  });

  it("dichiara quando il totale non e' stato calcolato invece di mostrare zero", async () => {
    // Con una ricerca attiva il backend non conta: sarebbe una scansione
    // completa della tabella. Un "0 post corrispondono" sarebbe una bugia.
    posts.mockImplementation((filtri: FiltriPost) =>
      Promise.resolve({ ...blocco(filtri.page ?? 1, 10, false), total_count: null }),
    );
    rendi();

    expect(await screen.findByText(/il totale non viene calcolato/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 post corrispondono/i)).toBeNull();
  });

  it("apre il capitolo con la composizione del corpus", async () => {
    rendi();

    // L'Atto I risponde alla domanda "di che cosa e' un campione questo
    // elenco", che l'elenco da solo non poteva porre.
    expect(await screen.findByText(/Post archiviati/i)).toBeInTheDocument();
    expect(screen.getByText("12.000")).toBeInTheDocument();
    expect(screen.getByText(/Istanze di origine/i)).toBeInTheDocument();
  });

  it("dichiara l'errore del corpus senza far sparire l'archivio", async () => {
    corpus.mockRejectedValue(new Error("backend spento"));
    rendi();

    expect(await screen.findByText(/Impossibile caricare la composizione/i)).toBeInTheDocument();
    // I post arrivano da un'altra query: un guasto dell'una non deve svuotare
    // la pagina dell'altra.
    expect(screen.getByText("Contenuto del post 1-0")).toBeInTheDocument();
  });
});
