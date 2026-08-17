import { Box, Typography } from "@mui/material";
import type { Atto } from "./tipi.ts";
import EtichettaMono from "./EtichettaMono.tsx";
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
      <EtichettaMono sx={{ mb: 1, fontSize: "12px", letterSpacing: "1px" }}>
        Atto {atto.numero} — {atto.titolo}
      </EtichettaMono>
      <Typography
        component="h2"
        sx={{
          ...tokens.type.sectionHeading,
          color: tokens.color.nearBlack,
          maxWidth: "24ch",
        }}
      >
        {atto.domanda}
      </Typography>
    </Box>
  );
}
