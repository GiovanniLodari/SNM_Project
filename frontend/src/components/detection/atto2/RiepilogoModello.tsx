import { Box, Button, Grid, LinearProgress, Typography } from "@mui/material";
import { Analytics as AnalyticsIcon } from "@mui/icons-material";
import type { AiDetectionResponse } from "../../../api/client.ts";
import type { Modello } from "../detectionContent.ts";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

interface Props {
  dati: AiDetectionResponse;
  modello: Modello;
  onApriStatistiche: () => void;
}

/**
 * Riepilogo del modello scelto: quanti post ha valutato, con che soglia, e come
 * si distribuiscono le probabilita' che ha assegnato.
 *
 * Riepilogo e istogramma stanno affiancati perche' il primo senza il secondo
 * non dice nulla: "34.000 post valutati" e' compatibile sia con una nuvola
 * schiacciata sullo zero sia con una spaccata a meta', e sono due situazioni
 * opposte.
 */
export default function RiepilogoModello({ dati, modello, onApriStatistiche }: Props) {
  const massimoIstogramma = Math.max(...Object.values(dati.histogram), 1);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={4}>
        <Box
          sx={{
            p: 4,
            borderRadius: tokens.radius.xl,
            backgroundColor: tokens.color.softStone,
            height: "100%",
          }}
        >
          <EtichettaMono sx={{ mb: 2 }}>Post valutati</EtichettaMono>

          <Typography sx={{ ...tokens.type.numeroGrande, color: tokens.color.nearBlack, mb: 2 }}>
            {formatNumber(dati.done)}
          </Typography>

          <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
            Su <strong>{formatNumber(dati.eligible)}</strong> post in lingua inglese idonei
            all&#39;analisi.
          </Typography>

          <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 2, mb: 3 }}>
            Un post e&#39; marcato come IA da {modello.nome} quando la probabilita&#39; assegnata
            raggiunge {Math.round(dati.ai_threshold * 100)}%.
          </Typography>

          <Button
            variant="contained"
            startIcon={<AnalyticsIcon />}
            onClick={onApriStatistiche}
            disableElevation
            sx={{
              width: "100%",
              borderRadius: tokens.radius.pill,
              py: 1.2,
              backgroundColor: tokens.color.nearBlack,
              color: tokens.color.canvas,
              "&:hover": { backgroundColor: tokens.color.nearBlackHover },
            }}
          >
            Statistiche descrittive
          </Button>
        </Box>
      </Grid>

      <Grid item xs={12} md={8}>
        <Box
          sx={{
            p: 4,
            borderRadius: tokens.radius.xl,
            border: tokens.border.subtle,
            backgroundColor: tokens.color.canvas,
            height: "100%",
          }}
        >
          <Typography
            component="h3"
            sx={{ ...tokens.type.featureHeading, color: tokens.color.nearBlack, mb: 1 }}
          >
            Distribuzione delle probabilita&#39;
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 3 }}>
            Quanti post cadono in ciascuna fascia di probabilita&#39; assegnata da{" "}
            {modello.nome}.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {Object.entries(dati.histogram).map(([fascia, quanti]) => (
              <Box key={fascia} sx={{ display: "flex", alignItems: "center" }}>
                <EtichettaMono taglia="micro" component="span" sx={{ minWidth: 70 }}>
                  {fascia}
                </EtichettaMono>
                <Box sx={{ flexGrow: 1, mx: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(quanti / massimoIstogramma) * 100}
                    aria-label={`Fascia ${fascia}`}
                    sx={{
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: tokens.color.softStone,
                      "& .MuiLinearProgress-bar": { backgroundColor: modello.accento },
                    }}
                  />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    minWidth: 60,
                    textAlign: "right",
                    fontWeight: 600,
                    color: tokens.color.nearBlack,
                  }}
                >
                  {formatNumber(quanti)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
