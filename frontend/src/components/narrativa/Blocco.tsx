import { Paper, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import IntestazioneBlocco, { type PropsIntestazioneBlocco } from "./IntestazioneBlocco.tsx";
import { tokens } from "../../theme.ts";

interface Props extends PropsIntestazioneBlocco {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * L'unita' di contenuto dentro un atto (DESIGN.md, "Cards / Containers").
 *
 * Esisteva gia' come forma - raggio 22px, filetto da 1px, fondo canvas,
 * padding 32px - ma solo come sequenza di `sx` ricopiata: `ClassificheSeed` la
 * ricostruiva due volte nello stesso file, e l'Atto II non la usava affatto,
 * consegnando quattro artefatti di peso identico senza titolo ne' descrizione.
 * Chi leggeva incontrava uno scatter, una tabella, delle barre e una matrice
 * senza sapere a cosa rispondesse nessuno dei quattro, che e' l'inverso del
 * principio "spiegare prima di mostrare".
 *
 * L'intestazione e' opzionale nei suoi pezzi ma il titolo no: un blocco senza
 * titolo e' esattamente il difetto che questo componente esiste per rendere
 * scomodo da riprodurre. La rende `IntestazioneBlocco`, che vive a parte perche'
 * serve anche agli artefatti che non possono stare in un riquadro - il canvas
 * della cascata e' una superficie scura profonda, cioe' pari a un riquadro e non
 * un suo contenuto.
 *
 * Niente ombra e niente annidamento: un blocco dentro un blocco e' sempre
 * sbagliato, e la profondita' qui viene dal filetto e dal cambio di superficie.
 */
export default function Blocco({
  titolo,
  occhiello,
  descrizione,
  azione,
  children,
  sx,
}: Props) {
  return (
    <Paper
      elevation={0}
      component="section"
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: tokens.radius.xl,
        backgroundColor: tokens.color.canvas,
        border: tokens.border.subtle,
        ...sx,
      }}
    >
      <IntestazioneBlocco
        titolo={titolo}
        occhiello={occhiello}
        descrizione={descrizione}
        azione={azione}
      />
      {children}
    </Paper>
  );
}
