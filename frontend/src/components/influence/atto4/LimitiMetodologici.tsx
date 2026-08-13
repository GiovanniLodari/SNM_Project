import { Box, Typography } from "@mui/material";
import { LIMITI } from "../influenceContent.ts";
import { tokens } from "../../../theme.ts";

/**
 * Atto IV: cosa questi numeri non dimostrano.
 *
 * I testi vengono interamente da `LIMITI` in influenceContent.ts, non da
 * parole scelte qui: ogni affermazione e' gia' stata verificata contro i dati
 * quando il contenuto e' stato scritto, e riformularla qui rischierebbe di
 * introdurre un'imprecisione che il resto della pagina non ha.
 *
 * Superficie `tokens.color.canvas`, non un box secondario: questi limiti
 * fanno parte del ragionamento della tesi tanto quanto i risultati degli
 * atti precedenti, non sono un disclaimer da minimizzare in un angolo.
 */
export default function LimitiMetodologici() {
  return (
    <Box
      sx={{
        backgroundColor: tokens.color.canvas,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {LIMITI.map((limite, indice) => (
        <Box
          key={limite.titolo}
          sx={{
            py: 3,
            borderBottom: indice < LIMITI.length - 1 ? tokens.border.subtle : "none",
          }}
        >
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontWeight: 600,
              fontSize: "18px",
              color: tokens.color.nearBlack,
              mb: 1,
            }}
          >
            {limite.titolo}
          </Typography>
          <Typography
            sx={{
              color: tokens.color.textPrimary,
              lineHeight: 1.6,
              maxWidth: "70ch",
            }}
          >
            {limite.testo}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
