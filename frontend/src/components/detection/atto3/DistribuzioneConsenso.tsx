import { Box, Paper, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DetectorComparisonSummaryResponse } from "../../../api/client.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

interface Props {
  report: DetectorComparisonSummaryResponse["comparison_report"] | undefined;
}

/**
 * Quanti post ricevono zero, uno, due, tre o quattro voti "IA".
 *
 * Il grafico esiste per rendere visibile la forma della distribuzione: se i
 * post si accumulano agli estremi i quattro modelli sono sostanzialmente
 * d'accordo, se si accumulano al centro il corpus e' pieno di casi su cui non
 * esiste una risposta condivisa - ed e' quella la zona che il resto dell'atto
 * si occupa di esplorare.
 */
export default function DistribuzioneConsenso({ report }: Props) {
  const conteggi = report?.conteggio_ai;
  const idTotali = report?.id_totali;

  const dati = [
    { nome: "Unanime IA (4/4)", quanti: conteggi?.ai_per_tutti_e_4, colore: tokens.color.purple },
    {
      nome: "Maggioranza (3/4)",
      quanti: conteggi?.ai_per_esattamente_3,
      colore: tokens.color.deepGreen,
    },
    { nome: "Misto (2/4)", quanti: conteggi?.ai_per_esattamente_2, colore: tokens.color.coral },
    {
      nome: "Un solo modello (1/4)",
      quanti: conteggi?.ai_per_esattamente_1,
      colore: tokens.color.actionBlue,
    },
    {
      nome: "Unanime umano (0/4)",
      quanti: conteggi?.ai_per_nessuno,
      colore: tokens.color.textMuted,
    },
  ].filter((voce): voce is { nome: string; quanti: number; colore: string } =>
    typeof voce.quanti === "number",
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: tokens.radius.lg,
        p: 3.5,
        borderColor: tokens.color.border,
        height: "100%",
      }}
    >
      <Typography
        component="h3"
        sx={{ ...tokens.type.featureHeading, color: tokens.color.nearBlack, mb: 1 }}
      >
        Distribuzione del consenso
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 3 }}>
        {idTotali
          ? `Suddivisione dei ${formatNumber(idTotali)} post condivisi in base a quanti modelli, su quattro, li classificano come IA.`
          : "Suddivisione dei post in base a quanti modelli, su quattro, li classificano come IA."}
      </Typography>

      <Box sx={{ width: "100%", height: 320 }}>
        {dati.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dati}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" tickFormatter={(valore) => `${(valore / 1000).toFixed(0)}k`} />
              <YAxis dataKey="nome" type="category" width={140} style={{ fontSize: "12px" }} />
              <RechartsTooltip formatter={(valore) => [formatNumber(Number(valore)), "Post"]} />
              <Bar dataKey="quanti" radius={[0, 8, 8, 0]}>
                {dati.map((voce) => (
                  <Cell key={voce.nome} fill={voce.colore} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
              Consenso non disponibile: il report di confronto fra rilevatori non e&#39; stato
              generato.
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
