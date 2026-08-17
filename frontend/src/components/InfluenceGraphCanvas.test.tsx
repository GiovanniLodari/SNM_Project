import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InfluenceGraphCanvas from "./InfluenceGraphCanvas.tsx";
import type { InfluenceGraphLink, InfluenceGraphNode } from "../api/client.ts";

// ECharts monta un canvas vero e misura il contenitore: in jsdom non disegna
// nulla e rallenta soltanto. Qui interessa il guscio - comandi, nomi
// accessibili, stato della riproduzione - non cosa la libreria dipinge.
//
// Il bersaglio e' `utils/echarts.tsx`, il nostro involucro, e non piu'
// "echarts-for-react": il componente importa quello. Un mock che punta al
// pacchetto non intercetterebbe piu' nulla e questi test tornerebbero a
// montare ECharts davvero - senza fallire, solo diventando lenti e verificando
// qualcosa di diverso da cio' che dichiarano.
vi.mock("../utils/echarts.tsx", () => ({
  default: () => <div data-testid="grafico-echarts" />,
  ReactECharts: () => <div data-testid="grafico-echarts" />,
}));

/**
 * La preferenza sul movimento si detta qui, non attraverso `window.matchMedia`.
 *
 * Ora che l'hook e' nostro (`hooks/useMovimentoRidotto.ts`) la preferenza e'
 * reattiva e non piu' fissata al primo import, quindi simulare `matchMedia`
 * funzionerebbe. Resta comunque un mock perche' e' il contratto che interessa
 * verificare - cosa fa *questo* componente quando la preferenza e' attiva, non
 * come l'hook la scopre - e perche' `matchMedia` in jsdom andrebbe simulata a
 * mano in ogni caso.
 *
 * `vi.hoisted` non e' un vezzo: `vi.mock` viene sollevata in cima al file e il
 * suo factory gira al primo import del modulo mockato, cioe' prima che una
 * `const` dichiarata qui sotto sia inizializzata. Senza, il factory leggerebbe
 * la variabile nella sua zona morta temporale.
 */
const { riduciMovimentoMock } = vi.hoisted(() => ({
  riduciMovimentoMock: vi.fn(() => false),
}));

vi.mock("../hooks/useMovimentoRidotto.ts", () => ({
  useMovimentoRidotto: () => riduciMovimentoMock(),
  default: () => riduciMovimentoMock(),
}));

function dichiaraPreferenzaMovimento(riduci: boolean) {
  riduciMovimentoMock.mockReturnValue(riduci);
}

const nodi: InfluenceGraphNode[] = [
  { id: "1", acct: "seed@mastodon.uno", followers: 900, is_ia: true, is_seed: true, activation_step: 0 },
  { id: "2", acct: "tizio@mastodon.uno", followers: 12, is_ia: false, is_seed: false, activation_step: 1 },
  { id: "3", acct: "caio@fosstodon.org", followers: 40, is_ia: false, is_seed: false, activation_step: 2 },
  { id: "4", acct: "sempronio@mas.to", followers: 3, is_ia: false, is_seed: false, activation_step: 3 },
];

const archi: InfluenceGraphLink[] = [
  { source: "1", target: "2", p_ic: 0.4, step: 1 },
  { source: "2", target: "3", p_ic: 0.2, step: 2 },
  { source: "3", target: "4", p_ic: 0.1, step: 3 },
];

function rendi() {
  return render(<InfluenceGraphCanvas nodes={nodi} links={archi} maxStep={3} />);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("InfluenceGraphCanvas", () => {
  it("espone i comandi della cascata con un nome, non con la sola icona", () => {
    dichiaraPreferenzaMovimento(false);
    rendi();

    expect(screen.getByRole("button", { name: "Torna al passo zero" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passo precedente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passo successivo" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Passo della cascata" })).toBeInTheDocument();
  });

  it("il comando di riproduzione dice cosa fa adesso, non che icona porta", () => {
    dichiaraPreferenzaMovimento(false);
    rendi();

    // In riproduzione il comando mette in pausa: se il nome descrivesse
    // l'icona ("pausa") sarebbe ambiguo su cosa succede premendolo.
    expect(screen.getByRole("button", { name: "Metti in pausa la cascata" })).toBeInTheDocument();
  });

  it("a movimento ridotto non parte da sola e mostra la cascata conclusa", () => {
    dichiaraPreferenzaMovimento(true);
    rendi();

    expect(screen.getByRole("button", { name: "Avvia la cascata" })).toBeInTheDocument();
    // L'ultimo passo, non il primo: fermarsi al passo zero mostrerebbe i soli
    // seed, cioe' il fotogramma che dice meno di tutti.
    expect(screen.getByRole("slider", { name: "Passo della cascata" })).toHaveValue("3");
    expect(screen.getByRole("button", { name: "Passo successivo" })).toBeDisabled();
  });

  it("il grafo ha un nome che dice quanto e' arrivata la cascata", () => {
    dichiaraPreferenzaMovimento(true);
    rendi();

    // Un canvas e' muto: senza questo nome il pezzo centrale del capitolo non
    // esiste per chi non lo vede.
    const grafo = screen.getByRole("img");
    expect(grafo).toHaveAccessibleName(/cascata di influenza al passo 3 di 3/i);
    expect(grafo).toHaveAccessibleName(/4 account raggiunti su 4/i);
    expect(grafo).toHaveAccessibleName(/100 per cento della rete/i);
  });

  it("a cascata ferma annuncia il passo raggiunto", () => {
    dichiaraPreferenzaMovimento(true);
    const { container } = rendi();

    const annuncio = container.querySelector('[aria-live="polite"]');
    expect(annuncio).toHaveTextContent("Passo 3 di 3");
    expect(annuncio).toHaveTextContent("4 account raggiunti");
  });

  it("in riproduzione tace, invece di annunciare un passo ogni mezzo secondo", () => {
    dichiaraPreferenzaMovimento(false);
    const { container } = rendi();

    // La regione esiste ma resta vuota: con la cascata che avanza da sola,
    // parlare a ogni passo sovrapporrebbe le frasi.
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent("");
  });
});
