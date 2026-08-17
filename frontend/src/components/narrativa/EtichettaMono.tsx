import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { tokens } from "../../theme.ts";

interface Props {
  children: ReactNode;
  /** Tinta del testo. Default: `textMuted`, leggibile su fondo chiaro. */
  colore?: string;
  /** `micro` per le intestazioni di gruppo della sidebar, dove 14px sarebbero troppi. */
  taglia?: "normale" | "micro";
  sx?: SxProps<Theme>;
  component?: "p" | "span" | "div";
}

/**
 * Etichetta tecnica maiuscola in monospazio (DESIGN.md, Mono Label).
 *
 * E' il marcatore che dice a chi legge in che parte del sistema si trova:
 * "CAPITOLO II", "ATTO III — LA CASCATA", "QUARTILI". Era ripetuta a mano in
 * una decina di punti, ogni volta con corpo e crenatura leggermente diversi,
 * quindi lo stesso ruolo appariva in tre misure differenti nella stessa
 * schermata. Qui si dichiara una volta.
 */
export default function EtichettaMono({
  children,
  colore = tokens.color.textMuted,
  taglia = "normale",
  sx,
  component = "p",
}: Props) {
  return (
    <Box
      component={component}
      sx={{
        ...tokens.type.monoLabel,
        ...(taglia === "micro" ? { fontSize: "11px", letterSpacing: "0.5px" } : null),
        color: colore,
        m: 0,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
