import { describe, expect, it } from "vitest";
import {
  centraSimulazione,
  configuraForze,
  creaSimulazione,
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
    centraSimulazione(sim, 400, 300);

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
    centraSimulazione(sim, 200, 200);
    for (let i = 0; i < 300; i++) sim.tick();

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
    centraSimulazione(sim, 200, 200);
    for (let i = 0; i < 100; i++) sim.tick();

    // Il nodo trascinato non deve essere trascinato via dalle forze.
    expect(bloccato.x).toBe(500);
    expect(bloccato.y).toBe(500);
  });
});
