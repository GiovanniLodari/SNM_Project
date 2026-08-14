import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PastiglieRilevatori from "./PastiglieRilevatori.tsx";
import type { Post } from "../../../api/client.ts";

const base: Post = {
  id: 1,
  language: "it",
  content: "un post",
  created_at: null,
  acct: "tizio",
  bot: false,
  domain: "mastodon.example",
};

describe("PastiglieRilevatori", () => {
  it("conta i voti sui soli rilevatori che hanno valutato il post", () => {
    // Tre modelli su quattro si sono pronunciati, due sopra soglia: il quarto
    // non deve entrare nel denominatore come se avesse detto "no".
    render(
      <PastiglieRilevatori
        post={{ ...base, fastdetect_prob: 0.9, binoculars_prob: 0.8, desklib_prob: 0.1 }}
      />,
    );

    expect(screen.getByText("2/3 lo dicono sintetico")).toBeInTheDocument();
  });

  it("dichiara i post che nessuno ha valutato", () => {
    render(<PastiglieRilevatori post={base} />);

    // Zero voti su zero letture non e' "nessuno lo ritiene sintetico".
    expect(screen.getByText("non valutato")).toBeInTheDocument();
  });

  it("distingue un punteggio nullo da un punteggio assente", () => {
    // `null` significa "il modello non ha valutato questo post": trattarlo come
    // 0 lo conterebbe fra i pareri favorevoli all'origine umana.
    render(<PastiglieRilevatori post={{ ...base, fastdetect_prob: 0.7, ada_prob: null }} />);

    expect(screen.getByText("1/1 lo dicono sintetico")).toBeInTheDocument();
  });

  it("porta la cifra esatta di ogni modello nel proprio suggerimento", () => {
    render(<PastiglieRilevatori post={{ ...base, fastdetect_prob: 0.873 }} />);

    expect(screen.getByTitle("FastDetectGPT: 87,3%")).toBeInTheDocument();
    expect(screen.getByTitle("Binoculars: n/d")).toBeInTheDocument();
  });

  it("la soglia e' inclusiva: 0,5 conta come sintetico", () => {
    render(<PastiglieRilevatori post={{ ...base, fastdetect_prob: 0.5 }} />);

    expect(screen.getByText("1/1 lo dicono sintetico")).toBeInTheDocument();
  });
});
