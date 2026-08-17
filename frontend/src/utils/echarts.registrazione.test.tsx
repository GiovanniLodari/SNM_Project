import { describe, expect, it, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import ReactECharts from "./echarts.tsx";

/**
 * Verifica che i moduli ECharts registrati in `echarts.tsx` bastino a disegnare
 * i due grafici dell'applicazione.
 *
 * Serve perche' il fallimento di una registrazione mancante e' silenzioso: la
 * libreria non lancia, scrive `Series sankey is used but not imported` in
 * console e lascia una tela vuota. Con la sola verifica di compilazione, un
 * `echarts.use` incompleto passerebbe il build, i test e la revisione, per poi
 * mostrare un riquadro nero in aula.
 *
 * Qui ECharts gira davvero: jsdom non ha un contesto 2D, quindi lo si fornisce
 * come stub. Non interessa cosa viene dipinto - interessa che il modello arrivi
 * in fondo a `setOption` senza lamentare un modulo assente.
 */

beforeAll(() => {
  // jsdom restituisce null da getContext: ECharts lo interpreta come ambiente
  // senza canvas e non arriva mai a validare la serie.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    canvas: document.createElement("canvas"),
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => undefined,
    setLineDash: () => undefined,
    getLineDash: () => [],
    setTransform: () => undefined,
    resetTransform: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    scale: () => undefined,
    rotate: () => undefined,
    translate: () => undefined,
    transform: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    bezierCurveTo: () => undefined,
    quadraticCurveTo: () => undefined,
    arc: () => undefined,
    arcTo: () => undefined,
    rect: () => undefined,
    ellipse: () => undefined,
    clip: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    fillRect: () => undefined,
    strokeRect: () => undefined,
    clearRect: () => undefined,
    fillText: () => undefined,
    strokeText: () => undefined,
    drawImage: () => undefined,
    isPointInPath: () => false,
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

/** Raccoglie gli avvisi di ECharts emessi durante il render. */
function catturaErroriConsole(disegna: () => void): string[] {
  const messaggi: string[] = [];
  const raccogli = (...args: unknown[]) => {
    messaggi.push(args.map(String).join(" "));
  };
  const errOrig = console.error;
  const warnOrig = console.warn;
  console.error = raccogli;
  console.warn = raccogli;
  try {
    disegna();
  } finally {
    console.error = errOrig;
    console.warn = warnOrig;
  }
  return messaggi;
}

/** Il messaggio che ECharts emette quando manca una `use()`. */
const REGISTRAZIONE_MANCANTE = /is used but not imported|not exists|Unknown series/i;

describe("registrazione ECharts", () => {
  it("disegna la serie sankey dei flussi di consenso", () => {
    const messaggi = catturaErroriConsole(() => {
      render(
        <ReactECharts
          style={{ height: 300, width: 500 }}
          opts={{ renderer: "canvas", width: 500, height: 300 }}
          option={{
            tooltip: { trigger: "item" },
            series: [
              {
                type: "sankey",
                data: [{ name: "FastDetectGPT" }, { name: "Unanime IA (4/4)" }],
                links: [{ source: "FastDetectGPT", target: "Unanime IA (4/4)", value: 12 }],
              },
            ],
          }}
        />,
      );
    });

    expect(messaggi.filter((m) => REGISTRAZIONE_MANCANTE.test(m))).toEqual([]);
  });

  it("disegna la serie graph del grafo di influenza, con legenda e tooltip", () => {
    const messaggi = catturaErroriConsole(() => {
      render(
        <ReactECharts
          style={{ height: 300, width: 500 }}
          opts={{ renderer: "canvas", width: 500, height: 300 }}
          option={{
            tooltip: { trigger: "item" },
            legend: { data: ["Bot", "Umano"] },
            series: [
              {
                type: "graph",
                layout: "force",
                roam: true,
                categories: [{ name: "Bot" }, { name: "Umano" }],
                data: [
                  { id: "1", name: "seed", symbolSize: 20, category: 0 },
                  { id: "2", name: "tizio", symbolSize: 10, category: 1 },
                ],
                links: [{ source: "1", target: "2" }],
                force: { repulsion: 220, edgeLength: 100, gravity: 0.1 },
                emphasis: { focus: "adjacency" },
              },
            ],
          }}
        />,
      );
    });

    expect(messaggi.filter((m) => REGISTRAZIONE_MANCANTE.test(m))).toEqual([]);
  });
});
