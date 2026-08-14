import { Box, Grid, Typography } from "@mui/material";
import type { ReactNode } from "react";
import EtichettaMono from "./EtichettaMono.tsx";
import { tokens } from "../../theme.ts";

export interface CifraBanda {
  /** Il numero gia' formattato: la banda non calcola e non arrotonda. */
  valore: string;
  etichetta: string;
}

interface Props {
  /** Etichetta mono sopra il titolo, es. "IL RISULTATO". */
  occhiello?: string;
  titolo: string;
  /** Paragrafo che spiega cosa significano le cifre. */
  testo?: string;
  /** Da due a quattro cifre chiave. Oltre, la banda smette di avere un fuoco. */
  cifre?: readonly CifraBanda[];
  /** `verde` per i capitoli sul testo sintetico e sulla propagazione, `navy` per la verifica. */
  tinta?: "verde" | "navy";
  /**
   * `piena` esce dai margini del contenuto e arriva a filo dei bordi: e' la
   * forma di DESIGN.md, valida per le pagine a colonna unica. `colonna` resta
   * dentro la propria colonna con gli angoli arrotondati, e serve nei capitoli
   * con l'indice laterale, dove una banda a piena larghezza scavalcherebbe
   * l'indice e lo coprirebbe.
   */
  larghezza?: "piena" | "colonna";
  children?: ReactNode;
}

/**
 * Banda scura a piena larghezza (DESIGN.md, `dark-feature-band`).
 *
 * E' la punteggiatura visiva del progetto: su un canvas bianco continuo, che e'
 * la superficie predefinita del sistema, non esisteva alcun segnale di "qui
 * finisce una parte e ne comincia un'altra", e ogni capitolo scorreva come un
 * unico blocco indistinto. La banda interrompe il bianco una volta per
 * capitolo, e porta il risultato che quel capitolo ha prodotto.
 *
 * I margini negativi annullano il padding del `Container` di App.tsx per
 * arrivare a filo dei bordi dell'area contenuto: i due valori vengono dallo
 * stesso token (`tokens.paddingContenuto`), quindi non possono divergere.
 * Non si usa `100vw`, che ignorerebbe la sidebar e sborderebbe a destra.
 */
export default function BandaScura({
  occhiello,
  titolo,
  testo,
  cifre,
  tinta = "verde",
  larghezza = "piena",
  children,
}: Props) {
  const fondo = tinta === "verde" ? tokens.color.deepGreen : tokens.color.darkNavy;

  const bleed =
    larghezza === "piena"
      ? {
          mx: {
            xs: -tokens.paddingContenuto.xs,
            sm: -tokens.paddingContenuto.sm,
            md: -tokens.paddingContenuto.md,
          },
          px: tokens.paddingContenuto,
        }
      : {
          px: { xs: 3, md: 6 },
          borderRadius: tokens.radius.xl,
        };

  return (
    <Box
      sx={{
        backgroundColor: fondo,
        color: tokens.color.canvas,
        ...bleed,
        py: { xs: 6, md: 10 },
        my: { xs: 6, md: 10 },
      }}
    >
      {occhiello && (
        <EtichettaMono colore="rgba(255,255,255,0.6)" sx={{ mb: 2 }}>
          {occhiello}
        </EtichettaMono>
      )}

      <Typography
        component="h2"
        sx={{ ...tokens.type.sectionDisplay, color: tokens.color.canvas, maxWidth: "20ch" }}
      >
        {titolo}
      </Typography>

      {testo && (
        <Typography
          sx={{
            ...tokens.type.bodyLarge,
            color: "rgba(255,255,255,0.72)",
            maxWidth: "62ch",
            mt: 3,
          }}
        >
          {testo}
        </Typography>
      )}

      {cifre && cifre.length > 0 && (
        <Grid container spacing={4} sx={{ mt: { xs: 4, md: 6 } }}>
          {cifre.map((cifra) => (
            <Grid item xs={6} md={12 / Math.min(cifre.length, 4)} key={cifra.etichetta}>
              {/* Filetto chiaro al posto di una card: DESIGN.md tiene le bande
                  scure prive di riquadri, la separazione la fa la regola. */}
              <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.24)", pt: 2 }}>
                <Typography sx={{ ...tokens.type.numeroGrande, color: tokens.color.canvas }}>
                  {cifra.valore}
                </Typography>
                <Typography
                  sx={{
                    ...tokens.type.micro,
                    color: "rgba(255,255,255,0.6)",
                    mt: 1,
                  }}
                >
                  {cifra.etichetta}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {children}
    </Box>
  );
}
