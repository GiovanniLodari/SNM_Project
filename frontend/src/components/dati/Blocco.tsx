import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import EtichettaMono from "../narrativa/EtichettaMono.tsx";
import { tokens } from "../../theme.ts";

interface Props {
  /** Etichetta mono sopra il titolo, es. "DISTRIBUZIONE". */
  occhiello?: string;
  titolo: string;
  /** Una o due frasi che dicono come va letto il contenuto. */
  descrizione?: string;
  /** Controllo allineato al titolo: un filtro, un bottone, un menu. */
  azione?: ReactNode;
  children: ReactNode;
}

/**
 * Riquadro chiaro con intestazione: l'unita' di contenuto dentro un atto.
 *
 * Era scritto a mano in ogni sezione - `Paper` con padding 3 o 4, raggio ora
 * `lg` ora `xl`, titolo ora `h6` ora `featureHeading` - e la differenza si
 * vedeva mettendo due blocchi affiancati. Qui la cornice si dichiara una volta
 * e le pagine portano solo il contenuto.
 */
export default function Blocco({ occhiello, titolo, descrizione, azione, children }: Props) {
  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: tokens.radius.xl,
        border: tokens.border.subtle,
        backgroundColor: tokens.color.canvas,
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: descrizione ? 1 : 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {occhiello && <EtichettaMono taglia="micro" sx={{ mb: 1 }}>{occhiello}</EtichettaMono>}
          <Typography
            component="h3"
            sx={{ ...tokens.type.featureHeading, color: tokens.color.nearBlack }}
          >
            {titolo}
          </Typography>
        </Box>
        {azione && <Box sx={{ flexShrink: 0 }}>{azione}</Box>}
      </Box>

      {descrizione && (
        <Typography
          variant="body2"
          sx={{ color: tokens.color.textMuted, mb: 3, maxWidth: "70ch", lineHeight: 1.6 }}
        >
          {descrizione}
        </Typography>
      )}

      {children}
    </Box>
  );
}
