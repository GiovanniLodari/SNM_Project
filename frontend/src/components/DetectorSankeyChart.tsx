import ReactECharts from "echarts-for-react";
import { Box, Paper, Typography } from "@mui/material";
import { tokens } from "../theme.ts";

/**
 * Flussi di consenso fra i quattro detector, come diagramma Sankey.
 *
 * Ogni banda va da un detector alla fascia di consenso dei post che quel
 * detector ha etichettato come IA: la fascia dice quanti detector, in totale,
 * hanno votato IA sullo stesso post.
 *
 * Il componente aveva un `defaultSankeyData` con valori scritti a mano, e il
 * chiamante non passava props: quel default non era un ripiego, era l'unica
 * cosa che il grafico mostrasse. I conteggi arrivano ora da
 * `comparison_report.flussi_consenso`, calcolato in webapp/results.py.
 *
 * Il render usa ECharts, gia' presente per il grafo di influenza, al posto di
 * Nivo che serviva solo qui.
 */

/** Conteggi per fascia di consenso, indicizzati per numero di voti IA. */
export type FlussiConsenso = Record<string, Record<string, number>>;

interface DetectorSankeyChartProps {
  flussi?: FlussiConsenso | null;
}

const ETICHETTE_DETECTOR: Record<string, string> = {
  gpt: "FastDetectGPT",
  bino: "Binoculars",
  desk: "Desklib AI",
  ada: "AdaDetectGPT",
};

const COLORI_DETECTOR: Record<string, string> = {
  gpt: tokens.color.nearBlack,
  bino: tokens.color.coral,
  desk: tokens.color.deepGreen,
  ada: tokens.color.actionBlue,
};

const FASCE: { voti: string; etichetta: string; colore: string }[] = [
  { voti: "4", etichetta: "Unanime IA (4/4)", colore: tokens.color.purple },
  { voti: "3", etichetta: "Maggioranza IA (3/4)", colore: tokens.color.deepGreen },
  { voti: "2", etichetta: "Misto IA (2/4)", colore: tokens.color.coral },
  { voti: "1", etichetta: "Un solo detector (1/4)", colore: tokens.color.actionBlue },
];

export function DetectorSankeyChart({ flussi }: DetectorSankeyChartProps) {
  const links = flussi
    ? Object.entries(flussi).flatMap(([detector, perFascia]) =>
        FASCE.filter((f) => (perFascia?.[f.voti] ?? 0) > 0).map((f) => ({
          source: ETICHETTE_DETECTOR[detector] ?? detector,
          target: f.etichetta,
          value: perFascia[f.voti],
        })),
      )
    : [];

  const nodiUsati = new Set(links.flatMap((l) => [l.source, l.target]));
  const nodes = [
    ...Object.entries(ETICHETTE_DETECTOR).map(([id, name]) => ({
      name,
      itemStyle: { color: COLORI_DETECTOR[id] },
    })),
    ...FASCE.map((f) => ({ name: f.etichetta, itemStyle: { color: f.colore } })),
  ].filter((n) => nodiUsati.has(n.name));

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3.5,
        borderRadius: tokens.radius.xl,
        border: tokens.border.subtle,
        backgroundColor: tokens.color.canvas,
        height: 480,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 600,
            fontSize: "20px",
            color: tokens.color.nearBlack,
          }}
        >
          Flussi di Consenso fra i Detector
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
          Ogni banda collega un detector alla fascia di consenso dei post che ha
          etichettato come IA.
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {links.length > 0 ? (
          <ReactECharts
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            option={{
              tooltip: { trigger: "item", triggerOn: "mousemove" },
              series: [
                {
                  type: "sankey",
                  data: nodes,
                  links,
                  emphasis: { focus: "adjacency" },
                  label: { fontFamily: tokens.font.body, fontSize: 12 },
                  lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.35 },
                },
              ],
            }}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 3,
            }}
          >
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, textAlign: "center" }}>
              Flussi non disponibili: il report di confronto fra detector non e'
              stato generato.
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
