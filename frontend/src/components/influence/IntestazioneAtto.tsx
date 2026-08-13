import { Box, Typography } from "@mui/material";
import type { Atto } from "./influenceContent.ts";
import { tokens } from "../../theme.ts";

interface Props {
  atto: Atto;
}

/**
 * Apertura di un atto: numero romano, titolo e la domanda a cui l'atto
 * risponde.
 *
 * La domanda viene prima dei dati, e in corpo grande, perche' e' quella a
 * dare un senso ai grafici che seguono: chi legge sa cosa sta cercando prima
 * di trovarselo davanti. E' anche il punto in cui l'indice laterale atterra
 * quando si clicca una voce, quindi deve identificare la sezione da solo.
 */
export default function IntestazioneAtto({ atto }: Props) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        component="p"
        sx={{
          fontFamily: tokens.font.mono,
          fontSize: "12px",
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: tokens.color.textMuted,
          mb: 1,
        }}
      >
        Atto {atto.numero} — {atto.titolo}
      </Typography>
      <Typography
        component="h2"
        sx={{
          fontFamily: tokens.font.display,
          fontWeight: 400,
          fontSize: { xs: "26px", md: "34px" },
          lineHeight: 1.2,
          letterSpacing: "-0.6px",
          color: tokens.color.nearBlack,
          maxWidth: "24ch",
        }}
      >
        {atto.domanda}
      </Typography>
    </Box>
  );
}
