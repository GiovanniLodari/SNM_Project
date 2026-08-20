import { Box, Typography } from "@mui/material";
import { tokens } from "../../theme.ts";
import { DURATA_TRANSIZIONE_MS } from "./misure.ts";

interface Props {
  /** Numero romano del capitolo. Assente per i gruppi fuori dalla pipeline. */
  numero?: string;
  etichetta: string;
  espansa: boolean;
  animato: boolean;
}

/**
 * Intestazione di un capitolo nella sidebar, ridotta a una riga.
 *
 * Prima era un blocco: dodici pixel sopra, quattro sotto, uno stacco ulteriore
 * fra le sezioni. Su cinque capitoli faceva un terzo dell'altezza della
 * navigazione spesa in titoli, e i titoli non sono cliccabili - erano
 * inquadratura, e l'inquadratura non deve costare quanto il contenuto. Qui
 * restano il numero e il nome, su una riga sola, appoggiati a un filo che
 * separa i gruppi.
 *
 * A pannello chiuso resta il solo numero romano: e' l'unica parte che entra
 * nella colonna delle icone, e basta a far vedere che le voci sotto formano un
 * gruppo.
 */
export default function IntestazioneCapitoloNav({ numero, etichetta, espansa, animato }: Props) {
  const transizione = animato ? `opacity ${DURATA_TRANSIZIONE_MS}ms ease` : "none";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        pt: 0.75,
        pb: 0.25,
        mt: 0.75,
        borderTop: tokens.border.subtle,
      }}
    >
      {numero && (
        <Box
          component="span"
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: "10px",
            fontWeight: 700,
            // Il coral pieno su surfaceCoral da' 2.4:1 - a 10px e' illeggibile.
            // La variante inchiostro tiene la tinta e arriva a 4.8:1.
            color: tokens.color.coralInk,
            backgroundColor: tokens.color.surfaceCoral,
            px: "4px",
            borderRadius: tokens.radius.xs,
            lineHeight: 1.4,
          }}
        >
          {numero}
        </Box>
      )}
      <Typography
        sx={{
          fontFamily: tokens.font.mono,
          fontSize: "10px",
          fontWeight: 600,
          color: tokens.color.textMuted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          opacity: espansa ? 1 : 0,
          transition: transizione,
        }}
      >
        {etichetta}
      </Typography>
    </Box>
  );
}
