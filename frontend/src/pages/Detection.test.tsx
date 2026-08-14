import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import Detection from "./Detection.tsx";
import { theme } from "../theme.ts";
import { MODELLI } from "../components/detection/detectionContent.ts";

/**
 * Le chiamate dell'API, sostituite da risposte minime ma della forma giusta.
 * Interessa che la pagina si monti e reagisca al menu a tendina, non che i
 * numeri siano quelli veri: quelli li verificano i test del backend.
 */
const aiDetection = vi.fn();
const detectorComparisonSummary = vi.fn();
const detectorComparisonPosts = vi.fn();

vi.mock("../api/client.ts", () => ({
  api: {
    aiDetection: (...args: unknown[]) => aiDetection(...args),
    detectorComparisonSummary: () => detectorComparisonSummary(),
    detectorComparisonPosts: (...args: unknown[]) => detectorComparisonPosts(...args),
  },
}));

function rispostaModello() {
  return {
    done: 1000,
    eligible: 2000,
    ai_classified: 100,
    ai_threshold: 0.5,
    histogram: { "0-20": 500, "80-100": 500 },
    bucket_samples: {},
    page_rows: [],
    page: 1,
    page_size: 50,
    has_next: false,
    prob_buckets: ["0-25", "25-50"],
    selected_buckets: [],
  };
}

function rendi() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={["/detection"]}>
          <Detection />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiDetection.mockResolvedValue(rispostaModello());
    detectorComparisonSummary.mockResolvedValue({
      models: [],
      comparison_report: {
        soglia_ai: 0.5,
        id_totali: 0,
        conteggio_ai: { ai_per_esattamente_2: 0, ai_per_esattamette_1: 0, ai_per_nessuno: 0 },
        accordo: { coppie: {} },
        copertura: { binoculars: 0, desklib: 0 },
      },
      binoculars_report: {},
      bot_investigation: null,
    });
    detectorComparisonPosts.mockResolvedValue({
      posts: [],
      total: 0,
      page: 1,
      page_size: 15,
      filter_type: "all",
    });
  });

  it("apre il capitolo con i tre atti", async () => {
    rendi();

    // Le domande dei tre atti: sono l'ossatura della narrazione, non decorazione.
    expect(await screen.findByText(/quali metodi si riconosce/i)).toBeInTheDocument();
    expect(screen.getByText(/preso da solo, sul corpus completo/i)).toBeInTheDocument();
    expect(screen.getByText(/quattro giudici indipendenti/i)).toBeInTheDocument();
  });

  it("chiede al backend il modello scelto nel menu a tendina", async () => {
    rendi();
    await screen.findByRole("combobox", { name: /scegli il rilevatore/i });

    // Il quarto argomento di api.aiDetection e' il detector: e' cio' che rende
    // le quattro viste diverse fra loro invece di quattro copie della stessa.
    expect(aiDetection).toHaveBeenCalledWith([], 1, "id", "fastdetect");

    await userEvent.click(screen.getByRole("combobox", { name: /scegli il rilevatore/i }));
    await userEvent.click(screen.getByRole("option", { name: /Binoculars/i }));

    expect(aiDetection).toHaveBeenLastCalledWith([], 1, "id", "binoculars");
  });

  it("nomina il modello scelto nei testi, non solo nei numeri", async () => {
    rendi();
    const desklib = MODELLI.find((m) => m.id === "desklib")!;

    await screen.findByRole("combobox", { name: /scegli il rilevatore/i });
    await userEvent.click(screen.getByRole("combobox", { name: /scegli il rilevatore/i }));
    await userEvent.click(screen.getByRole("option", { name: new RegExp(desklib.nome, "i") }));

    // Il difetto originale: la pagina serviva tutti e quattro i rilevatori ma
    // certi testi nominavano comunque FastDetectGPT.
    const occorrenze = await screen.findAllByText(new RegExp(desklib.nome, "i"));
    expect(occorrenze.length).toBeGreaterThan(1);
    expect(screen.queryByText(/soglia.*FastDetectGPT/i)).toBeNull();
  });
});
