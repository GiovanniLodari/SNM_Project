import { Box, Grid, Typography } from "@mui/material";
import type { DetectorComparisonSummaryResponse } from "../../../api/client.ts";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

interface Props {
  report: DetectorComparisonSummaryResponse["comparison_report"] | undefined;
}

/**
 * Le quattro cifre che riassumono il consenso fra i rilevatori.
 *
 * Nessun valore di ripiego: dove il report non e' stato generato si scrive
 * "n/d". Un 0 inventato sarebbe indistinguibile da un 0 misurato, e su una
 * pagina che parla proprio di quanto ci si possa fidare dei numeri sarebbe la
 * contraddizione peggiore.
 */
export default function ConsensoKpi({ report }: Props) {
  const conteggi = report?.conteggio_ai;
  const idTotali = report?.id_totali;
  const stessaEtichetta = report?.accordo?.tutti_e_4_stessa_etichetta;

  const cifre = [
    {
      etichetta: "Campione condiviso",
      valore:
        report != null
          ? formatNumber(report.id_presenti_in_tutti_e_4 ?? report.id_totali)
          : "n/d",
      nota: "Post valutati da tutti e quattro i modelli",
      accento: tokens.color.nearBlack,
    },
    {
      etichetta: "Unanime IA (4/4)",
      valore: conteggi?.ai_per_tutti_e_4 != null ? formatNumber(conteggi.ai_per_tutti_e_4) : "n/d",
      nota: "Post che tutti e quattro marcano come generati",
      accento: tokens.color.purple,
    },
    {
      etichetta: "Maggioranza IA (3/4)",
      valore:
        conteggi?.ai_per_esattamente_3 != null
          ? formatNumber(conteggi.ai_per_esattamente_3)
          : "n/d",
      nota: "Tre modelli concordi, uno dissenziente",
      accento: tokens.color.deepGreen,
    },
    {
      etichetta: "Accordo sull'etichetta",
      valore:
        stessaEtichetta != null && idTotali
          ? `${((stessaEtichetta / idTotali) * 100).toFixed(1)}%`
          : "n/d",
      nota:
        stessaEtichetta != null
          ? `${formatNumber(stessaEtichetta)} post su cui i quattro danno la stessa risposta`
          : "Report di confronto non generato",
      accento: tokens.color.actionBlue,
    },
  ];

  return (
    <Grid container spacing={3}>
      {cifre.map((cifra) => (
        <Grid item xs={12} sm={6} md={3} key={cifra.etichetta}>
          <Box
            sx={{
              backgroundColor: tokens.color.softStone,
              borderRadius: tokens.radius.sm,
              p: 3,
              height: "100%",
              borderTop: `3px solid ${cifra.accento}`,
            }}
          >
            <EtichettaMono taglia="micro" colore={cifra.accento}>
              {cifra.etichetta}
            </EtichettaMono>
            <Typography
              sx={{
                fontFamily: tokens.font.display,
                fontSize: "32px",
                lineHeight: 1.2,
                letterSpacing: "-0.32px",
                color: cifra.accento,
                my: 1,
              }}
            >
              {cifra.valore}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontSize: "13px" }}>
              {cifra.nota}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
