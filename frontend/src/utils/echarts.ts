import * as echarts from "echarts/core";
import { GraphChart, SankeyChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import createEchartsComponent from "echarts-for-react/lib/core";

/**
 * Sorgente unica dell'istanza ECharts, con registrati **solo** i moduli che
 * questa applicazione disegna davvero.
 *
 * `import ReactECharts from "echarts-for-react"` tira dentro il bundle
 * completo di ECharts - tutti i tipi di serie, tutti i componenti, entrambi i
 * renderer - perche' l'entry point predefinito fa `import * as echarts from
 * "echarts"`. Misurato su questo progetto: 1.129 kB minificati (389 kB gzip)
 * in un chunk unico, per due soli grafici. Erano barre, mappe, calendari,
 * candlestick, il renderer SVG e il motore di coordinate geografiche che
 * nessuna pagina apre mai.
 *
 * Registrando a mano si paga solo cio' che si usa:
 *
 * - `GraphChart`   -> il grafo dei follow e la cascata (InfluenceGraphCanvas)
 * - `SankeyChart`  -> i flussi di consenso fra detector (DetectorSankeyChart)
 * - `TooltipComponent` / `LegendComponent` -> gli unici due componenti
 *   dichiarati nelle `option` dei due grafici
 * - `CanvasRenderer` -> entrambi i grafici passano `renderer: "canvas"`; il
 *   renderer SVG non e' mai richiesto
 *
 * **Chi aggiunge un grafico ECharts registra qui il modulo che gli serve.**
 * Se manca, ECharts non lancia un errore fatale: disegna una tela vuota e
 * scrive un avviso in console. E' il motivo per cui questo file esiste al
 * posto di quattro registrazioni sparse nei componenti - un grafico che non
 * appare, in un'interfaccia che deve dimostrare che i dati ci sono, e' il
 * difetto peggiore che si possa spedire.
 */
echarts.use([
  GraphChart,
  SankeyChart,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

/**
 * Sostituto di `echarts-for-react` con la stessa API (`option`, `style`,
 * `opts`, `onEvents`, ...), legato all'istanza ridotta qui sopra.
 */
export const ReactECharts = createEchartsComponent(echarts);

export default ReactECharts;
