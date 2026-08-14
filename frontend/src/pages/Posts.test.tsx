import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import Posts from "./Posts.tsx";
import { theme } from "../theme.ts";
import type { Post } from "../api/client.ts";

const posts = vi.fn();

vi.mock("../api/client.ts", () => ({
  api: { posts: (...args: unknown[]) => posts(...args) },
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
    has_next: hasNext,
  };
}

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
    posts.mockImplementation((_lang: string[], pagina: number) =>
      Promise.resolve(blocco(pagina, 10, pagina < 4)),
    );
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
    posts.mockImplementation((_lang: string[], pagina: number) =>
      Promise.resolve(blocco(pagina, 10, false)),
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

    await userEvent.click(screen.getByText("IT"));

    await waitFor(() => {
      expect(screen.getByText(/10 post a schermo/i)).toBeInTheDocument();
    });
    expect(posts).toHaveBeenLastCalledWith(["it"], 1, 10);
  });
});
