import { Box, Typography } from "@mui/material";
import EtichettaMono from "./EtichettaMono.tsx";
import { tokens } from "../../theme.ts";

interface Props {
  /** Numero romano del capitolo. Assente per Panoramica e Strumenti. */
  numero?: string;
  /** Nome del capitolo nella navigazione, es. "Il testo sintetico". */
  capitolo: string;
  /** Titolo della pagina: dice cosa si sta guardando, non come si chiama la sezione. */
  titolo: string;
  /** Paragrafo che inquadra il capitolo. Una frase o due, non un abstract. */
  guida?: string;
}

/**
 * Apertura di un capitolo: la stessa in tutte le pagine.
 *
 * Prima ogni pagina apriva a modo suo - chi con un `h2` da 48px, chi con un
 * `h3` da 38px, chi senza occhiello - e passando dall'una all'altra sembrava di
 * cambiare applicazione. L'occhiello ripete il capitolo esattamente come lo
 * scrive la sidebar, cosi' la navigazione e la pagina si confermano a vicenda.
 */
export default function IntestazioneCapitolo({ numero, capitolo, titolo, guida }: Props) {
  return (
    <Box component="header" sx={{ mb: { xs: 5, md: 8 } }}>
      <EtichettaMono sx={{ mb: 2 }}>
        {numero ? `Capitolo ${numero} · ${capitolo}` : capitolo}
      </EtichettaMono>

      <Typography
        component="h1"
        sx={{ ...tokens.type.productDisplay, color: tokens.color.nearBlack, maxWidth: "18ch" }}
      >
        {titolo}
      </Typography>

      {guida && (
        <Typography
          sx={{
            ...tokens.type.bodyLarge,
            color: tokens.color.textMuted,
            maxWidth: "68ch",
            lineHeight: 1.6,
            mt: 3,
          }}
        >
          {guida}
        </Typography>
      )}
    </Box>
  );
}
