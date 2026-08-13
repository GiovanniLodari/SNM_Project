import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
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

/** Margine tenuto libero lungo i bordi del canvas. */
export const PAD_CANVAS = 24;

/**
 * Costante della gravita' verso il centro, calibrata sperimentalmente.
 *
 * La forza necessaria a trattenere il grafo scala con l'inverso del quadrato
 * della semi-ampiezza disponibile: `K / semiAsse^2`. Il valore viene da una
 * taratura su canvas da 340x300 a 1200x700 con 10-80 nodi.
 */
const K_GRAVITA = 5300;

/** Estremi entro cui la gravita' resta utile: sotto non trattiene, sopra schiaccia. */
const GRAVITA_MIN = 0.02;
const GRAVITA_MAX = 0.4;

/** Quanto si riscalda la simulazione quando arrivano nodi nuovi o si trascina. */
export const ALPHA_RISCALDAMENTO = 0.3;

/** Quanto si riscalda su una riconfigurazione piena (grafo nuovo). */
const ALPHA_CONFIGURAZIONE = 0.9;

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

/**
 * Ultime dimensioni applicate a ciascuna simulazione.
 *
 * Serve a rendere `centraSimulazione` idempotente: il loop rAF la chiama a
 * ogni fotogramma, e ricostruire le forze 60 volte al secondo reinizializza
 * la simulazione di continuo per nulla.
 */
const dimensioniApplicate = new WeakMap<
  Simulation<never, never>,
  { larghezza: number; altezza: number }
>();

export function creaSimulazione<N extends NodoSimulato>(): Simulation<N, ArcoSimulato> {
  return (
    forceSimulation<N, ArcoSimulato>()
      // La simulazione si raffredda e si ferma. Con alphaDecay(0) restava calda
      // per sempre: la rete non si assestava mai e il loop continuava a
      // calcolare forze a vuoto. Si riparte con `riscaldaSimulazione`.
      .alphaDecay(0.02)
      .velocityDecay(0.35)
      .stop() // i tick li guida il loop rAF del componente
  );
}

/**
 * Riconfigura la simulazione sull'insieme di nodi corrente.
 *
 * Va chiamata solo quando l'insieme dei nodi cambia davvero: rifarlo a ogni
 * fotogramma azzererebbe il quadtree e il grafo sobbalzerebbe.
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
      .distance(70)
      .strength(0.35),
  );
  sim.force("carica", forceManyBody<N>().strength(-90).distanceMax(260));
  sim.force("collisione", forceCollide<N>().radius((d) => d.radius + 4));
  sim.alpha(ALPHA_CONFIGURAZIONE);
}

/** Gravita' necessaria a trattenere il grafo entro una data semi-ampiezza. */
function gravitaPerSemiAsse(semiAsse: number): number {
  const utile = Math.max(1, semiAsse);
  return Math.min(GRAVITA_MAX, Math.max(GRAVITA_MIN, K_GRAVITA / (utile * utile)));
}

/**
 * Ancora il grafo al centro del canvas.
 *
 * Usa `forceX`/`forceY` e non `forceCenter`: quest'ultima *trasla* il
 * baricentro dell'insieme e non attira i singoli nodi, quindi non limita in
 * alcun modo l'estensione del grafo. Senza una molla per-nodo, `forceManyBody`
 * allargava la rete finche' ogni nodo finiva contro i bordi del canvas.
 *
 * La gravita' e' anisotropa perche' il canvas non e' quadrato: un riquadro
 * largo e basso deve stringere in verticale piu' che in orizzontale, altrimenti
 * o sfora in altezza o spreca la larghezza.
 */
export function centraSimulazione<N extends NodoSimulato>(
  sim: Simulation<N, ArcoSimulato>,
  larghezza: number,
  altezza: number,
): void {
  const chiave = sim as unknown as Simulation<never, never>;
  const precedenti = dimensioniApplicate.get(chiave);
  const giaApplicate =
    precedenti?.larghezza === larghezza && precedenti?.altezza === altezza;

  if (giaApplicate && sim.force("gravX") && sim.force("gravY")) return;

  const centroX = larghezza / 2;
  const centroY = altezza / 2;
  const forzaX = gravitaPerSemiAsse(centroX - PAD_CANVAS);
  const forzaY = gravitaPerSemiAsse(centroY - PAD_CANVAS);

  // Se le forze esistono gia' si aggiornano in place: gli accessori di d3
  // reinizializzano da soli le cache interne, e l'istanza resta la stessa.
  const gravX = sim.force<ReturnType<typeof forceX<N>>>("gravX");
  const gravY = sim.force<ReturnType<typeof forceY<N>>>("gravY");

  if (gravX) {
    gravX.x(centroX).strength(forzaX);
  } else {
    sim.force("gravX", forceX<N>(centroX).strength(forzaX));
  }

  if (gravY) {
    gravY.y(centroY).strength(forzaY);
  } else {
    sim.force("gravY", forceY<N>(centroY).strength(forzaY));
  }

  dimensioniApplicate.set(chiave, { larghezza, altezza });
}

/**
 * Rimette in moto una simulazione ormai ferma.
 *
 * Serve all'arrivo di nodi nuovi, al trascinamento e al cambio di dimensione
 * del canvas. Non raffredda mai: se la simulazione e' gia' piu' calda del
 * valore richiesto, resta com'e'.
 */
export function riscaldaSimulazione<N extends NodoSimulato>(
  sim: Simulation<N, ArcoSimulato>,
  alpha: number = ALPHA_RISCALDAMENTO,
): void {
  if (sim.alpha() < alpha) sim.alpha(alpha);
}

/** Vero quando la rete si e' assestata e non serve piu' calcolare forze. */
export function simulazioneFerma<N extends NodoSimulato>(
  sim: Simulation<N, ArcoSimulato>,
): boolean {
  return sim.alpha() <= sim.alphaMin();
}
