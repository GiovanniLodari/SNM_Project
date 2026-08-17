import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import type { DetectorComparisonSummaryResponse } from "../../../api/client.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

type ChiaveCoppia = "bino-gpt" | "bino-desk" | "bino-ada" | "desk-gpt" | "desk-ada" | "gpt-ada";

/**
 * Le sei coppie possibili fra quattro rilevatori. L'ordine non e' casuale: le
 * due varianti di perturba-curvatura, che sono la coppia piu' affine, chiudono
 * l'elenco, cosi' il salto di percentuale rispetto alle coppie miste si legge
 * come un progressivo e non come un dato isolato.
 */
const COPPIE: ReadonlyArray<{ chiave: ChiaveCoppia; etichetta: string; nota?: string }> = [
  { chiave: "bino-gpt", etichetta: "Binoculars ↔ FastDetectGPT" },
  { chiave: "bino-desk", etichetta: "Binoculars ↔ Desklib" },
  { chiave: "desk-gpt", etichetta: "Desklib ↔ FastDetectGPT" },
  { chiave: "bino-ada", etichetta: "Binoculars ↔ AdaDetectGPT" },
  { chiave: "desk-ada", etichetta: "Desklib ↔ AdaDetectGPT" },
  {
    chiave: "gpt-ada",
    etichetta: "FastDetectGPT ↔ AdaDetectGPT",
    nota: "Due varianti dello stesso metodo: l'accordo alto e' atteso, non e' una conferma indipendente.",
  },
];

interface Props {
  report: DetectorComparisonSummaryResponse["comparison_report"] | undefined;
}

/**
 * Quanto spesso ciascuna coppia di rilevatori arriva alla stessa etichetta.
 *
 * E' la misura che smonta l'idea di "quattro pareri indipendenti": due dei
 * quattro condividono il metodo, e la loro concordanza dice piu' sulla
 * parentela degli algoritmi che sulla natura del testo.
 */
export default function AccordoCoppie({ report }: Props) {
  const coppie = report?.accordo?.coppie;
  const idTotali = report?.id_totali;

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
        Accordo a coppie
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 3 }}>
        Percentuale di post su cui i due modelli danno la stessa etichetta, con soglia 0,5.
      </Typography>

      <Stack spacing={2}>
        {COPPIE.map((coppia) => {
          const concordi = coppie?.[coppia.chiave];
          const percentuale =
            typeof concordi === "number" && idTotali
              ? `${((concordi / idTotali) * 100).toFixed(1)}%`
              : null;

          return (
            <Box
              key={coppia.chiave}
              sx={{
                py: 2,
                borderTop: tokens.border.subtle,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
                  {coppia.etichetta}
                </Typography>
                <Chip
                  label={percentuale ?? "n/d"}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    fontFamily: tokens.font.mono,
                    fontWeight: 600,
                    backgroundColor: percentuale ? tokens.color.nearBlack : tokens.color.softStone,
                    color: percentuale ? tokens.color.canvas : tokens.color.textMuted,
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                {typeof concordi === "number"
                  ? `${formatNumber(concordi)} post concordi.${coppia.nota ? ` ${coppia.nota}` : ""}`
                  : "Dato non disponibile: report di confronto non generato."}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
