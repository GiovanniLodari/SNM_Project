import { Box, Typography } from "@mui/material";
import type { Post } from "../../../api/client.ts";
import { MODELLI, probabilitaDelPost } from "../../detection/detectionContent.ts";
import { tokens } from "../../../theme.ts";
import { formatPercent, NON_DISPONIBILE } from "../../../utils/format.ts";

/** Sopra questa probabilita' il rilevatore considera il testo sintetico. */
const SOGLIA = 0.5;

interface Props {
  post: Post;
}

/**
 * I quattro rilevatori come quattro pastiglie: piena quando il modello marca il
 * post come sintetico, vuota quando lo lascia passare, tratteggiata quando non
 * lo ha valutato.
 *
 * Prima ogni riga dell'elenco portava quattro chip testuali ("FastDetectGPT:
 * 87.3%"): occupavano due righe intere, e per confrontare due post bisognava
 * leggere otto etichette. Le pastiglie si contano a colpo d'occhio, che e' la
 * domanda che ci si pone scorrendo l'archivio - "su questo sono d'accordo?" -
 * mentre la cifra esatta resta a un passaggio di mouse e nel dettaglio del post.
 *
 * Il colore e' quello di riconoscimento del modello, lo stesso del Capitolo II.
 */
export default function PastiglieRilevatori({ post }: Props) {
  const letture = MODELLI.map((modello) => {
    const probabilita = probabilitaDelPost(post, modello);
    const valutato = probabilita !== null && probabilita !== undefined;
    return {
      modello,
      valutato,
      sintetico: valutato && probabilita >= SOGLIA,
      testo: valutato ? formatPercent(probabilita * 100) : NON_DISPONIBILE,
    };
  });

  const voti = letture.filter((lettura) => lettura.sintetico).length;
  const valutati = letture.filter((lettura) => lettura.valutato).length;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {letture.map(({ modello, valutato, sintetico, testo }) => (
          <Box
            key={modello.id}
            title={`${modello.nome}: ${testo}`}
            sx={{
              width: 14,
              height: 14,
              borderRadius: tokens.radius.xs,
              backgroundColor: sintetico ? modello.accento : "transparent",
              border: `1.5px ${valutato ? "solid" : "dashed"} ${
                valutato ? modello.accento : tokens.color.borderStrong
              }`,
            }}
          />
        ))}
      </Box>
      <Typography
        sx={{
          fontFamily: tokens.font.mono,
          fontSize: "12px",
          color: valutati === 0 ? tokens.color.textFaint : tokens.color.textMuted,
        }}
      >
        {valutati === 0
          ? "non valutato"
          : `${voti}/${valutati} lo dicono sintetico`}
      </Typography>
    </Box>
  );
}
