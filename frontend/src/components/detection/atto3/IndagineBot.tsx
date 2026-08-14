import { Box, Grid, Paper, Typography } from "@mui/material";
import type { DetectorComparisonSummaryResponse } from "../../../api/client.ts";
import { ESITO_ATTO_III, MODELLI } from "../detectionContent.ts";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

interface Props {
  indagine: DetectorComparisonSummaryResponse["bot_investigation"];
}

/**
 * Cosa rilevano i quattro modelli sui post di account che si dichiarano
 * automatizzati.
 *
 * E' il controllo che rende interpretabile tutto il resto dell'atto: i post dei
 * bot sono l'unico sottoinsieme del corpus di cui si conosca qualcosa di
 * verificabile dall'esterno - i metadati delle API Mastodon - e proprio li' i
 * quattro modelli divergono di piu'. La divergenza ha una spiegazione, ed e'
 * scritta sotto le cifre invece di essere lasciata al lettore.
 */
export default function IndagineBot({ indagine }: Props) {
  const totale = indagine ? indagine.total_bot_statuses + indagine.total_human_statuses : 0;
  const quota =
    indagine && totale > 0 ? ((indagine.total_bot_statuses / totale) * 100).toFixed(1) : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: tokens.radius.xl,
        p: 4,
        borderColor: tokens.color.border,
        backgroundColor: tokens.color.surfaceWarm,
      }}
    >
      <EtichettaMono sx={{ mb: 2 }}>Controllo sui metadati</EtichettaMono>

      <Typography
        component="h3"
        sx={{ ...tokens.type.cardHeading, color: tokens.color.nearBlack, mb: 2, maxWidth: "26ch" }}
      >
        Un account automatizzato scrive testo automatico?
      </Typography>

      <Typography
        sx={{ ...tokens.type.bodyLarge, color: tokens.color.textMuted, maxWidth: "70ch", mb: 4 }}
      >
        {indagine
          ? `Il ${quota ?? "—"}% dei post del corpus proviene da account che dichiarano di essere ` +
            `automatizzati (bot = true), ${formatNumber(indagine.total_bot_statuses)} in tutto. ` +
            `Ecco quanti di quei post ciascun modello marca come generati da IA.`
          : "Conteggio dei post da account bot non disponibile: il database non e' raggiungibile."}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {MODELLI.map((modello) => {
          const stats = indagine?.models?.[modello.idIndagine];
          return (
            <Grid item xs={12} sm={6} md={3} key={modello.id}>
              <Box
                sx={{
                  p: 2.5,
                  height: "100%",
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.color.canvas,
                  border: tokens.border.subtle,
                }}
              >
                <EtichettaMono taglia="micro" colore={modello.accento}>
                  {modello.nome}
                </EtichettaMono>
                <Typography
                  sx={{
                    fontFamily: tokens.font.display,
                    fontSize: "32px",
                    lineHeight: 1.2,
                    letterSpacing: "-0.32px",
                    color: modello.accento,
                    my: 1,
                  }}
                >
                  {stats?.ai_percentage != null ? `${stats.ai_percentage}%` : "n/d"}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  {stats && stats.scored > 0
                    ? `${formatNumber(stats.ai_count)} su ${formatNumber(stats.scored)} post bot valutati · ${modello.tipo.toLowerCase()}`
                    : "Nessun post di account bot valutato da questo modello."}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Box
        sx={{
          p: 3,
          borderRadius: tokens.radius.sm,
          backgroundColor: tokens.color.softStone,
        }}
      >
        <EtichettaMono taglia="micro" sx={{ mb: 1 }}>
          Come si legge
        </EtichettaMono>
        <Typography variant="body2" sx={{ color: tokens.color.textPrimary, lineHeight: 1.6 }}>
          {ESITO_ATTO_III}
        </Typography>
      </Box>
    </Paper>
  );
}
