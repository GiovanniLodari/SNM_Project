import { describe, expect, it } from "vitest";
import {
  PAD_CANVAS,
  centraSimulazione,
  configuraForze,
  creaSimulazione,
  riscaldaSimulazione,
  simulazioneFerma,
  type ArcoSimulato,
  type NodoSimulato,
} from "./graphSimulation.ts";

const nodi = (n: number): NodoSimulato[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i,
    x: 100 + i * 3,
    y: 100 + i * 2,
    radius: 9,
  }));

const catena = (n: number): ArcoSimulato[] =>
  Array.from({ length: n - 1 }, (_, i) => ({ source: i, target: i + 1 }));

/** Fa girare la simulazione fino all'assestamento. Ritorna i tick impiegati. */
const assesta = (
  sim: ReturnType<typeof creaSimulazione>,
  maxTick = 2000,
): number => {
  let t = 0;
  while (!simulazioneFerma(sim) && t < maxTick) {
    sim.tick();
    t++;
  }
  return t;
};

describe("configuraForze", () => {
  it("non muta gli archi ricevuti", () => {
    // Il difetto piu' insidioso di forceLink: sostituisce `source` e `target`
    // in place con i riferimenti ai nodi. Il componente filtra gli archi
    // visibili confrontando id numerici a ogni fotogramma, quindi una mutazione
    // qui farebbe sparire tutti gli archi dopo il primo tick - senza errori,
    // solo un grafo di punti sconnessi.
    const archi = catena(5);
    const sim = creaSimulazione();
    configuraForze(sim, nodi(5), archi);
    sim.tick();

    for (const arco of archi) {
      expect(typeof arco.source).toBe("number");
      expect(typeof arco.target).toBe("number");
    }
  });

  it("produce coordinate finite dopo molti tick", () => {
    // Una configurazione di forze sbagliata diverge verso l'infinito o NaN, e
    // il canvas smette semplicemente di disegnare.
    const listaNodi = nodi(30);
    const sim = creaSimulazione();
    configuraForze(sim, listaNodi, catena(30));
    centraSimulazione(sim, 800, 600);

    for (let i = 0; i < 300; i++) sim.tick();

    for (const n of listaNodi) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it("separa i nodi invece di lasciarli sovrapposti", () => {
    // forceCollide e' l'aggiunta rispetto all'integratore precedente, che
    // lasciava accavallare i cerchi piu' grandi.
    const listaNodi = nodi(20);
    // Tutti nello stesso punto: il caso peggiore per la separazione.
    for (const n of listaNodi) {
      n.x = 200;
      n.y = 200;
    }

    const sim = creaSimulazione();
    configuraForze(sim, listaNodi, []);
    centraSimulazione(sim, 400, 400);
    assesta(sim);

    let sovrapposte = 0;
    for (let i = 0; i < listaNodi.length; i++) {
      for (let j = i + 1; j < listaNodi.length; j++) {
        const dx = listaNodi[i].x - listaNodi[j].x;
        const dy = listaNodi[i].y - listaNodi[j].y;
        if (Math.hypot(dx, dy) < listaNodi[i].radius) sovrapposte++;
      }
    }
    expect(sovrapposte).toBe(0);
  });

  it("rispetta il vincolo fx/fy usato dal trascinamento", () => {
    const listaNodi = nodi(10);
    const bloccato = listaNodi[0];
    bloccato.fx = 500;
    bloccato.fy = 500;

    const sim = creaSimulazione();
    configuraForze(sim, listaNodi, catena(10));
    centraSimulazione(sim, 400, 400);
    for (let i = 0; i < 100; i++) sim.tick();

    // Il nodo trascinato non deve essere trascinato via dalle forze.
    expect(bloccato.x).toBe(500);
    expect(bloccato.y).toBe(500);
  });
});

describe("contenimento nel canvas", () => {
  // La regressione da cui nasce questo blocco: `forceCenter` trasla il
  // baricentro dell'insieme, non attira i singoli nodi. Senza una vera molla
  // per-nodo verso il centro, `forceManyBody` allarga il grafo finche' tutti i
  // nodi finiscono contro i bordi del canvas, dove il clamp li incolla.
  const LARGHEZZA = 700;
  const ALTEZZA = 440;

  /** Meta' nodi in catena, meta' isolati: gli isolati sono i primi a scappare. */
  const scenario = (n: number) => {
    const listaNodi = nodi(n);
    for (const nodo of listaNodi) {
      nodo.x = LARGHEZZA / 2 + (Math.random() - 0.5) * 120;
      nodo.y = ALTEZZA / 2 + (Math.random() - 0.5) * 120;
    }
    return { listaNodi, archi: catena(Math.floor(n / 2)) };
  };

  it.each([10, 30, 60, 80])("tiene %i nodi dentro i bordi", (n) => {
    const { listaNodi, archi } = scenario(n);
    const sim = creaSimulazione();
    configuraForze(sim, listaNodi, archi);
    centraSimulazione(sim, LARGHEZZA, ALTEZZA);
    assesta(sim);

    const fuori = listaNodi.filter(
      (nodo) =>
        nodo.x < PAD_CANVAS ||
        nodo.x > LARGHEZZA - PAD_CANVAS ||
        nodo.y < PAD_CANVAS ||
        nodo.y > ALTEZZA - PAD_CANVAS,
    );

    expect(fuori.map((nodo) => nodo.id)).toEqual([]);
  });

  it("adatta la disposizione a canvas di proporzioni diverse", () => {
    // La gravita' e' anisotropa: un canvas largo e basso deve stringere in
    // verticale piu' che in orizzontale, altrimenti o sfora in altezza o
    // spreca la larghezza.
    for (const [larghezza, altezza] of [
      [1200, 700],
      [420, 440],
    ] as const) {
      const listaNodi = nodi(40);
      for (const nodo of listaNodi) {
        nodo.x = larghezza / 2 + (Math.random() - 0.5) * 80;
        nodo.y = altezza / 2 + (Math.random() - 0.5) * 80;
      }

      const sim = creaSimulazione();
      configuraForze(sim, listaNodi, catena(20));
      centraSimulazione(sim, larghezza, altezza);
      assesta(sim);

      const fuori = listaNodi.filter(
        (nodo) =>
          nodo.x < PAD_CANVAS ||
          nodo.x > larghezza - PAD_CANVAS ||
          nodo.y < PAD_CANVAS ||
          nodo.y > altezza - PAD_CANVAS,
      );

      expect({ larghezza, altezza, fuori: fuori.length }).toEqual({
        larghezza,
        altezza,
        fuori: 0,
      });
    }
  });
});

describe("assestamento e riscaldamento", () => {
  it("si ferma invece di agitarsi all'infinito", () => {
    // Con alphaDecay(0) la simulazione restava calda per sempre: la rete non si
    // assestava mai e il loop rAF continuava a calcolare forze a vuoto.
    const listaNodi = nodi(40);
    const sim = creaSimulazione();
    configuraForze(sim, listaNodi, catena(40));
    centraSimulazione(sim, 700, 440);

    const tick = assesta(sim, 800);

    expect(simulazioneFerma(sim)).toBe(true);
    expect(tick).toBeLessThan(800);
  });

  it("riparte quando la si riscalda", () => {
    // Serve all'arrivo di nodi nuovi e al rilascio dopo un trascinamento: senza,
    // una rete ormai ferma non si riassesterebbe piu'.
    const sim = creaSimulazione();
    configuraForze(sim, nodi(20), catena(20));
    centraSimulazione(sim, 700, 440);
    assesta(sim);
    expect(simulazioneFerma(sim)).toBe(true);

    riscaldaSimulazione(sim);

    expect(simulazioneFerma(sim)).toBe(false);
  });

  it("dopo il riscaldamento torna a fermarsi", () => {
    const sim = creaSimulazione();
    configuraForze(sim, nodi(20), catena(20));
    centraSimulazione(sim, 700, 440);
    assesta(sim);

    riscaldaSimulazione(sim);
    assesta(sim, 800);

    expect(simulazioneFerma(sim)).toBe(true);
  });
});

describe("centraSimulazione", () => {
  it("non rialloca le forze quando le dimensioni non cambiano", () => {
    // Il loop rAF la chiama a ogni fotogramma: ricostruire le forze 60 volte al
    // secondo e' spreco puro, e reinizializza la simulazione ogni volta.
    const sim = creaSimulazione();
    configuraForze(sim, nodi(10), catena(10));

    centraSimulazione(sim, 700, 440);
    const gravX = sim.force("gravX");
    const gravY = sim.force("gravY");

    centraSimulazione(sim, 700, 440);

    expect(sim.force("gravX")).toBe(gravX);
    expect(sim.force("gravY")).toBe(gravY);
  });

  it("sposta il baricentro quando il canvas cambia dimensione", () => {
    // Succede col toggle fullscreen, che porta il canvas da 440px a 75vh.
    const listaNodi = nodi(20);
    const sim = creaSimulazione();
    configuraForze(sim, listaNodi, catena(20));
    centraSimulazione(sim, 400, 400);
    assesta(sim);

    const mediaYPrima =
      listaNodi.reduce((acc, n) => acc + n.y, 0) / listaNodi.length;

    centraSimulazione(sim, 400, 800);
    riscaldaSimulazione(sim, 0.9);
    assesta(sim);

    const mediaYDopo =
      listaNodi.reduce((acc, n) => acc + n.y, 0) / listaNodi.length;

    expect(mediaYPrima).toBeLessThan(300);
    expect(mediaYDopo).toBeGreaterThan(300);
  });
});
