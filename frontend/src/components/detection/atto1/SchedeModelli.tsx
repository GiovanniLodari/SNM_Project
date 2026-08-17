import { Box, Chip, Grid, Skeleton, Typography } from "@mui/material";
import type { DetectorModelInfo } from "../../../api/client.ts";
import { MODELLI, PREMESSA_ATTO_I } from "../detectionContent.ts";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

interface Props {
  /** Conteggi per modello dal backend. Assenti finche' la summary non risponde. */
  conteggi?: readonly DetectorModelInfo[];
}

/**
 * Le quattro schede dei rilevatori (DESIGN.md, `product-card`).
 *
 * Aprono il capitolo perche' senza sapere che due dei quattro metodi misurano
 * la stessa cosa in due modi, e che uno solo e' addestrato su esempi
 * etichettati, i disaccordi dell'Atto III sembrano rumore invece che una
 * conseguenza prevedibile del metodo.
 */
export default function SchedeModelli({ conteggi }: Props) {
  return (
    <Box>
      <Typography
        sx={{ ...tokens.type.bodyLarge, color: tokens.color.textMuted, maxWidth: "68ch", mb: 4 }}
      >
        {PREMESSA_ATTO_I}
      </Typography>

      <Grid container spacing={3}>
        {MODELLI.map((modello) => {
          // Il backend nomina i modelli con le proprie chiavi: l'accostamento
          // passa da `id` cosi' il registro resta l'unica anagrafe.
          const dati = conteggi?.find((m) => m.id === modello.idIndagine || m.id === modello.id);

          return (
            <Grid item xs={12} sm={6} lg={3} key={modello.id}>
              <Box
                sx={{
                  backgroundColor: tokens.color.softStone,
                  borderRadius: tokens.radius.sm,
                  p: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Chip
                  label={modello.tipo}
                  size="small"
                  sx={{
                    alignSelf: "flex-start",
                    backgroundColor: "transparent",
                    border: `1px solid ${modello.accento}`,
                    color: modello.accento,
                    fontFamily: tokens.font.mono,
                    fontSize: "11px",
                    fontWeight: 500,
                    mb: 2,
                  }}
                />

                <Typography
                  component="h3"
                  sx={{ ...tokens.type.featureHeading, color: tokens.color.nearBlack }}
                >
                  {modello.nome}
                </Typography>
                <EtichettaMono taglia="micro" sx={{ mt: 0.5, mb: 2 }}>
                  {modello.famiglia}
                </EtichettaMono>

                <Typography
                  variant="body2"
                  sx={{ color: tokens.color.textMuted, lineHeight: 1.5, flexGrow: 1, mb: 3 }}
                >
                  {modello.descrizione}
                </Typography>

                {/* Filetto e non un bordo pieno: DESIGN.md separa le due meta'
                    della product-card con una regola sola. */}
                <Box sx={{ borderTop: `1px solid ${tokens.color.borderStrong}`, pt: 2 }}>
                  {dati ? (
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <EtichettaMono taglia="micro">Post valutati</EtichettaMono>
                        <Typography
                          sx={{
                            fontFamily: tokens.font.display,
                            fontSize: "18px",
                            color: tokens.color.nearBlack,
                            mt: 0.5,
                          }}
                        >
                          {formatNumber(dati.scored_count)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <EtichettaMono taglia="micro">Marcati IA</EtichettaMono>
                        <Typography
                          sx={{
                            fontFamily: tokens.font.display,
                            fontSize: "18px",
                            color: modello.accento,
                            mt: 0.5,
                          }}
                        >
                          {dati.ai_percentage != null ? `${dati.ai_percentage}%` : "n/d"}
                        </Typography>
                      </Grid>
                    </Grid>
                  ) : (
                    <Skeleton variant="text" width="70%" height={28} />
                  )}
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
