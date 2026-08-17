import { Box, Grid } from "@mui/material";
import type { ReactNode } from "react";
import IndiceAtti from "./IndiceAtti.tsx";
import IntestazioneAtto from "./IntestazioneAtto.tsx";
import IntestazioneCapitolo from "./IntestazioneCapitolo.tsx";
import { OFFSET_INDICE_PX, type Atto } from "./tipi.ts";

interface PropsSezione {
  atto: Atto;
  children: ReactNode;
}

/**
 * Sezione di un atto: l'ancora per l'indice, l'intestazione e i contenuti.
 *
 * Senza `scrollMarginTop`, saltando da un'ancora il titolo finirebbe a filo del
 * bordo superiore della finestra, sotto l'indice sticky. L'offset e' lo stesso
 * valore che posiziona l'indice, quindi voce e sezione si allineano.
 */
export function Sezione({ atto, children }: PropsSezione) {
  return (
    <Box
      component="section"
      id={atto.id}
      sx={{ mb: 12, scrollMarginTop: `${OFFSET_INDICE_PX}px` }}
    >
      <IntestazioneAtto atto={atto} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</Box>
    </Box>
  );
}

interface Props {
  numero?: string;
  capitolo: string;
  titolo: string;
  guida?: string;
  atti: readonly Atto[];
  /** Id dell'atto in vista, da `useAttoInVista`. */
  attoAttivo: string;
  /** Le `<Sezione>` del capitolo. */
  children: ReactNode;
}

/**
 * Guscio di un capitolo narrativo: indice laterale sticky a sinistra,
 * intestazione e atti a destra.
 *
 * Nasce dalla pagina Influence Maximization, dove questa struttura era scritta
 * a mano; averla in un componente e' cio' che permette a un capitolo nuovo di
 * essere coerente col resto senza ricopiarne il layout - e ai capitoli
 * esistenti di non divergere quando uno dei due viene toccato.
 */
export default function PaginaCapitolo({
  numero,
  capitolo,
  titolo,
  guida,
  atti,
  attoAttivo,
  children,
}: Props) {
  return (
    <Box sx={{ pb: 8 }}>
      <Grid container spacing={4}>
        {/* La colonna sparisce sotto md insieme all'indice che contiene:
            lasciarla vuota aggiungerebbe solo un salto di spaziatura. */}
        <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
          <IndiceAtti atti={atti} attivo={attoAttivo} />
        </Grid>

        <Grid item xs={12} md={9} sx={{ minWidth: 0 }}>
          <IntestazioneCapitolo
            numero={numero}
            capitolo={capitolo}
            titolo={titolo}
            guida={guida}
          />
          {children}
        </Grid>
      </Grid>
    </Box>
  );
}
