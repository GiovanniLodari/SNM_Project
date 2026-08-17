import { Box, type SxProps, type Theme } from "@mui/material";
import { Typography } from "@mui/material";
import EtichettaMono from "../narrativa/EtichettaMono.tsx";
import { tokens } from "../../theme.ts";

interface Props {
  /** Che cosa si sta contando, in etichetta mono maiuscola. */
  etichetta: string;
  /** Il valore gia' formattato: la scheda non calcola e non arrotonda. */
  valore: string;
  /** Una riga che dice come va letto il numero. Senza, resta una cifra nuda. */
  nota?: string;
  /** Tinta del filetto superiore e del numero. Default: nero di marchio. */
  accento?: string;
  sx?: SxProps<Theme>;
}

/**
 * La cifra chiave di un blocco: filetto colorato, etichetta mono, numero in
 * corpo display, nota esplicativa.
 *
 * Nasce dai quattro riquadri del consenso fra rilevatori, che ogni pagina
 * successiva ha finito per ricopiare con misure leggermente diverse - 32px qui,
 * 28px la', filetto ora sopra ora assente. Averla in un componente e' cio' che
 * fa sembrare le cifre di capitoli diversi parte dello stesso sistema.
 *
 * Nessun valore di ripiego: chi la usa passa "n/d" quando il dato manca, perche'
 * uno 0 inventato sarebbe indistinguibile da uno 0 misurato.
 */
export default function SchedaCifra({
  etichetta,
  valore,
  nota,
  accento = tokens.color.nearBlack,
  sx,
}: Props) {
  return (
    <Box
      sx={{
        backgroundColor: tokens.color.softStone,
        borderRadius: tokens.radius.sm,
        p: 3,
        height: "100%",
        borderTop: `3px solid ${accento}`,
        ...sx,
      }}
    >
      <EtichettaMono taglia="micro" colore={accento}>
        {etichetta}
      </EtichettaMono>
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontSize: "32px",
          lineHeight: 1.2,
          letterSpacing: "-0.32px",
          color: accento,
          my: 1,
        }}
      >
        {valore}
      </Typography>
      {nota && (
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontSize: "13px" }}>
          {nota}
        </Typography>
      )}
    </Box>
  );
}
