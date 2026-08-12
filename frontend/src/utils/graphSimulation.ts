import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";

/**
 * Simulazione a forze per il grafo della dashboard.
 *
 * Sostituisce un integratore scritto a mano: la repulsione confrontava tutte
 * le coppie di nodi, quindi O(n^2), e il costo veniva contenuto ignorando le
 * coppie oltre i 220px - un rimedio che falsa il campo di forze invece di
 * approssimarlo. `forceManyBody` usa un quadtree (Barnes-Hut) e scende a
 * O(n log n) senza troncature, e `forceCollide` impedisce ai cerchi di
 * sovrapporsi, cosa che l'integratore precedente non faceva.
 *
 * Vive fuori dal componente per poter essere verificata senza montare un
 * canvas: e' la parte con piu' probabilita' di rompersi in silenzio.
 */

export interface NodoSimulato extends SimulationNodeDatum {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export interface ArcoSimulato {
  source: number;
  target: number;
}

export function creaSimulazione<N extends NodoSimulato>(): Simulation<N, ArcoSimulato> {
  return forceSimulation<N, ArcoSimulato>()
    .alphaDecay(0) // il grafo respira di continuo invece di congelarsi
    .velocityDecay(0.18)
    .stop(); // i tick li guida il loop rAF del componente
}

/**
 * Riconfigura la simulazione sull'insieme di nodi corrente.
 *
 * Va chiamata solo quando i nodi cambiano davvero: rifarlo a ogni fotogramma
 * azzererebbe il quadtree e il grafo sobbalzerebbe.
 */
export function configuraForze<N extends NodoSimulato>(
  sim: Simulation<N, ArcoSimulato>,
  nodi: N[],
  archi: ArcoSimulato[],
): void {
  sim.nodes(nodi);
  sim.force(
    "link",
    // Copie, non gli originali: forceLink sostituisce in place `source` e
    // `target` con i riferimenti ai nodi. Mutando gli archi di partenza, il
    // filtro che confronta gli id numerici a ogni fotogramma smetterebbe di
    // trovare corrispondenze e gli archi sparirebbero dopo il primo tick.
    forceLink<N, ArcoSimulato>(archi.map((a) => ({ ...a })))
      .id((d) => d.id)
      .distance(95)
      .strength(0.08),
  );
  sim.force("carica", forceManyBody<N>().strength(-160).distanceMax(320));
  sim.force("collisione", forceCollide<N>().radius((d) => d.radius + 6));
  sim.alpha(0.6);
}

/** Ricentra la simulazione: cambia col ridimensionamento del canvas. */
export function centraSimulazione<N extends NodoSimulato>(
  sim: Simulation<N, ArcoSimulato>,
  centroX: number,
  centroY: number,
): void {
  sim.force("centro", forceCenter<N>(centroX, centroY).strength(0.04));
}
