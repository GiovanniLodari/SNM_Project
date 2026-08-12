import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { tokens } from "../theme.ts";

/**
 * Stati di pagina condivisi: caricamento, errore, risultato vuoto.
 *
 * Ogni pagina li riscriveva a mano, con esiti divergenti: alcune mostravano
 * l'errore in un riquadro rosso, altre in un semplice `<Typography color=
 * "error">`, altre ancora si limitavano a una console.error lasciando la
 * sezione vuota senza spiegazione.
 *
 * Fuori da qui restano gli `Skeleton`: imitano la disposizione specifica di
 * ciascuna pagina (griglie di card, tabelle, il riquadro del grafo), quindi
 * generalizzarli darebbe un segnale di caricamento peggiore di quello attuale.
 */

interface LoadingStateProps {
  /** Altezza dell'area centrata. Default 60vh, la misura usata dalle pagine. */
  height?: string | number;
  /** Diametro dello spinner: piu' piccolo quando sta dentro una tabella. */
  size?: number;
}

export function LoadingState({ height = "60vh", size }: LoadingStateProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height }}>
      <CircularProgress size={size} sx={{ color: tokens.color.nearBlack }} />
    </Box>
  );
}

interface ErrorStateProps {
  /** Messaggio da mostrare. Se e' null o vuoto il componente non rende nulla. */
  message?: string | null;
}

export function ErrorState({ message }: ErrorStateProps) {
  if (!message) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        mb: 4,
        borderRadius: tokens.radius.lg,
        borderColor: tokens.color.danger,
        backgroundColor: tokens.color.surfaceDanger,
      }}
    >
      <Typography variant="body2" sx={{ color: tokens.color.danger, fontWeight: 600 }}>
        {message}
      </Typography>
    </Paper>
  );
}

interface EmptyStateProps {
  /** Cosa manca e perche', in una frase. */
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 6,
        textAlign: "center",
        borderRadius: tokens.radius.lg,
        borderColor: tokens.color.border,
      }}
    >
      <Typography variant="body1" sx={{ color: tokens.color.textMuted }}>
        {message}
      </Typography>
    </Paper>
  );
}
