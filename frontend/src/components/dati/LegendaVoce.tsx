import { Box, Typography } from "@mui/material";
import { tokens } from "../../theme.ts";

interface Props {
  /** La tinta del segmento a cui questa voce corrisponde. */
  colore: string;
  /** La cifra, gia' formattata. */
  titolo: string;
  /** Che cosa quella cifra rappresenta. */
  testo: string;
}

/**
 * Voce di legenda di una barra: pastiglia colorata, cifra, spiegazione.
 *
 * Una barra a segmenti senza legenda costringe a passare il mouse sopra per
 * sapere cosa sia il colore - e su un touch screen non c'e' nemmeno quello.
 */
export default function LegendaVoce({ colore, titolo, testo }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: colore,
          mt: 0.6,
          flexShrink: 0,
        }}
      />
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: "15px", color: tokens.color.nearBlack }}>
          {titolo}
        </Typography>
        <Typography sx={{ ...tokens.type.micro, color: tokens.color.textMuted }}>
          {testo}
        </Typography>
      </Box>
    </Box>
  );
}
